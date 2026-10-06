import React, { useState, useEffect, useMemo } from 'react';
import { db, doc, onSnapshot, updateDoc, getDoc, setDoc, addDoc, collection, query, where } from '../firebase';
import { User, WithdrawalRequest } from '../types';

interface WalletViewProps {
  currentUser: User;
  onNavigate: (view: string) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ currentUser, onNavigate }) => {
  // Real-time Firestore state
  const [liveUser, setLiveUser] = useState<User>(currentUser);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [ctAccountBalance, setCtAccountBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Active section inside WalletView: 'deposit' | 'withdraw' | 'history'
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  
  // Deposit form state
  const [depositAmount, setDepositAmount] = useState<string>('2500');
  const [isDepositing, setIsDepositing] = useState(false);

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>(currentUser.username || '');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // In-app OTP Modal for withdrawal authorization
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');

  // In-app toast notification (iframe-safe)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  // 1. Subscribe to User document in Firestore for live Virtual Currency balance
  useEffect(() => {
    if (!currentUser?.id) return;
    const userDocRef = doc(db, 'users', currentUser.id);
    const unsubscribeUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLiveUser({ ...currentUser, ...data, id: snap.id } as User);
      }
      setIsLoading(false);
    }, (err) => {
      console.error('Error fetching user wallet from Firestore:', err);
      setIsLoading(false);
    });

    return () => unsubscribeUser();
  }, [currentUser?.id]);

  // 2. Subscribe to CT Account balance in Firestore
  useEffect(() => {
    const ctRef = doc(db, 'settings', 'company_wallet');
    const unsubscribeCT = onSnapshot(ctRef, (snap) => {
      if (snap.exists()) {
        setCtAccountBalance(snap.data().balance || 0);
      }
    }, (err) => console.error('CT balance listener error:', err));

    return () => unsubscribeCT();
  }, []);

  // 3. Subscribe to User's Transactions in Firestore
  useEffect(() => {
    if (!currentUser?.id) return;
    const txQuery = query(collection(db, 'transactions'), where('userId', '==', currentUser.id));
    const unsubscribeTx = onSnapshot(txQuery, (snap) => {
      const txs: any[] = [];
      snap.forEach(d => txs.push({ id: d.id, ...d.data() }));
      txs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setTransactions(txs);
    }, (err) => console.error('Transactions query error:', err));

    return () => unsubscribeTx();
  }, [currentUser?.id]);

  // 4. Subscribe to User's Withdrawals in Firestore
  useEffect(() => {
    if (!currentUser?.id) return;
    const wQuery = query(collection(db, 'withdrawals'), where('userId', '==', currentUser.id));
    const unsubscribeW = onSnapshot(wQuery, (snap) => {
      const wList: WithdrawalRequest[] = [];
      snap.forEach(d => wList.push({ id: d.id, ...d.data() } as WithdrawalRequest));
      wList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setWithdrawals(wList);
    }, (err) => console.error('Withdrawals query error:', err));

    return () => unsubscribeW();
  }, [currentUser?.id]);

  // Derived financial stats
  const virtualBalance = liveUser.deposits || 0;

  const totalDeposited = useMemo(() => {
    return transactions
      .filter(tx => tx.type && (tx.type.includes('deposit') || tx.channel === 'ct_account'))
      .reduce((acc, tx) => acc + (tx.amount || 0), 0);
  }, [transactions]);

  const totalSpentPlatform = useMemo(() => {
    return transactions
      .filter(tx => tx.channel === 'ct_collection' || (tx.type && (tx.type.includes('service') || tx.type.includes('campaign') || tx.type.includes('fee'))))
      .reduce((acc, tx) => acc + (tx.amount || 0), 0);
  }, [transactions]);

  const totalWithdrawn = useMemo(() => {
    return withdrawals
      .filter(w => w.status === 'approved')
      .reduce((acc, w) => acc + (w.amount || 0), 0);
  }, [withdrawals]);

  const pendingWithdrawalTotal = useMemo(() => {
    return withdrawals
      .filter(w => w.status === 'pending')
      .reduce((acc, w) => acc + (w.amount || 0), 0);
  }, [withdrawals]);

  // ----------------------------------------------------
  // DEPOSIT HANDLER (Linked to CT Account)
  // ----------------------------------------------------
  const handleInitiateDeposit = async () => {
    const val = parseInt(depositAmount, 10);
    if (isNaN(val) || val < 10) {
      showToast('error', 'Please enter a valid deposit amount (minimum ₹10).');
      return;
    }

    setIsDepositing(true);
    try {
      // 1. Fetch Razorpay key
      const configRes = await fetch('/api/razorpay/config');
      const { keyId } = await configRes.json();
      if (!keyId) throw new Error('Razorpay payment gateway not configured.');

      // 2. Create Order on backend
      const autobidOrderId = 'DEP-' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('');
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val, autobidOrderId })
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || 'Failed to create payment order');

      // 3. Launch Razorpay Checkout Modal
      const options = {
        key: keyId,
        amount: orderData.order.amount,
        currency: 'INR',
        name: 'AutoBid AI Auctions',
        description: `Wallet Deposit (Order: ${autobidOrderId})`,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=150',
        order_id: orderData.order.id,
        prefill: {
          name: currentUser.username || '',
          email: currentUser.email || `${currentUser.username}@autobid.com`,
          contact: ''
        },
        theme: { color: '#059669' }, // Emerald theme for CT inflow
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // A. Update User Virtual Currency in Firestore
              const newBalance = virtualBalance + val;
              await updateDoc(doc(db, 'users', currentUser.id), {
                deposits: newBalance
              });

              // B. Credit CT Account (Company Collection & Transit Account)
              const compRef = doc(db, 'settings', 'company_wallet');
              const compSnap = await getDoc(compRef);
              const currentCompBal = compSnap.exists() ? (compSnap.data().balance || 0) : 0;
              await setDoc(compRef, { balance: currentCompBal + val }, { merge: true });

              // C. Log Transaction with CT Account channel tag
              await addDoc(collection(db, 'transactions'), {
                userId: currentUser.id,
                username: currentUser.username,
                type: 'deposit_razorpay',
                channel: 'ct_account',
                amount: val,
                autobidOrderId,
                description: `Deposit via Razorpay ➔ Routed to CT Account (Minted ₹${val} Virtual Currency)`,
                timestamp: Date.now(),
                status: 'success',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                balanceAfter: newBalance
              });

              showToast('success', `🎉 Payment of ₹${val.toLocaleString()} verified! Money deposited to CT Account and ₹${val.toLocaleString()} Virtual Currency credited to your wallet.`);
              setDepositAmount('');
            } else {
              showToast('error', `Payment verification failed: ${verifyData.error || 'Please contact support.'}`);
            }
          } catch (err: any) {
            console.error('Error finalizing deposit:', err);
            showToast('error', `Error updating wallet: ${err.message}`);
          }
        },
        modal: {
          ondismiss: () => {
            setIsDepositing(false);
          }
        }
      };

      if (!(window as any).Razorpay) {
        throw new Error('Razorpay gateway SDK not loaded. Please refresh the page.');
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        showToast('error', `Payment failed: ${resp.error?.description || 'Transaction cancelled'}`);
        setIsDepositing(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Deposit error:', err);
      showToast('error', `Deposit error: ${err.message}`);
    } finally {
      setIsDepositing(false);
    }
  };

  // ----------------------------------------------------
  // WITHDRAWAL HANDLER (Linked to CB Account)
  // ----------------------------------------------------
  const handleInitiateWithdrawal = () => {
    const val = parseInt(withdrawAmount, 10);
    if (isNaN(val) || val < 50) {
      showToast('error', 'Minimum withdrawal amount is ₹50.');
      return;
    }
    if (val > virtualBalance) {
      showToast('error', `Insufficient virtual currency. Your available balance is ₹${virtualBalance.toLocaleString()}.`);
      return;
    }
    if (val > 1000000) {
      showToast('error', 'Maximum withdrawal per request is ₹10,00,000.');
      return;
    }

    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        showToast('error', 'Please enter a valid UPI VPA (e.g. user@okhdfcbank).');
        return;
      }
    } else {
      if (!accountHolderName.trim() || !accountNumber.trim() || !ifsc.trim()) {
        showToast('error', 'Please fill in all bank details (Name, Account Number, IFSC).');
        return;
      }
      if (accountNumber.trim() !== confirmAccountNumber.trim()) {
        showToast('error', 'Account numbers do not match. Please verify.');
        return;
      }
    }

    // Generate 6-digit OTP for in-app verification modal
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setEnteredOtp('');
    setOtpError('');
    setShowOtpModal(true);
  };

  const handleConfirmWithdrawal = async () => {
    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setOtpError('Invalid authorization code. Please enter the 6-digit code shown below.');
      return;
    }

    const val = parseInt(withdrawAmount, 10);
    setIsWithdrawing(true);
    setShowOtpModal(false);

    try {
      const withdrawalOrderId = 'WDL-' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('');

      // 1. Create withdrawal request in Firestore (Linked to CB Account Disbursement)
      await addDoc(collection(db, 'withdrawals'), {
        userId: currentUser.id,
        username: currentUser.username,
        userRole: currentUser.role || 'user',
        amount: val,
        status: 'pending',
        payoutMethod,
        withdrawalOrderId,
        upiId: payoutMethod === 'upi' ? upiId.trim() : '',
        accountHolderName: payoutMethod === 'bank' ? accountHolderName.trim() : '',
        accountNumber: payoutMethod === 'bank' ? accountNumber.trim() : '',
        ifsc: payoutMethod === 'bank' ? ifsc.trim().toUpperCase() : '',
        disbursedFrom: 'CB Account',
        createdAt: Date.now()
      });

      // 2. Deduct Virtual Currency from user wallet (held in escrow)
      const newBalance = virtualBalance - val;
      await updateDoc(doc(db, 'users', currentUser.id), {
        deposits: newBalance
      });

      // 3. Log Transaction with CB Account channel tag
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.id,
        username: currentUser.username,
        type: 'withdrawal_payout',
        channel: 'cb_account',
        amount: val,
        withdrawalOrderId,
        description: `Withdrawal Request (${payoutMethod.toUpperCase()}) ➔ Pending Finance Review for CB Account Payout (Order: ${withdrawalOrderId})`,
        timestamp: Date.now(),
        status: 'pending',
        balanceAfter: newBalance
      });

      showToast('success', `✅ Withdrawal of ₹${val.toLocaleString()} queued! Request submitted for Finance Group review. Disbursed from CB Account via Razorpay upon approval.`);
      setWithdrawAmount('');
      setUpiId('');
      setAccountNumber('');
      setConfirmAccountNumber('');
      setIfsc('');
      setActiveTab('history');
    } catch (err: any) {
      console.error('Withdrawal submission error:', err);
      showToast('error', `Failed to submit withdrawal: ${err.message}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-28 animate-fadeIn space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-xl border transition-all animate-fadeIn ${
          toast.type === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' :
          toast.type === 'error' ? 'bg-red-900 text-red-100 border-red-700' :
          'bg-gray-900 text-gray-100 border-gray-700'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs text-gray-300 hover:text-white px-2 py-1 rounded">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Navigation / Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-xs transition-colors"
            title="Back to Home"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>🪙</span>
              <span>Virtual Currency Wallet</span>
            </h1>
            <p className="text-xs text-gray-500">
              Live Firestore Sync • Powered by AutoBid Dual-Account Financial Pipeline
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <span>⚙️</span>
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* Hero Virtual Currency Balance Card */}
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                1:1 INR Backed • CT Escrow Active
              </span>
              <span className="text-[11px] text-gray-400 font-mono">@{liveUser.username}</span>
            </div>

            <div className="pt-1">
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider block">Available Virtual Currency</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  ₹{virtualBalance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-800">
                  Live Balance
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-300 max-w-lg leading-relaxed pt-1">
              Use your virtual currency for instant live auction bids, vehicle inspection fees, direct purchases, and seller commissions with zero payment gateway latency.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'deposit'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <span>➕</span>
              <span>Deposit (CT Account)</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'withdraw'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/25 ring-2 ring-purple-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <span>🏦</span>
              <span>Withdraw (CB Account)</span>
            </button>
          </div>
        </div>

        {/* Financial Flow Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-gray-800/80">
          <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Deposited</span>
            <span className="text-lg font-black text-white mt-0.5 block">₹{totalDeposited.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">Via CT Account</span>
          </div>

          <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800">
            <span className="text-[10px] uppercase font-bold text-blue-400 block">Platform Usage</span>
            <span className="text-lg font-black text-white mt-0.5 block">₹{totalSpentPlatform.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">Via CT Collection</span>
          </div>

          <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800">
            <span className="text-[10px] uppercase font-bold text-purple-400 block">Total Withdrawn</span>
            <span className="text-lg font-black text-white mt-0.5 block">₹{totalWithdrawn.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">Via CB Account</span>
          </div>

          <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Pending Payouts</span>
            <span className="text-lg font-black text-white mt-0.5 block">₹{pendingWithdrawalTotal.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">{withdrawals.filter(w => w.status === 'pending').length} In Review</span>
          </div>
        </div>
      </div>

      {/* Financial Pipeline Visualizer Banner */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-lg font-bold">
            🔄
          </span>
          <div>
            <h3 className="text-xs font-black uppercase text-gray-900">Dual-Account Financial Routing</h3>
            <p className="text-[11px] text-gray-500">
              Deposits flow into <strong>CT Account</strong> ➔ Spend routes to <strong>CT Collection</strong> ➔ Withdrawals disburse from <strong>CB Account</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            Inflow: CT Account
          </span>
          <span className="text-gray-400">➔</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
            Usage: CT Collection
          </span>
          <span className="text-gray-400">➔</span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
            Payout: CB Account
          </span>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'deposit'
              ? 'bg-white text-emerald-700 shadow-md ring-1 ring-emerald-200'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>🟢</span>
          <span>1. Deposit Funds (CT Account)</span>
        </button>

        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'withdraw'
              ? 'bg-white text-purple-700 shadow-md ring-1 ring-purple-200'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>🟣</span>
          <span>2. Request Withdrawal (CB Account)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>📜</span>
          <span>3. History & Requests ({transactions.length + withdrawals.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: DEPOSIT FUNDS (LINKED TO CT ACCOUNT)                           */}
      {/* ========================================================================= */}
      {activeTab === 'deposit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                  CT
                </span>
                <h2 className="text-lg font-black text-gray-900">Add Funds (Inflow via CT Account)</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Money deposited here is credited directly into the platform's <strong>CT (Current / Collection Transit) Account</strong>.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Gateway: Razorpay UPI & NetBanking</span>
            </div>
          </div>

          {/* Educational Escrow Explainer */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <strong className="block font-black text-emerald-950 mb-0.5">How your deposit works:</strong>
              When you complete this payment, real INR arrives in our <strong>CT Account</strong>. We immediately mint equivalent <strong>Virtual Currency (₹)</strong> into your wallet so you can participate in live auctions and buy services without payment delays.
            </div>
          </div>

          {/* Quick Amount Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
              Quick Select Deposit Amount
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {['500', '1000', '2500', '5000', '10000', '25000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDepositAmount(preset)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                    depositAmount === preset
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  ₹{parseInt(preset).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Deposit Amount Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
              Enter Custom Deposit Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 font-bold text-lg">₹</span>
              <input
                type="number"
                min="10"
                step="100"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full pl-9 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-lg font-black text-gray-900 placeholder:text-gray-300 transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Minimum deposit: ₹10 • Supports UPI, Google Pay, PhonePe, Paytm, Debit/Credit Cards & NetBanking.
            </p>
          </div>

          {/* Deposit Summary & Submit */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-gray-400 block font-bold">You will receive:</span>
              <span className="text-xl font-black text-emerald-600">
                ₹{depositAmount ? parseInt(depositAmount || '0').toLocaleString() : '0'} Virtual Currency
              </span>
            </div>

            <button
              disabled={isDepositing || !depositAmount}
              onClick={handleInitiateDeposit}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-xl shadow-emerald-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDepositing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Connecting Gateway...</span>
                </>
              ) : (
                <>
                  <span>🔒</span>
                  <span>Pay with Razorpay (Deposit to CT Account)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: WITHDRAW FUNDS (LINKED TO CB ACCOUNT)                          */}
      {/* ========================================================================= */}
      {activeTab === 'withdraw' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-sm">
                  CB
                </span>
                <h2 className="text-lg font-black text-gray-900">Request Withdrawal (Disbursement via CB Account)</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Approved requests are disbursed from our <strong>CB (Commercial Bank) Account</strong> directly to your bank account or UPI.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <span>Available to Withdraw:</span>
              <span className="font-black text-purple-900">₹{virtualBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Educational CB Disbursement Explainer */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
            <span className="text-xl">🏦</span>
            <div>
              <strong className="block font-black text-purple-950 mb-0.5">How your withdrawal is fulfilled:</strong>
              When you submit a request, your virtual currency is temporarily held in escrow. AutoBid's Finance Team / Admin reviews the request in the <strong>Withdrawals Section</strong>. Upon approval, an automated signal is dispatched to Razorpay to pay out from our dedicated <strong>CB Account</strong> to your destination.
            </div>
          </div>

          {/* Withdrawal Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Withdrawal Amount (Virtual Currency ₹)
              </label>
              <button
                type="button"
                onClick={() => setWithdrawAmount(virtualBalance.toString())}
                className="text-xs font-bold text-purple-600 hover:text-purple-700"
              >
                Withdraw Max (₹{virtualBalance.toLocaleString()})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 font-bold text-lg">₹</span>
              <input
                type="number"
                min="50"
                max={virtualBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full pl-9 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-purple-600 focus:outline-none text-lg font-black text-gray-900 placeholder:text-gray-300 transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Minimum withdrawal: ₹50 • Maximum per request: ₹10,00,000.
            </p>
          </div>

          {/* Payout Destination Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
              Select Payout Method (CB Account Disbursement)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayoutMethod('upi')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  payoutMethod === 'upi'
                    ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className="text-sm font-black text-gray-900">Instant UPI VPA</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">GPay, PhonePe, Paytm, BHIM</p>
              </button>

              <button
                type="button"
                onClick={() => setPayoutMethod('bank')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  payoutMethod === 'bank'
                    ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <span className="text-sm font-black text-gray-900">Direct Bank Transfer</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">IMPS / NEFT directly to Account</p>
              </button>
            </div>
          </div>

          {/* Method Fields */}
          {payoutMethod === 'upi' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                UPI ID (Virtual Payment Address)
              </label>
              <input
                type="text"
                placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Account Holder Name</label>
                <input
                  type="text"
                  placeholder="Full name as in bank records"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bank IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0000123"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Account Number</label>
                <input
                  type="password"
                  placeholder="Enter bank account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Confirm Account Number</label>
                <input
                  type="text"
                  placeholder="Re-enter bank account number"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Submit Withdrawal */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-gray-400 block font-bold">Payout Destination:</span>
              <span className="text-sm font-black text-gray-900">
                {payoutMethod === 'upi' ? (upiId || 'Enter UPI ID above') : (accountHolderName || 'Bank Account')}
              </span>
            </div>

            <button
              disabled={isWithdrawing || !withdrawAmount || parseInt(withdrawAmount) <= 0}
              onClick={handleInitiateWithdrawal}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-purple-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>🔒</span>
              <span>Submit Withdrawal for CB Account Payout</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TRANSACTION & WITHDRAWAL REQUEST HISTORY                       */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Active Withdrawal Requests Section */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Your Withdrawal Requests (CB Account Pipeline)</h3>
                <p className="text-xs text-gray-500">Track payouts submitted to Finance Group for disbursement.</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl">
                {withdrawals.length} Requests
              </span>
            </div>

            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    w.status === 'pending'
                      ? 'bg-amber-50/50 border-amber-200'
                      : w.status === 'approved'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-red-50/50 border-red-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        w.status === 'pending' ? 'bg-amber-200 text-amber-900' :
                        w.status === 'approved' ? 'bg-emerald-200 text-emerald-900' :
                        'bg-red-200 text-red-900'
                      }`}>
                        {w.status === 'pending' ? 'Pending Finance Approval' :
                         w.status === 'approved' ? 'Disbursed via CB Account' : 'Rejected'}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(w.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      Destination: <strong className="text-gray-900 uppercase">{w.payoutMethod || 'UPI'}</strong>
                      {w.upiId && <span className="ml-2 font-mono text-purple-700">({w.upiId})</span>}
                      {w.accountNumber && (
                        <span className="ml-2 font-mono text-gray-700">
                          (Acc: {w.accountNumber} | IFSC: {w.ifsc})
                        </span>
                      )}
                    </div>

                    {w.withdrawalOrderId && (
                      <div className="text-[10px] text-gray-400 font-mono">
                        Order Reference: {w.withdrawalOrderId}
                      </div>
                    )}
                    {w.transactionId && (
                      <div className="text-[10px] text-emerald-700 font-mono font-bold">
                        Razorpay Payout ID: {w.transactionId}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase font-bold">Amount</div>
                    <div className="text-xl font-black text-gray-900">₹{w.amount?.toLocaleString()}</div>
                  </div>
                </div>
              ))}

              {withdrawals.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">
                  You have not submitted any withdrawal requests yet.
                </div>
              )}
            </div>
          </div>

          {/* Full Transaction History Table */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Virtual Currency Transaction Ledger</h3>
                <p className="text-xs text-gray-500">Real-time log of deposits, auction spends, and payouts.</p>
              </div>
              <span className="text-xs font-bold text-gray-500">
                {transactions.length} Transactions
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] uppercase font-black text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => {
                    const isCredit = tx.type?.includes('deposit') || tx.type === 'admin_add' || tx.type === 'withdrawal_refund';
                    const isSpend = tx.channel === 'ct_collection' || tx.type?.includes('service') || tx.type?.includes('campaign') || tx.type?.includes('fee');

                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400 font-mono">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.channel === 'ct_account' || isCredit ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              CT Account
                            </span>
                          ) : tx.channel === 'ct_collection' || isSpend ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                              CT Collection
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              CB Account
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 uppercase tracking-wider font-mono text-[10px] text-gray-500">
                          {tx.type}
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <div className="truncate font-medium text-gray-900">{tx.description}</div>
                          {(tx.autobidOrderId || tx.withdrawalOrderId || tx.paymentId) && (
                            <div className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
                              Ref: {tx.autobidOrderId || tx.withdrawalOrderId || tx.paymentId}
                            </div>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-black text-sm whitespace-nowrap ${
                          isCredit ? 'text-emerald-600' : 'text-gray-900'
                        }`}>
                          {isCredit ? `+₹${tx.amount?.toLocaleString()}` : `-₹${tx.amount?.toLocaleString()}`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            tx.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                            tx.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        No transactions found in your wallet history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP OTP AUTHORIZATION MODAL FOR WITHDRAWALS                             */}
      {/* ========================================================================= */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-200 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                🔐
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900">Authorize Withdrawal</h3>
                <p className="text-xs text-gray-500">Security verification for payout via CB Account.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-black text-purple-700 text-sm">₹{parseInt(withdrawAmount || '0').toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payout Destination:</span>
                <span className="font-mono text-gray-900">{payoutMethod === 'upi' ? upiId : accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Disbursing Account:</span>
                <span className="font-bold text-gray-800">AutoBid CB Account (Razorpay)</span>
              </div>
            </div>

            {/* In-app OTP Display Card */}
            <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 text-center space-y-1">
              <span className="text-[11px] uppercase font-bold text-purple-700 tracking-wider">
                Authorization Code Dispatched:
              </span>
              <div className="text-3xl font-black font-mono tracking-widest text-purple-950">
                {generatedOtp}
              </div>
              <p className="text-[10px] text-purple-600">
                Enter this 6-digit code below to confirm your payout request.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Enter 6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => {
                  setEnteredOtp(e.target.value);
                  setOtpError('');
                }}
                placeholder="Enter 6-digit code"
                className="w-full text-center text-xl font-mono font-black py-3 rounded-xl border-2 border-gray-200 focus:border-purple-600 focus:outline-none tracking-widest"
              />
              {otpError && (
                <p className="text-xs text-red-600 font-medium">{otpError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWithdrawing || enteredOtp.length !== 6}
                onClick={handleConfirmWithdrawal}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md transition-all disabled:opacity-50"
              >
                {isWithdrawing ? 'Submitting...' : 'Confirm & Authorize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
