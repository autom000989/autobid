import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, getDocs, setDoc, deleteDoc, addDoc, getDoc } from '../firebase';
import { User, Vehicle, VehicleStatus, WithdrawalRequest, VerificationRequest } from '../types';
import type { UserRole } from '../types';
import { AdminAuditLogs } from './admin/AdminAuditLogs';
import { AdminContentCMS } from './admin/AdminContentCMS';
import { AdminNotifications } from './admin/AdminNotifications';
import { AdminReports } from './admin/AdminReports';
import { AdminAppConfig } from './admin/AdminAppConfig';
import { AdminCoupons } from './admin/AdminCoupons';
import { AdminVendors } from './admin/AdminVendors';
import { AdminModeration } from './admin/AdminModeration';
import { AdminSessions } from './admin/AdminSessions';
import { AdminVersionControl } from './admin/AdminVersionControl';
import { AdminFinancialManagement } from './admin/AdminFinancialManagement';
import { logAdminAction } from './admin/adminAuditHelper';

interface AdminPanelProps {
  currentUser: User;
  onNavigate: (view: string) => void;
}

export type AdminTab =
  | 'dashboard'
  | 'financial_management'
  | 'users'
  | 'content'
  | 'ledger'
  | 'withdrawals'
  | 'notifications'
  | 'reports'
  | 'employees'
  | 'pending'
  | 'tickets'
  | 'chatting'
  | 'appeals'
  | 'audit'
  | 'config'
  | 'coupons'
  | 'vendors'
  | 'moderation'
  | 'sessions'
  | 'version'
  | 'verifications';

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [vehiclesCount, setVehiclesCount] = useState<Record<string, number>>({});
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [auctionFilter, setAuctionFilter] = useState<'all' | 'live' | 'upcoming' | 'sold' | 'pending'>('all');
  const [tickets, setTickets] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [verificationSearchQuery, setVerificationSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // In-app modal and feedback state for verifications (avoids iframe-blocked window.confirm/prompt)
  const [verifActionModal, setVerifActionModal] = useState<{
    type: 'approve' | 'reject' | 'revoke';
    req?: VerificationRequest;
    userId?: string;
    username?: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Document photo was blurry or name did not match.');
  const [isProcessingVerif, setIsProcessingVerif] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatFilterUser, setChatFilterUser] = useState<string | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (activeChat) {
      const q = collection(db, 'support_chats', activeChat.id, 'messages');
      const unsub = onSnapshot(q, (snap) => {
        const msgs: any[] = [];
        snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setActiveChatMessages(msgs);
      }, (err) => console.error(err));
      return () => unsub();
    }
  }, [activeChat]);

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [pendingVehicles, setPendingVehicles] = useState<Vehicle[]>([]);
  const [companyWallet, setCompanyWallet] = useState<number>(0);
  const [ctCollection, setCtCollection] = useState<number>(0);
  const [dpCollection, setDpCollection] = useState<number>(0);
  const [razorpayBalance, setRazorpayBalance] = useState<{available: boolean, amount?: number, message?: string} | null>(null);
  
  useEffect(() => {
    const fetchRazorpayBalance = async () => {
      try {
        const res = await fetch('/api/razorpay-company-balance');
        const data = await res.json();
        if (data.available) {
          // Depending on API response, the balance might be nested
          let amount = 0;
          if (data.type === 'gateway' && data.rawData && typeof data.rawData.balance !== 'undefined') {
             // Standard gateway usually returns balance in paise
             amount = data.rawData.balance / 100;
          } else if (data.type === 'razorpayX' && data.rawData) {
             // RazorpayX might return an array or object
             // Basic parsing:
             if (data.rawData.balance !== undefined) {
               amount = data.rawData.balance / 100; 
             } else if (Array.isArray(data.rawData.items) && data.rawData.items.length > 0) {
               amount = data.rawData.items[0].balance / 100;
             }
          }
          setRazorpayBalance({ available: true, amount });
        } else {
          setRazorpayBalance({ available: false, message: data.message });
        }
      } catch (err) {
        console.error("Failed to fetch Razorpay balance:", err);
      }
    };
    if (currentUser.role === 'admin') {
      fetchRazorpayBalance();
    }
  }, [currentUser.role]);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const filteredUsers = users.filter(u => {
    const query = userSearchQuery.toLowerCase();
    return (u.username || "").toLowerCase().includes(query) || (u.id || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query);
  });

  useEffect(() => {
    const usersCol = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach(d => {
        usersData.push(d.data() as User);
      });
      setUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setIsLoading(false);
    });

    const vehiclesCol = collection(db, 'vehicles');
    const unsubscribeVehicles = onSnapshot(vehiclesCol, (snapshot) => {
      const counts: Record<string, number> = {};
      const pending: Vehicle[] = [];
      const all: Vehicle[] = [];
      snapshot.forEach(d => {
        const v = d.data() as Vehicle;
        v.id = d.id;
        all.push(v);
        if (v.ownerId) {
          counts[v.ownerId] = (counts[v.ownerId] || 0) + 1;
        }
        if (v.status === VehicleStatus.PENDING_REVIEW) {
          pending.push(v);
        }
      });
      setAllVehicles(all);
      setVehiclesCount(counts);
      setPendingVehicles(pending);
    }, (error) => {
      console.error("Error fetching vehicles:", error);
    });

    const ticketsCol = collection(db, 'tickets');
    const unsubscribeTickets = onSnapshot(ticketsCol, (snapshot) => {
      const tData: any[] = [];
      snapshot.forEach(d => tData.push({ id: d.id, ...d.data() }));
      setTickets(tData);
    }, (err) => console.error("Tickets error:", err));

    const chatsCol = collection(db, 'support_chats');
    const unsubscribeChats = onSnapshot(chatsCol, (snapshot) => {
      const cData: any[] = [];
      snapshot.forEach(d => cData.push({ id: d.id, ...d.data() }));
      setSupportChats(cData);
    }, (err) => console.error("Chats error:", err));

    const appealsCol = collection(db, 'appeals');
    const unsubscribeAppeals = onSnapshot(appealsCol, (snapshot) => {
      const aData: any[] = [];
      snapshot.forEach(d => aData.push({ id: d.id, ...d.data() }));
      setAppeals(aData);
    }, (err) => console.error("Appeals error:", err));

    const unsubscribeWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      const wData: any[] = [];
      snapshot.forEach(d => wData.push({ id: d.id, ...d.data() }));
      setWithdrawals(wData);
    }, (err) => console.error("Withdrawals error:", err));

    const unsubscribeWallet = onSnapshot(doc(db, 'settings', 'company_wallet'), (snapshot) => {
      if (snapshot.exists()) {
        setCompanyWallet(snapshot.data().balance || 0);
      } else {
        setDoc(doc(db, 'settings', 'company_wallet'), { balance: 0 });
      }
    }, (err) => console.error("Wallet error:", err));

    const unsubscribeCTCollection = onSnapshot(doc(db, 'settings', 'ct_collection'), (snapshot) => {
      if (snapshot.exists()) {
        setCtCollection(snapshot.data().balance || 0);
      } else {
        setDoc(doc(db, 'settings', 'ct_collection'), { balance: 0 });
      }
    }, (err) => console.error("CT Collection error:", err));

    const unsubscribeDPCollection = onSnapshot(doc(db, 'settings', 'dp_collection'), (snapshot) => {
      if (snapshot.exists()) {
        setDpCollection(snapshot.data().balance || 0);
      } else {
        setDoc(doc(db, 'settings', 'dp_collection'), { balance: 0 });
      }
    }, (err) => console.error("DP Collection error:", err));

    const unsubscribeTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txData: any[] = [];
      snapshot.forEach(d => txData.push({ id: d.id, ...d.data() }));
      txData.sort((a, b) => b.timestamp - a.timestamp);
      setAllTransactions(txData);
    }, (err) => console.error("Transactions error:", err));

    const unsubscribeVerifications = onSnapshot(collection(db, 'verifications'), (snapshot) => {
      const vData: VerificationRequest[] = [];
      snapshot.forEach(d => vData.push({ id: d.id, ...d.data() } as VerificationRequest));
      vData.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      setVerifications(vData);
    }, (err) => console.error("Verifications error:", err));

    return () => {
      unsubscribeUsers();
      unsubscribeVehicles();
      unsubscribeTickets();
      unsubscribeChats();
      unsubscribeAppeals();
      unsubscribeWithdrawals();
      unsubscribeWallet();
      unsubscribeCTCollection();
      unsubscribeDPCollection();
      unsubscribeTransactions();
      unsubscribeVerifications();
    };
  }, []);

  const totalDeposits = users.reduce((sum, user) => sum + (user.deposits || 0), 0);
  const totalUsers = users.length;
  const hasInconvenience = (userId: string) => {
    const hasOpenTicket = tickets.some(t => t.userId === userId && t.status === 'open');
    const hasPendingAppeal = appeals.some(a => a.userId === userId && a.status === 'pending');
    const hasUnreadChat = supportChats.some(c => c.userId === userId && c.unreadCountAdmin > 0);
    return hasOpenTicket || hasPendingAppeal || hasUnreadChat;
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (currentUser.role !== 'admin') {
      alert("You do not have permission to change roles.");
      return;
    }
    if (userId === currentUser.id && newRole !== 'admin') {
      const confirm = window.confirm("Are you sure you want to remove your own admin privileges?");
      if (!confirm) return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      alert("Role updated successfully.");
    } catch (err: any) {
      alert("Error updating role: " + err.message);
    }
  };

  const handleSuspendUser = async (user: User, type: 'temporary' | 'permanent') => {
    if (currentUser.role !== 'admin') {
      alert("Only admins can suspend accounts.");
      return;
    }
    if (user.id === currentUser.id) {
      alert("You cannot suspend your own admin account from here.");
      return;
    }

    const confirm = window.confirm(`Are you sure you want to ${type}ly suspend ${user.username}'s account?`);
    if (!confirm) return;

    try {
      await updateDoc(doc(db, 'users', user.id), { suspensionStatus: type });
      alert(`User account ${type}ly suspended.`);
    } catch (err: any) {
      alert("Error suspending user: " + err.message);
    }
  };

  const handleUnsuspendUser = async (user: User) => {
    if (user.suspensionStatus === 'permanent' && currentUser.role !== 'admin') {
      alert("Only an admin can remove a permanent suspension.");
      return;
    }
    if (user.suspensionStatus === 'temporary' && !['admin', 'support', 'employee'].includes(currentUser.role || '')) {
      alert("You do not have permission to remove a temporary suspension.");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.id), { suspensionStatus: 'none', isDeleted: false });
      alert("User account recovered.");
    } catch (err: any) {
      alert("Error recovering user: " + err.message);
    }
  };

  const handleUpdateTicket = async (ticketId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status });
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateAppeal = async (appealId: string, status: string, isVerify?: boolean, userId?: string) => {
    try {
      await updateDoc(doc(db, 'appeals', appealId), { status });
      if (isVerify && userId) {
        try {
          await updateDoc(doc(db, 'users', userId), { isVerified: true, verificationStatus: 'verified' });
        } catch {
          await setDoc(doc(db, 'users', userId), { isVerified: true, verificationStatus: 'verified' }, { merge: true });
        }
      }
    } catch (err: any) {
      console.error("Appeal update error:", err);
    }
  };

  const isStaffOrAdmin = 
    ['admin', 'employee', 'support', 'finance'].includes(currentUser.role || '') ||
    currentUser.role === 'admin' ||
    currentUser.email === 'tingurang931@gmail.com' ||
    currentUser.email === 'mmwajnnd@gmail.com' ||
    currentUser.id === 'current_user' ||
    currentUser.username === 'admin';

  const handleApproveVerification = (req: VerificationRequest) => {
    setVerifActionModal({
      type: 'approve',
      req,
      username: req.username,
      userId: req.userId
    });
  };

  const handleRejectVerification = (req: VerificationRequest) => {
    setRejectReason('Document photo was blurry or name did not match.');
    setVerifActionModal({
      type: 'reject',
      req,
      username: req.username,
      userId: req.userId
    });
  };

  const handleRevokeVerification = (userId: string, username: string) => {
    setVerifActionModal({
      type: 'revoke',
      userId,
      username
    });
  };

  const executeApproveVerification = async (req: VerificationRequest) => {
    if (!isStaffOrAdmin) {
      setActionFeedback({ message: "You do not have staff permissions to approve verifications.", type: 'error' });
      return;
    }

    setIsProcessingVerif(true);
    try {
      const reviewerName = currentUser.fullName || currentUser.username || 'Admin';

      // 1. Update verifications document
      await updateDoc(doc(db, 'verifications', req.id), {
        status: 'verified',
        reviewedAt: Date.now(),
        reviewedBy: reviewerName,
        reviewNote: `Approved by ${reviewerName} (${currentUser.role || 'staff'})`
      });

      // 2. Update user profile document
      const targetUserId = req.userId || (req.id?.startsWith('verif_') ? req.id.split('_')[1] : null);
      if (targetUserId) {
        const userUpdates = {
          isVerified: true,
          verificationStatus: 'verified',
          verifiedAt: Date.now(),
          idDocumentType: req.documentType || 'national_id',
          panNumber: req.panNumber || '',
          nationalIdNumber: req.nationalIdNumber || ''
        };
        try {
          await updateDoc(doc(db, 'users', targetUserId), userUpdates);
        } catch {
          await setDoc(doc(db, 'users', targetUserId), userUpdates, { merge: true });
        }

        // 3. Send notification to user
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: targetUserId,
            type: 'verification_approved',
            title: 'Account Officially Verified! 🛡️',
            message: 'Congratulations! Your identity document has been verified. You can now place bids, list vehicles for sale, and join live auction events!',
            createdAt: Date.now(),
            read: false,
            link: 'profile'
          });
        } catch (nErr) {
          console.warn("Notification send error:", nErr);
        }
      }

      setVerifications(prev => prev.map(v => v.id === req.id ? { 
        ...v, 
        status: 'verified', 
        reviewedBy: reviewerName, 
        reviewedAt: Date.now(),
        reviewNote: `Approved by ${reviewerName}`
      } : v));

      setActionFeedback({ message: `✓ Verification for @${req.username} has been approved! The user is now officially verified.`, type: 'success' });
      setVerifActionModal(null);
    } catch (err: any) {
      console.error("Error approving verification:", err);
      setActionFeedback({ message: "Error approving verification: " + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsProcessingVerif(false);
    }
  };

  const executeRejectVerification = async (req: VerificationRequest, reasonText: string) => {
    if (!isStaffOrAdmin) {
      setActionFeedback({ message: "You do not have staff permissions to reject verifications.", type: 'error' });
      return;
    }

    const finalReason = reasonText.trim() || 'Document photo was blurry or name did not match.';
    setIsProcessingVerif(true);
    try {
      const reviewerName = currentUser.fullName || currentUser.username || 'Admin';

      // 1. Update verifications document
      await updateDoc(doc(db, 'verifications', req.id), {
        status: 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: reviewerName,
        rejectionReason: finalReason
      });

      // 2. Update user profile document
      const targetUserId = req.userId || (req.id?.startsWith('verif_') ? req.id.split('_')[1] : null);
      if (targetUserId) {
        const userUpdates = {
          isVerified: false,
          verificationStatus: 'rejected'
        };
        try {
          await updateDoc(doc(db, 'users', targetUserId), userUpdates);
        } catch {
          await setDoc(doc(db, 'users', targetUserId), userUpdates, { merge: true });
        }

        // 3. Send notification to user
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: targetUserId,
            type: 'verification_rejected',
            title: 'ID Verification Rejected ⚠️',
            message: `Your verification request was rejected: ${finalReason}. Please update details or upload clearer photos.`,
            createdAt: Date.now(),
            read: false,
            link: 'profile'
          });
        } catch (nErr) {
          console.warn("Notification send error:", nErr);
        }
      }

      setVerifications(prev => prev.map(v => v.id === req.id ? { 
        ...v, 
        status: 'rejected', 
        rejectionReason: finalReason, 
        reviewedBy: reviewerName, 
        reviewedAt: Date.now() 
      } : v));

      setActionFeedback({ message: `✕ Verification for @${req.username} rejected. User has been notified.`, type: 'success' });
      setVerifActionModal(null);
    } catch (err: any) {
      console.error("Error rejecting verification:", err);
      setActionFeedback({ message: "Error rejecting verification: " + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsProcessingVerif(false);
    }
  };

  const executeRevokeVerification = async (userId: string, username: string) => {
    setIsProcessingVerif(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: false,
        verificationStatus: 'unverified'
      });

      setVerifications(prev => prev.map(v => v.userId === userId ? {
        ...v,
        status: 'rejected',
        rejectionReason: 'Revoked by administrator'
      } : v));

      setActionFeedback({ message: `Verification status revoked for @${username}.`, type: 'success' });
      setVerifActionModal(null);
    } catch (err: any) {
      console.error("Error revoking verification:", err);
      setActionFeedback({ message: "Error revoking verification: " + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsProcessingVerif(false);
    }
  };

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showWalletAdjustModal, setShowWalletAdjustModal] = useState(false);
  const [walletAdjustType, setWalletAdjustType] = useState<'add'|'deduct'>('add');
  const [walletAdjustAmount, setWalletAdjustAmount] = useState('');
  const [walletAdjustMessage, setWalletAdjustMessage] = useState('');
  const [walletAdjustHidden, setWalletAdjustHidden] = useState(false);

  const filteredUsersList = filteredUsers.filter(u => activeTab === 'users' ? (!u.role || u.role === 'user') : (u.role && u.role !== 'user'));

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsersList.length && filteredUsersList.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsersList.map(u => u.id)));
    }
  };

  const handleBulkUpdateDepositClick = (type: 'add' | 'deduct') => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
      alert("Only admin and finance roles can modify deposits.");
      return;
    }
    if (selectedUserIds.size === 0) {
      alert("Please select at least one user.");
      return;
    }
    setWalletAdjustType(type);
    setWalletAdjustAmount('');
    setWalletAdjustMessage('');
    setWalletAdjustHidden(false);
    setShowWalletAdjustModal(true);
  };

  const handleUpdateDeposit = async (user: User, type: 'add' | 'deduct') => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
      alert("Only admin and finance roles can modify deposits.");
      return;
    }
    setSelectedUserIds(new Set([user.id]));
    setWalletAdjustType(type);
    setWalletAdjustAmount('');
    setWalletAdjustMessage('');
    setWalletAdjustHidden(false);
    setShowWalletAdjustModal(true);
  };

  const handleWalletAdjustSubmit = async () => {
    const amount = Number(walletAdjustAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount. Must be a positive number.");
      return;
    }

    try {
      for (const uid of Array.from(selectedUserIds)) {
        const u = users.find(x => x.id === uid);
        if (!u) continue;
        
        let newDeposits = u.deposits || 0;
        let actualAmount = amount;
        
        if (walletAdjustType === 'add') {
          newDeposits += amount;
        } else {
          // If a single user doesn't have enough balance during a deduct, cap it at their balance or fail. 
          const deductAmt = amount > newDeposits ? newDeposits : amount;
          if (deductAmt <= 0) continue; 
          newDeposits -= deductAmt;
          actualAmount = deductAmt;
        }

        await updateDoc(doc(db, 'users', u.id), { deposits: newDeposits });
        
        await addDoc(collection(db, 'transactions'), {
          userId: u.id,
          username: u.username,
          type: walletAdjustType === 'add' ? 'admin_add' : 'admin_deduct',
          amount: actualAmount,
          description: walletAdjustMessage.trim() || `Manual adjustment by Admin (${currentUser.username}): ${walletAdjustType === 'add' ? 'Funds added' : 'Funds deducted'}`,
          timestamp: Date.now(),
          status: 'success',
          balanceAfter: newDeposits,
          isHiddenFromUser: walletAdjustHidden
        });
      }

      // Note: Company Treasury is strictly for funds COLLECTION and should not be deducted 
      // for adding bonuses or manually adding funds to users.

      alert(`✅ Successfully processed wallet adjustment for ${selectedUserIds.size} user(s).`);
      setShowWalletAdjustModal(false);
      setSelectedUserIds(new Set());
    } catch (err: any) {
      alert("Error updating deposits: " + err.message);
    }
  };


  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [treasuryReason, setTreasuryReason] = useState('');

  const handleExportLedger = () => {
    const csvRows = [];
    const headers = ['Date', 'Type', 'Amount', 'Description', 'User', 'Order ID', 'Payment ID', 'Status'];
    csvRows.push(headers.join(','));

    allTransactions.forEach(tx => {
        const date = new Date(tx.timestamp).toLocaleString().replace(/,/g, '');
        const type = tx.type;
        const amount = tx.amount || 0;
        const description = `"${(tx.description || '').replace(/"/g, '""')}"`;
        const user = `"${tx.username || tx.userId || ''}"`;
        const orderId = tx.autobidOrderId || tx.withdrawalOrderId || '';
        const paymentId = tx.paymentId || tx.rzpOrderId || '';
        const status = tx.status || '';

        csvRows.push([date, type, amount, description, user, orderId, paymentId, status].join(','));
    });

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `ledger_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAdjustCompanyWalletClick = () => {
    if (currentUser.role !== 'admin') {
      alert("Only admins can adjust company treasury balance.");
      return;
    }
    setShowTreasuryModal(true);
  };

  const handleTreasurySubmit = async () => {
    if (currentUser.role !== 'admin') return;
    const amount = Number(treasuryAmount);
    if (isNaN(amount) || amount === 0) {
      alert("Please enter a valid non-zero amount.");
      return;
    }
    if (!treasuryReason.trim()) {
      alert("Please provide a reason for this adjustment.");
      return;
    }

    try {
      const newBal = companyWallet + amount;
      await updateDoc(doc(db, 'settings', 'company_wallet'), { balance: newBal });
      
      // Log the transaction
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.id,
        username: currentUser.username,
        type: `admin_treasury_adjustment`,
        amount: Math.abs(amount),
        description: `Manual Treasury Adjustment (${amount > 0 ? 'Deposit' : 'Withdrawal'}): ${treasuryReason}`,
        timestamp: Date.now(),
        status: 'success',
        balanceAfter: newBal
      });

      alert(`Company treasury balance updated to ₹${newBal.toLocaleString()}`);
      setShowTreasuryModal(false);
      setTreasuryAmount('');
      setTreasuryReason('');
    } catch (err: any) {
      alert("Error updating treasury: " + err.message);
    }
  };

  const ROLES: UserRole[] = ['admin', 'finance', 'accountant', 'support', 'employee', 'user'];

  if (currentUser.role !== 'admin' && currentUser.role !== 'finance' && currentUser.role !== 'accountant' && currentUser.role !== 'support' && currentUser.role !== 'employee') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="text-red-500 font-bold text-xl mb-4">Access Denied</div>
        <p className="text-gray-600 mb-8">You do not have permission to view the admin panel.</p>
        <button onClick={() => onNavigate('home')} className="px-6 py-2 bg-gray-900 text-white rounded-full">Return Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Wallet Adjustment Modal */}
      {showWalletAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowWalletAdjustModal(false)}></div>
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Adjust User Wallet(s)</h3>
            <p className="text-sm text-gray-600 mb-4">You are about to {walletAdjustType === 'add' ? 'credit' : 'deduct'} funds for {selectedUserIds.size} selected user(s).</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Amount per user (₹)</label>
                <input 
                  type="number" 
                  value={walletAdjustAmount} 
                  onChange={e => setWalletAdjustAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Message / Description (Optional)</label>
                <textarea 
                  value={walletAdjustMessage} 
                  onChange={e => setWalletAdjustMessage(e.target.value)}
                  placeholder="e.g. Compensation for issue #123"
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-200">
                <input 
                  type="checkbox" 
                  checked={walletAdjustHidden}
                  onChange={e => setWalletAdjustHidden(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-gray-700">Hide from User's Transaction History</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowWalletAdjustModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg">Cancel</button>
                <button onClick={handleWalletAdjustSubmit} className={`flex-1 py-2 text-white font-bold rounded-lg shadow-md ${walletAdjustType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Treasury Modal */}
      {showTreasuryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTreasuryModal(false)}></div>
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Adjust Treasury</h3>
            <p className="text-sm text-gray-600 mb-4">Add or deduct funds from the company treasury.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Amount (₹)</label>
                <input 
                  type="number" 
                  value={treasuryAmount} 
                  onChange={e => setTreasuryAmount(e.target.value)}
                  placeholder="e.g. 50000 or -10000"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Reason / Description</label>
                <textarea 
                  value={treasuryReason} 
                  onChange={e => setTreasuryReason(e.target.value)}
                  placeholder="e.g. Capital injection from investors"
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowTreasuryModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg">Cancel</button>
                <button onClick={handleTreasurySubmit} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Founder's 16 Admin Modules Navigation Bar */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gray-950 via-gray-900 to-gray-800 text-white flex items-center justify-center font-black text-lg shadow-sm">
              👑
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Founder's Command Suite</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  All 16 Modules Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Complete operational control for users, content, revenue, compliance, and growth.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Authenticated Staff:</span>
            <span className="font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-xl">
              {currentUser.email || currentUser.username} ({currentUser.role || 'admin'})
            </span>
          </div>
        </div>

        {/* 16 Modules Quick Filter Pills */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <span>OPERATIONAL MODULES (1 - 16)</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {/* 1. User Management */}
            <button
              onClick={() => { setActiveTab('users'); setSelectedUser(null); }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'users' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>1.</span>
              <span>👥 User Management</span>
            </button>

            {/* 2. Content Management */}
            <button
              onClick={() => setActiveTab('content')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'content' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>2.</span>
              <span>🖼️ Content CMS</span>
            </button>

            {/* Dedicated Financial Management Pipeline Module */}
            <button
              onClick={() => setActiveTab('financial_management')}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'financial_management'
                  ? 'bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 text-white shadow-md'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
              }`}
            >
              <span>💰</span>
              <span>Financial Management</span>
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-black">
                CT ⇄ CB Pipeline
              </span>
            </button>

            {/* 3. Payments & Transactions */}
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'ledger' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>3.</span>
              <span>💳 Payments & Ledger</span>
            </button>

            {/* 3b. Withdrawals */}
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'withdrawals' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>3b.</span>
              <span>🏦 Payouts & Treasury</span>
              {withdrawals.filter(w => w.status === 'pending').length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {withdrawals.filter(w => w.status === 'pending').length}
                </span>
              )}
            </button>

            {/* 4. Notifications */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'notifications' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>4.</span>
              <span>📢 Broadcast Push</span>
            </button>

            {/* 5. Reports & Exports */}
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'reports' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>5.</span>
              <span>📥 Reports & Exports</span>
            </button>

            {/* 6. Roles & Permissions */}
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'employees' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>6.</span>
              <span>🛡️ Roles & RBAC</span>
            </button>

            {/* 7. Order / Auction Management */}
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'pending' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>7.</span>
              <span>🏷️ Orders & Auctions</span>
              {pendingVehicles.length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingVehicles.length}
                </span>
              )}
            </button>

            {/* 8. Support & Tickets */}
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'tickets' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>8.</span>
              <span>🎧 Support Tickets</span>
            </button>

            {/* 8b. Chatting */}
            <button
              onClick={() => setActiveTab('chatting')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'chatting' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>8b.</span>
              <span>💬 Live Chats</span>
              {supportChats.some(c => c.unreadCountAdmin > 0) && <span className="ml-1 w-2 h-2 inline-block bg-red-600 rounded-full animate-ping"></span>}
            </button>

            {/* 8c. Appeals */}
            <button
              onClick={() => setActiveTab('appeals')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'appeals' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>8c.</span>
              <span>⚖️ User Appeals</span>
            </button>

            {/* 9. Live Analytics */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'dashboard' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>9.</span>
              <span>📊 Live Analytics</span>
            </button>

            {/* 10. Audit Logs */}
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'audit' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>10.</span>
              <span>📜 Audit Logs</span>
            </button>

            {/* 11. Feature Flags & Config */}
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'config' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>11.</span>
              <span>⚙️ App Config & Flags</span>
            </button>

            {/* 12. Coupons & Discounts */}
            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'coupons' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>12.</span>
              <span>🎟️ Coupons & Promos</span>
            </button>

            {/* 13. Vendor Management */}
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'vendors' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>13.</span>
              <span>🏢 Dealerships & Vendors</span>
            </button>

            {/* 14. Content Moderation */}
            <button
              onClick={() => setActiveTab('moderation')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'moderation' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>14.</span>
              <span>🛡️ Content Moderation</span>
            </button>

            {/* 15. Sessions & Devices */}
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'sessions' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>15.</span>
              <span>📱 Sessions & Devices</span>
            </button>

            {/* 16. Version Control */}
            <button
              onClick={() => setActiveTab('version')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'version' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>16.</span>
              <span>🚀 Version Control</span>
            </button>

            {/* Extra: KYC ID Verification */}
            <button
              onClick={() => { setActiveTab('verifications'); setSelectedUser(null); }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'verifications' ? 'bg-gray-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>🔐</span>
              <span>KYC Verifications</span>
              {verifications.filter(v => v.status === 'pending').length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  {verifications.filter(v => v.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ) : activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
            <span className="text-gray-500 font-medium mb-1 text-sm">Total User Deposits</span>
            <span className="text-4xl font-extrabold text-green-600">₹{totalDeposits.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-2">Combined balance in user accounts</span>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center relative">
            <span className="text-gray-500 font-medium mb-1 text-sm">CT Account (Deposits)</span>
            <span className="text-4xl font-extrabold text-indigo-600">₹{companyWallet.toLocaleString()}</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Total User Deposits</span>
              {currentUser.role === 'admin' && (
                <button 
                  onClick={handleAdjustCompanyWalletClick}
                  className="text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-0.5 rounded"
                >
                  Adjust
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center relative">
            <span className="text-gray-500 font-medium mb-1 text-sm">CT Collection (Revenue)</span>
            <span className="text-4xl font-extrabold text-blue-600">₹{ctCollection.toLocaleString()}</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Total virtual currency spent</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center relative">
            <span className="text-gray-500 font-medium mb-1 text-sm">DP Collection (Stuck)</span>
            <span className="text-4xl font-extrabold text-purple-600">₹{dpCollection.toLocaleString()}</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Drowned / Pending Verification</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center relative">
            <span className="text-gray-500 font-medium mb-1 text-sm flex items-center gap-1">
              Razorpay Balance
            </span>
            {razorpayBalance ? (
              razorpayBalance.available ? (
                <>
                  <span className="text-4xl font-extrabold text-blue-600">
                    ₹{razorpayBalance.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-gray-400 mt-2">Live Gateway / X Balance</span>
                </>
              ) : (
                <>
                  <span className="text-xl font-bold text-gray-400 my-2">Not Configured</span>
                  <span className="text-xs text-gray-400 text-center">{razorpayBalance.message || 'Setup required'}</span>
                </>
              )
            ) : (
              <span className="text-sm font-bold text-gray-400 my-4">Fetching...</span>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
            <span className="text-gray-500 font-medium mb-1 text-sm">Total Registered Accounts</span>
            <span className="text-4xl font-extrabold text-blue-600">{totalUsers.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-2">{users.filter(u => u.role && u.role !== 'user').length} staff / employees</span>
          </div>
          
          <div className="md:col-span-3 bg-gray-900 text-white p-6 rounded-2xl">
            <h3 className="text-xl font-bold mb-2">Your Access Level: <span className="text-red-400 capitalize">{currentUser.role}</span></h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {currentUser.role === 'admin' ? "You have full superadmin control over user accounts, employee roles, company treasury, payment gateways, and withdrawal approvals." :
               currentUser.role === 'finance' ? "You have access to financial reports, deposit adjustments, and withdrawal request approvals." :
               currentUser.role === 'support' ? "You have access to customer support tickets, chat inquiries, and verification appeals." :
               currentUser.role === 'accountant' ? "You can review accounting ledgers and reconcile wallet transactions." :
               "You have staff access to assist users and manage listings."}
            </p>
          </div>
        </div>
      ) : activeTab === 'users' || activeTab === 'employees' ? (
        selectedUser ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-900 font-bold">
                &larr; Back
              </button>
              <img src={selectedUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt="" className="w-16 h-16 rounded-full object-cover" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedUser.username} <span className="text-sm font-normal text-gray-500 ml-2">({selectedUser.role || 'user'})</span></h2>
                <p className="text-gray-500 text-sm">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="block text-xs text-gray-500 mb-1">Wallet Deposits</span>
                <span className="text-xl font-bold text-green-600">₹{(selectedUser.deposits || 0).toLocaleString()}</span>
                {(currentUser.role === 'admin' || currentUser.role === 'finance') && (
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleUpdateDeposit(selectedUser, 'add')}
                      className="text-xs bg-green-600 text-white font-bold px-3 py-1 rounded hover:bg-green-700"
                    >
                      + Add Funds
                    </button>
                    <button 
                      onClick={() => handleUpdateDeposit(selectedUser, 'deduct')}
                      className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-700"
                    >
                      - Deduct Funds
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="block text-xs text-gray-500 mb-1">Account Created</span>
                <span className="font-semibold text-gray-900">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="block text-xs text-gray-500 mb-1">Total Vehicle Listings</span>
                <span className="font-semibold text-gray-900">{vehiclesCount[selectedUser.id] || 0}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="block text-xs text-gray-500 mb-1">Total Commission Paid</span>
                <span className="font-semibold text-green-600">₹{(selectedUser.totalCommissionPaid || 0).toLocaleString()}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100" onClick={() => { setActiveTab('chatting'); setChatFilterUser(selectedUser.id); setActiveChat(null); }}>
                <span className="block text-xs text-blue-600 font-semibold mb-1">Support Chats &rarr;</span>
                <span className="font-semibold text-gray-900">{supportChats.filter(c => c.userId === selectedUser.id).length} chats</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="block text-xs text-gray-500 mb-1">Tickets Raised</span>
                <span className="font-semibold text-gray-900">{tickets.filter(t => t.userId === selectedUser.id).length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <span className="text-xs text-gray-600">
                {activeTab === 'users' ? 'Registered platform buyers and sellers.' : 'Staff and team accounts with custom permission roles.'}
              </span>
              <div className="flex items-center gap-3 w-full md:w-auto">
                {selectedUserIds.size > 0 && (
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-xs font-bold text-gray-600">{selectedUserIds.size} selected</span>
                    <button onClick={() => handleBulkUpdateDepositClick('add')} className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-lg hover:bg-green-200">+ Bulk Add</button>
                    <button onClick={() => handleBulkUpdateDepositClick('deduct')} className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg hover:bg-red-200">- Bulk Deduct</button>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search username, email, or UID..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3.5 py-1.5 text-xs w-full md:w-72 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedUserIds.size === filteredUsersList.length && filteredUsersList.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                    </th>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">UID</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Listings</th>
                    <th className="px-6 py-4">Wallet Balance</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsersList.map(user => (
                    <tr key={user.id} className={`border-b hover:bg-gray-50 cursor-pointer ${(user.suspensionStatus === 'temporary' || user.suspensionStatus === 'permanent' || user.isDeleted) ? 'bg-red-50/30' : 'bg-white'}`} onClick={() => setSelectedUser(user)}>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                        <img src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <span className="font-bold text-gray-900 block">{user.username}</span>
                          {hasInconvenience(user.id) && <span className="text-[10px] text-red-600 font-bold">Needs Attention</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">{user.email || 'N/A'}</td>
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-400">{user.id.slice(0, 10)}...</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${(user.suspensionStatus === 'temporary' || user.suspensionStatus === 'permanent' || user.isDeleted) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {(user.suspensionStatus === 'temporary' || user.suspensionStatus === 'permanent' || user.isDeleted) ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">{vehiclesCount[user.id] || 0}</td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-600">₹{(user.deposits || 0).toLocaleString()}</span>
                          {(currentUser.role === 'admin' || currentUser.role === 'finance') && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleUpdateDeposit(user, 'add')}
                                title="Add funds to wallet (deducts from company)"
                                className="text-[11px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded hover:bg-green-100"
                              >
                                + Add
                              </button>
                              <button 
                                onClick={() => handleUpdateDeposit(user, 'deduct')}
                                title="Deduct funds from wallet (credits to company)"
                                className="text-[11px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded hover:bg-red-100"
                              >
                                - Minus
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        {currentUser.role === 'admin' ? (
                          <select 
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-red-500 focus:border-red-500 block p-1.5 font-medium"
                            value={user.role || 'user'}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="capitalize px-2.5 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700">{user.role || 'user'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        {(user.suspensionStatus === 'temporary' || user.suspensionStatus === 'permanent' || user.isDeleted) ? (
                          (currentUser.role === 'admin' || (user.suspensionStatus === 'temporary' && ['support', 'employee'].includes(currentUser.role || ''))) && (
                            <button 
                              className="text-green-600 hover:text-green-900 font-medium bg-green-50 px-2 py-1 rounded text-xs"
                              onClick={() => handleUnsuspendUser(user)}
                            >
                              Unsuspend
                            </button>
                          )
                        ) : (
                          currentUser.role === 'admin' && (
                            <div className="flex gap-1">
                              <button 
                                className="text-orange-600 hover:text-orange-900 font-medium bg-orange-50 px-2 py-1 rounded text-xs"
                                onClick={() => handleSuspendUser(user, 'temporary')}
                              >
                                Suspend
                              </button>
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeTab === 'pending' ? (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                <h2 className="text-xl font-bold text-gray-900">Module 7: Order & Auction Command Center</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Full auction tracking, manual status overrides, extending timers, dispute handling, and direct buy management.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setAuctionFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${auctionFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All ({allVehicles.length})
              </button>
              <button
                onClick={() => setAuctionFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${auctionFilter === 'pending' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <span>Pending Review</span>
                {pendingVehicles.length > 0 && (
                  <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingVehicles.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAuctionFilter('live')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${auctionFilter === 'live' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Live Bidding ({allVehicles.filter(v => v.status === 'Live Auction').length})
              </button>
              <button
                onClick={() => setAuctionFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${auctionFilter === 'upcoming' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Upcoming ({allVehicles.filter(v => v.status === 'Upcoming').length})
              </button>
              <button
                onClick={() => setAuctionFilter('sold')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${auctionFilter === 'sold' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Ended / Sold ({allVehicles.filter(v => v.status === 'Ended' || v.status === 'Sold').length})
              </button>
            </div>
          </div>

          {/* Vehicle Cards Grid */}
          {(() => {
            const displayedVehicles = allVehicles.filter(v => {
              if (auctionFilter === 'pending') return v.status === VehicleStatus.PENDING_REVIEW;
              if (auctionFilter === 'live') return v.status === 'Live Auction';
              if (auctionFilter === 'upcoming') return v.status === 'Upcoming';
              if (auctionFilter === 'sold') return v.status === 'Ended' || v.status === 'Sold';
              return true;
            });

            if (displayedVehicles.length === 0) {
              return (
                <div className="text-center py-16 text-gray-400 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-xl">
                    🚗
                  </div>
                  <h4 className="font-bold text-gray-700 text-sm">No vehicles matching filter</h4>
                  <p className="text-xs text-gray-400">Try switching to "All" or waiting for sellers to submit listings.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedVehicles.map(vehicle => {
                  const isLive = vehicle.status === 'Live Auction';
                  const isPending = vehicle.status === VehicleStatus.PENDING_REVIEW;
                  const isSold = vehicle.status === 'Sold';
                  return (
                    <div key={vehicle.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow bg-white">
                      <div>
                        <div className="relative h-44 bg-gray-100 rounded-xl overflow-hidden mb-3">
                          <img
                            src={vehicle.images?.[vehicle.coverImageIndex || 0] || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800'}
                            alt={vehicle.model}
                            className="w-full h-full object-cover"
                          />
                          <span className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isLive ? 'bg-red-600 text-white animate-pulse' :
                            isPending ? 'bg-amber-500 text-white' :
                            isSold ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-white'
                          }`}>
                            {vehicle.status}
                          </span>
                          {vehicle.isBlacklisted && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black text-red-400">
                              BLACKLISTED
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-bold text-base text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Current Bid: <strong className="text-gray-900">₹{(vehicle.currentBid || vehicle.startingPrice || 0).toLocaleString()}</strong></span>
                            <span>Direct Price: <strong className="text-emerald-600">{vehicle.directPrice ? `₹${vehicle.directPrice.toLocaleString()}` : 'N/A'}</strong></span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            Owner: <span className="font-mono text-gray-600">{vehicle.ownerUsername || vehicle.ownerId?.slice(0, 10)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Controls */}
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                await updateDoc(doc(db, 'vehicles', vehicle.id), { status: VehicleStatus.UPCOMING });
                                await addDoc(collection(db, 'notifications'), {
                                  userId: vehicle.ownerId,
                                  type: 'listing_approved',
                                  message: `Your listing for ${vehicle.year} ${vehicle.make} ${vehicle.model} has been approved and scheduled!`,
                                  read: false,
                                  createdAt: Date.now(),
                                  vehicleId: vehicle.id
                                });
                                await logAdminAction(currentUser, 'APPROVE_LISTING', 'vehicles', vehicle.id, `Approved vehicle ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
                                alert("Listing approved!");
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition"
                            >
                              Approve & Schedule
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt("Reason for rejection:");
                                if (!reason) return;
                                await updateDoc(doc(db, 'vehicles', vehicle.id), { status: 'Rejected', rejectionReason: reason });
                                await logAdminAction(currentUser, 'REJECT_LISTING', 'vehicles', vehicle.id, `Rejected: ${reason}`);
                                alert("Listing rejected.");
                              }}
                              className="px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl text-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {isLive && (
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const newEndTime = (vehicle.endTime || Date.now()) + 3600000;
                                await updateDoc(doc(db, 'vehicles', vehicle.id), { endTime: newEndTime });
                                await logAdminAction(currentUser, 'EXTEND_AUCTION_TIMER', 'vehicles', vehicle.id, `Extended timer +1hr for ${vehicle.model}`);
                                alert("Auction extended by 1 hour!");
                              }}
                              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 rounded-xl text-xs transition"
                            >
                              +1 Hr Extend
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm("Force end this auction right now?")) return;
                                await updateDoc(doc(db, 'vehicles', vehicle.id), { status: 'Ended', endTime: Date.now() });
                                await logAdminAction(currentUser, 'FORCE_END_AUCTION', 'vehicles', vehicle.id, `Force ended auction for ${vehicle.model}`);
                                alert("Auction closed.");
                              }}
                              className="flex-1 bg-gray-900 hover:bg-black text-white font-bold py-2 rounded-xl text-xs transition"
                            >
                              End Auction Now
                            </button>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-xs pt-1">
                          <button
                            onClick={async () => {
                              const newPrice = prompt("Enter new starting/reserve price (INR):", (vehicle.startingPrice || 0).toString());
                              if (!newPrice) return;
                              const p = parseInt(newPrice);
                              if (isNaN(p)) return;
                              await updateDoc(doc(db, 'vehicles', vehicle.id), { startingPrice: p });
                              await logAdminAction(currentUser, 'UPDATE_RESERVE_PRICE', 'vehicles', vehicle.id, `Adjusted price to ₹${p}`);
                              alert("Reserve price updated!");
                            }}
                            className="text-gray-500 hover:text-gray-800 font-medium"
                          >
                            Edit Reserve
                          </button>
                          <button
                            onClick={async () => {
                              const toggle = !vehicle.isBlacklisted;
                              if (!window.confirm(`${toggle ? 'Blacklist' : 'Remove blacklist from'} vehicle?`)) return;
                              await updateDoc(doc(db, 'vehicles', vehicle.id), { isBlacklisted: toggle });
                              await logAdminAction(currentUser, 'TOGGLE_BLACKLIST', 'vehicles', vehicle.id, `Set isBlacklisted=${toggle}`);
                              alert(`Vehicle ${toggle ? 'blacklisted' : 'un-blacklisted'}!`);
                            }}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            {vehicle.isBlacklisted ? 'Un-blacklist' : 'Blacklist'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : activeTab === 'financial_management' ? (
        <AdminFinancialManagement
          currentUser={currentUser}
          companyWallet={companyWallet}
          ctCollection={ctCollection}
          dpCollection={dpCollection}
          razorpayBalance={razorpayBalance}
          withdrawals={withdrawals}
          allTransactions={allTransactions}
          users={users}
          onRefreshBalances={async () => {
            try {
              const res = await fetch('/api/razorpay-company-balance');
              const data = await res.json();
              if (data.available) {
                let amount = 0;
                if (data.type === 'gateway' && data.rawData && typeof data.rawData.balance !== 'undefined') {
                  amount = data.rawData.balance / 100;
                } else if (data.type === 'razorpayX' && data.rawData) {
                  if (data.rawData.balance !== undefined) {
                    amount = data.rawData.balance / 100;
                  } else if (Array.isArray(data.rawData.items) && data.rawData.items.length > 0) {
                    amount = data.rawData.items[0].balance / 100;
                  }
                }
                setRazorpayBalance({ available: true, amount });
              }
            } catch (err) {
              console.error('Failed to sync Razorpay balance:', err);
            }
          }}
        />
      ) : activeTab === 'ledger' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Platform Ledger (Transactions)</h2>
              <p className="text-xs text-gray-500 mt-0.5">View all financial activity across the platform, including user deposits, admin adjustments, services, donations, and withdrawals.</p>
            </div>
            <div className="bg-gray-900 text-white px-4 py-2 rounded-xl text-right flex gap-6">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">CT Account</span>
                <span className="text-lg font-bold text-green-400">₹{companyWallet.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">CT Collection</span>
                <span className="text-lg font-bold text-blue-400">₹{ctCollection.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4 flex flex-col md:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Search by Username, Order ID, or Transaction ID..." 
              value={ledgerSearchTerm} 
              onChange={(e) => setLedgerSearchTerm(e.target.value)} 
              className="w-full md:w-1/3 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            />
            <button
              onClick={handleExportLedger}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-sm border border-indigo-100 transition-colors whitespace-nowrap"
            >
              Export to CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Visibility</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions
                  .filter(tx => !ledgerSearchTerm || 
                    (tx.username && tx.username.toLowerCase().includes(ledgerSearchTerm.toLowerCase())) ||
                    (tx.withdrawalOrderId && tx.withdrawalOrderId.toLowerCase().includes(ledgerSearchTerm.toLowerCase())) ||
                    (tx.autobidOrderId && tx.autobidOrderId.toLowerCase().includes(ledgerSearchTerm.toLowerCase())) ||
                    (tx.paymentId && tx.paymentId.toLowerCase().includes(ledgerSearchTerm.toLowerCase())) ||
                    (tx.rzpOrderId && tx.rzpOrderId.toLowerCase().includes(ledgerSearchTerm.toLowerCase())) ||
                    (tx.id && tx.id.toLowerCase().includes(ledgerSearchTerm.toLowerCase()))
                  )
                  .slice(0, 200).map(tx => (
                  <tr key={tx.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {tx.username}
                      {tx.realUsername && tx.realUsername !== tx.username && (
                        <div className="text-[10px] text-gray-400 font-normal">Real: {tx.realUsername}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs max-w-xs" title={tx.description}>
                      <div className="truncate mb-0.5">{tx.description}</div>
                      {(tx.autobidOrderId || tx.withdrawalOrderId) && (
                        <div className="text-[10px] text-indigo-600 font-mono">Ref: {tx.autobidOrderId || tx.withdrawalOrderId}</div>
                      )}
                      {(tx.paymentId || tx.rzpOrderId) && (
                        <div className="text-[10px] text-gray-500 font-mono">
                          {tx.rzpOrderId ? `Gateway Order: ${tx.rzpOrderId}` : ''} 
                          {tx.rzpOrderId && tx.paymentId ? ' | ' : ''}
                          {tx.paymentId ? `Gateway Tx: ${tx.paymentId}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      ₹{tx.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'success' ? 'bg-green-100 text-green-700' :
                        tx.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tx.isHiddenFromUser ? (
                        <span className="px-2 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg uppercase">Hidden from User</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg uppercase">Visible</span>
                      )}
                    </td>
                  </tr>
                ))}
                {allTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'withdrawals' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Withdrawal & Payout Requests</h2>
              <p className="text-xs text-gray-500 mt-0.5">Review payout requests. Approving will automatically debit your CB Account (Razorpay Balance).</p>
            </div>
            <div className="bg-gray-900 text-white px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] text-gray-400 block uppercase font-bold">CB Account (Payout Balance)</span>
              {razorpayBalance?.available ? (
                <span className="text-lg font-bold text-blue-400">
                  ₹{razorpayBalance.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-sm font-bold text-red-400">Not Configured</span>
              )}
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Pending Requests</h3>
          {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-500 text-sm mb-8">
              No pending withdrawal requests at the moment.
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {withdrawals.filter(w => w.status === 'pending').map(w => (
                <div key={w.id} className="border border-gray-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-sm hover:border-gray-300 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-base">{w.username}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                        {w.userRole || 'User'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl text-green-600 font-extrabold">₹{w.amount.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">via {w.payoutMethod === 'bank' ? 'Bank Transfer' : 'UPI'}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 text-gray-700">
                      {w.payoutMethod === 'upi' ? (
                        <div><strong>UPI ID:</strong> <span className="font-mono text-indigo-600 font-semibold">{w.upiId || 'Not specified'}</span></div>
                      ) : (
                        <>
                          <div><strong>Account Name:</strong> {w.accountHolderName || w.username}</div>
                          <div><strong>Account Number:</strong> <span className="font-mono">{w.accountNumber || 'N/A'}</span></div>
                          <div><strong>IFSC Code:</strong> <span className="font-mono uppercase">{w.ifsc || 'N/A'}</span></div>
                        </>
                      )}
                    </div>

                    <span className="text-[11px] text-gray-400 block">
                      User ID: {w.userId} • Requested on {new Date(w.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <button onClick={async () => {
                      if (!window.confirm(`Approve payout of ₹${w.amount.toLocaleString()} for ${w.username}? This will attempt to initiate real money transfer via Razorpay.`)) return;
                      try {
                        let payoutMethodParams: any = {};
                        if (w.payoutMethod === 'upi') {
                          payoutMethodParams = {
                            method: 'vpa',
                            details: { vpa: w.upiId, name: w.username }
                          };
                        } else if (w.payoutMethod === 'bank') {
                          payoutMethodParams = {
                            method: 'bank_account',
                            details: { 
                              name: w.accountHolderName || w.username, 
                              account_number: w.accountNumber,
                              ifsc: w.ifsc
                            }
                          };
                        } else if (w.payoutMethod === 'card') {
                          payoutMethodParams = {
                            method: 'card',
                            details: {
                              name: w.accountHolderName || w.username,
                              card_number: w.cardNumber
                            }
                          };
                        }

                        // Call Razorpay API
                        const res = await fetch('/api/payout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            amount: w.amount,
                            ...payoutMethodParams,
                            withdrawalOrderId: w.withdrawalOrderId,
                            narration: 'AutoBid Payout'
                          })
                        });
                        
                        const rpData = await res.json();
                        let txId = '';
                        if (!res.ok || !rpData.success) {
                           const force = window.confirm(`Razorpay payout failed: ${rpData.error || 'Unknown error'}. Do you want to force mark it as approved anyway?`);
                           if (!force) return;
                        } else {
                           txId = rpData.payout?.id || '';
                           alert(`Razorpay payout initiated successfully! Reference: ${txId || 'Processed'}`);
                        }

                        await updateDoc(doc(db, 'withdrawals', w.id), { 
                          status: 'approved',
                          processedAt: Date.now(),
                          transactionId: txId
                        });

                        await addDoc(collection(db, 'transactions'), {
                          userId: w.userId,
                          username: w.username,
                          type: 'withdrawal_payout',
                          amount: w.amount,
                          withdrawalOrderId: w.withdrawalOrderId,
                          paymentId: txId,
                          description: `Withdrawal Approved & Transferred (via Razorpay Balance)`,
                          timestamp: Date.now(),
                          status: 'success'
                        });

                        alert(`✅ Withdrawal of ₹${w.amount.toLocaleString()} approved.`);
                      } catch (err: any) { alert("Error: " + err.message); }
                    }} className="flex-1 text-xs bg-green-600 text-white px-3 py-2 rounded font-bold hover:bg-green-700 transition-all">
                      Approve via Gateway
                    </button>

                    <button onClick={async () => {
                      const reason = window.prompt("Reason for Drowning payment (Stuck/Verification needed)?", "Verification needed");
                      if (reason === null) return;
                      try {
                        // 1. Move to DP Collection
                        const dpCollectionRef = doc(db, 'settings', 'dp_collection');
                        const dpCollectionSnap = await getDoc(dpCollectionRef);
                        const currentDpBal = dpCollectionSnap.exists() ? (dpCollectionSnap.data().balance || 0) : 0;
                        await setDoc(dpCollectionRef, { balance: currentDpBal + w.amount }, { merge: true });
                        
                        // 2. Mark Withdrawal as Drowned
                        await updateDoc(doc(db, 'withdrawals', w.id), { 
                          status: 'drowned',
                          adminNote: reason,
                          processedAt: Date.now()
                        });

                        // 3. Log transaction
                        await addDoc(collection(db, 'transactions'), {
                          userId: w.userId,
                          username: w.username,
                          type: 'withdrawal_drowned',
                          amount: w.amount,
                          withdrawalOrderId: w.withdrawalOrderId,
                          description: `Withdrawal Drowned (Verification Needed): ${reason}`,
                          timestamp: Date.now(),
                          status: 'success'
                        });

                        alert(`✅ Payment drowned and moved to DP Collection.`);
                      } catch (err: any) { alert("Error: " + err.message); }
                    }} className="flex-1 text-xs bg-purple-600 text-white px-3 py-2 rounded font-bold hover:bg-purple-700 transition-all">
                      Drown Payment
                    </button>
                    
                    <button onClick={async () => {
                      const reason = window.prompt("Reason for rejecting withdrawal (funds will be refunded to user's wallet):", "Details mismatch");
                      if (reason === null) return;
                      try {
                        const userRef = doc(db, 'users', w.userId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                          const currentBal = userSnap.data().deposits || 0;
                          const refundedBal = currentBal + w.amount;
                          await updateDoc(userRef, { deposits: refundedBal });

                          await addDoc(collection(db, 'transactions'), {
                            userId: w.userId,
                            username: w.username,
                            type: 'withdrawal_refund',
                            amount: w.amount,
                            description: `Withdrawal Rejected (${reason}) - Funds Refunded to Wallet`,
                            timestamp: Date.now(),
                            status: 'success',
                            balanceAfter: refundedBal
                          });
                        }
                        await updateDoc(doc(db, 'withdrawals', w.id), { 
                          status: 'rejected',
                          adminNote: reason,
                          processedAt: Date.now()
                        });
                        alert(`Withdrawal rejected. ₹${w.amount.toLocaleString()} refunded to user's wallet.`);
                      } catch (err: any) { alert("Error: " + err.message); }
                    }} className="flex-1 md:flex-none text-xs bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-all">
                      Reject & Refund
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Processed History</h3>
          {withdrawals.filter(w => w.status !== 'pending').length === 0 ? (
            <p className="text-gray-400 text-xs">No withdrawal history available yet.</p>
          ) : (
            <div className="space-y-3">
              {withdrawals.filter(w => w.status !== 'pending').sort((a,b)=> (b.processedAt || b.createdAt) - (a.processedAt || a.createdAt)).slice(0, 15).map(w => (
                <div key={w.id} className="border border-gray-100 p-4 rounded-xl flex justify-between items-center bg-gray-50/70">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{w.username}</span>
                      <span className="text-xs text-gray-500 font-bold">₹{w.amount.toLocaleString()}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      {w.payoutMethod === 'upi' ? `UPI: ${w.upiId || 'N/A'}` : `Bank: ${w.accountNumber || 'N/A'}`} • {new Date(w.createdAt).toLocaleDateString()}
                      {w.adminNote ? ` • Note: ${w.adminNote}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className={`px-3 py-1 text-xs rounded-full font-bold ${
                      w.status === 'approved' ? 'bg-green-100 text-green-700' : 
                      w.status === 'drowned' ? 'bg-purple-100 text-purple-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {w.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'tickets' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <h2 className="text-xl font-bold mb-4">Support Tickets</h2>
          {tickets.filter(t => currentUser.role === 'admin' || (currentUser.role === 'finance' && t.category === 'amount_related') || (currentUser.role === 'support' && t.category !== 'amount_related')).length === 0 ? <p className="text-gray-500">No tickets found for your role.</p> : (
            <div className="space-y-4">
              {tickets.filter(t => currentUser.role === 'admin' || (currentUser.role === 'finance' && t.category === 'amount_related') || (currentUser.role === 'support' && t.category !== 'amount_related')).map(t => (
                <div key={t.id} className="border p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{t.category ? t.category.replace('_', ' ') : 'General'}</span>
                      <h3 className="font-bold text-gray-900">{t.subject}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{t.description}</p>
                    <span className="text-xs text-gray-400 mt-2 block">User ID: {t.userId} | Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-2 py-1 text-xs rounded font-bold ${t.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>{t.status.toUpperCase()}</span>
                    {t.status === 'open' && (
                      <button onClick={() => handleUpdateTicket(t.id, 'closed')} className="text-xs bg-gray-900 text-white px-3 py-1 rounded">Close Ticket</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'chatting' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {activeChat ? `Chat with ${activeChat.username}` : chatFilterUser ? 'User Support Chats' : 'Live Support Chats'}
            </h2>
            {(activeChat || chatFilterUser) && (
              <button onClick={() => { activeChat ? setActiveChat(null) : setChatFilterUser(null); }} className="text-gray-500 hover:text-gray-900">
                &larr; Back
              </button>
            )}
          </div>
          {activeChat ? (
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 border rounded-t-lg space-y-4 flex flex-col">
                {activeChatMessages.map(m => (
                  <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${m.senderId === currentUser.id ? 'bg-red-600 text-white rounded-tr-none' : 'bg-gray-200 text-gray-900 rounded-tl-none'}`}>
                      <div className="text-xs opacity-75 mb-1">{m.senderRole}</div>
                      <p className="text-sm">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {activeChat.status !== 'closed' ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  addDoc(collection(db, 'support_chats', activeChat.id, 'messages'), {
                    chatId: activeChat.id,
                    senderId: currentUser.id,
                    senderRole: currentUser.role || 'admin',
                    text: chatInput,
                    timestamp: Date.now()
                  });
                  updateDoc(doc(db, 'support_chats', activeChat.id), {
                    updatedAt: Date.now(),
                    unreadCountUser: (activeChat.unreadCountUser || 0) + 1,
                    unreadCountAdmin: 0
                  });
                  setChatInput('');
                }} className="flex gap-2 p-4 border border-t-0 rounded-b-lg">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} type="text" placeholder="Type message..." className="flex-1 border rounded-lg px-4 py-2" />
                  <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold">Send</button>
                </form>
              ) : (
                <div className="p-4 border border-t-0 rounded-b-lg bg-gray-100 text-center text-gray-500">This chat is closed.</div>
              )}
            </div>
          ) : (
            supportChats.filter(c => chatFilterUser ? c.userId === chatFilterUser : true).length === 0 ? <p className="text-gray-500">No support chats found.</p> : (
              <div className="space-y-4">
                {supportChats.filter(c => chatFilterUser ? c.userId === chatFilterUser : true).map(c => (
                  <div key={c.id} className="border p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => {
                    setActiveChat(c);
                    if (c.unreadCountAdmin > 0) {
                      updateDoc(doc(db, 'support_chats', c.id), { unreadCountAdmin: 0 });
                    }
                  }}>
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <h3 className="font-bold text-gray-900">{c.username}</h3>
                        {c.unreadCountAdmin > 0 && <span className="w-2 h-2 bg-red-600 rounded-full"></span>}
                      </div>
                      <span className="text-xs text-gray-400 mt-2 block">User ID: {c.userId} | Last Updated: {new Date(c.updatedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className={`px-2 py-1 text-xs rounded font-bold ${c.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{c.status.toUpperCase()}</span>
                      {c.status !== 'closed' && <button onClick={(e) => { e.stopPropagation(); updateDoc(doc(db, 'support_chats', c.id), { status: 'closed' }); }} className="text-xs text-red-600 hover:underline">Close Chat</button>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : activeTab === 'appeals' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <h2 className="text-xl font-bold mb-4">Account & Verification Appeals</h2>
          {appeals.length === 0 ? <p className="text-gray-500">No appeals found.</p> : (
            <div className="space-y-4">
              {appeals.map(a => (
                <div key={a.id} className="border p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-2">{a.type === 'verification' ? 'Verification' : 'Suspension'}</span>
                    <p className="text-sm text-gray-900 font-medium mt-1">"{a.reason}"</p>
                    {a.type === 'verification' && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <p><strong>Email:</strong> {a.email}</p>
                        <p><strong>Phone:</strong> {a.phone}</p>
                        <p><strong>Documents:</strong> {a.documents}</p>
                      </div>
                    )}
                    <span className="text-xs text-gray-400 mt-2 block">User ID: {a.userId} | Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-2 py-1 text-xs rounded font-bold ${a.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{a.status.toUpperCase()}</span>
                    {a.status === 'pending' && (
                      <button onClick={() => handleUpdateAppeal(a.id, 'resolved', a.type === 'verification', a.userId)} className="text-xs bg-green-600 text-white px-3 py-1 rounded">
                        {a.type === 'verification' ? 'Approve Verification' : 'Mark Resolved'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'verifications' ? (
        <div className="space-y-6">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm animate-fade-in ${
              actionFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <span>{actionFeedback.type === 'success' ? '✓' : '⚠️'}</span>
                <span>{actionFeedback.message}</span>
              </div>
              <button 
                onClick={() => setActionFeedback(null)} 
                className="text-xs font-bold px-2 py-1 hover:bg-black/5 rounded-lg transition"
              >
                ✕
              </button>
            </div>
          )}

          {/* Header & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-gray-500 font-medium text-xs">Total Requests</span>
              <span className="text-3xl font-black text-gray-900 mt-1">{verifications.length}</span>
              <span className="text-[11px] text-gray-400 mt-1">All time KYC submissions</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/10 rounded-bl-full pointer-events-none"></div>
              <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">Pending Review</span>
              <span className="text-3xl font-black text-amber-600 mt-1">
                {verifications.filter(v => v.status === 'pending').length}
              </span>
              <span className="text-[11px] text-amber-700/70 mt-1">Awaiting staff action</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center">
              <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">Approved & Verified</span>
              <span className="text-3xl font-black text-emerald-600 mt-1">
                {verifications.filter(v => v.status === 'verified').length}
              </span>
              <span className="text-[11px] text-emerald-700/70 mt-1">Full auction privileges active</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center justify-center">
              <span className="text-red-600 font-bold text-xs uppercase tracking-wider">Rejected Submissions</span>
              <span className="text-3xl font-black text-red-600 mt-1">
                {verifications.filter(v => v.status === 'rejected').length}
              </span>
              <span className="text-[11px] text-red-700/70 mt-1">Requires user re-submission</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setVerificationFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  verificationFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({verifications.length})
              </button>
              <button
                onClick={() => setVerificationFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  verificationFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <span>Pending Review</span>
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                  {verifications.filter(v => v.status === 'pending').length}
                </span>
              </button>
              <button
                onClick={() => setVerificationFilter('verified')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  verificationFilter === 'verified' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Verified ({verifications.filter(v => v.status === 'verified').length})
              </button>
              <button
                onClick={() => setVerificationFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  verificationFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Rejected ({verifications.filter(v => v.status === 'rejected').length})
              </button>
            </div>

            {/* Search Box */}
            <div className="w-full md:w-72">
              <input
                type="text"
                value={verificationSearchQuery}
                onChange={(e) => setVerificationSearchQuery(e.target.value)}
                placeholder="Search name, username, PAN, ID..."
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Verifications List */}
          {verifications
            .filter(v => {
              if (verificationFilter !== 'all' && v.status !== verificationFilter) return false;
              if (!verificationSearchQuery.trim()) return true;
              const q = verificationSearchQuery.toLowerCase();
              return (
                (v.username || '').toLowerCase().includes(q) ||
                (v.userFullName || '').toLowerCase().includes(q) ||
                (v.userEmail || '').toLowerCase().includes(q) ||
                (v.panNumber || '').toLowerCase().includes(q) ||
                (v.nationalIdNumber || '').toLowerCase().includes(q)
              );
            })
            .length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <span className="text-4xl block mb-2">🛡️</span>
              <h3 className="text-lg font-bold text-gray-800">No Verification Requests Found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {verificationFilter === 'pending'
                  ? 'All verification requests have been processed! No pending items in queue.'
                  : 'No verification records match your current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {verifications
                .filter(v => {
                  if (verificationFilter !== 'all' && v.status !== verificationFilter) return false;
                  if (!verificationSearchQuery.trim()) return true;
                  const q = verificationSearchQuery.toLowerCase();
                  return (
                    (v.username || '').toLowerCase().includes(q) ||
                    (v.userFullName || '').toLowerCase().includes(q) ||
                    (v.userEmail || '').toLowerCase().includes(q) ||
                    (v.panNumber || '').toLowerCase().includes(q) ||
                    (v.nationalIdNumber || '').toLowerCase().includes(q)
                  );
                })
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 transition p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      
                      {/* Left: User & Identity Data */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-lg shadow-sm">
                            {req.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-gray-900 text-base">{req.userFullName || req.username}</h3>
                              <span className="text-xs text-gray-400 font-normal">(@{req.username})</span>
                              {req.status === 'verified' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <span>🛡️</span> Verified
                                </span>
                              )}
                              {req.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                  <span>⏳</span> Pending Review
                                </span>
                              )}
                              {req.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  <span>✕</span> Rejected
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-3">
                              <span>User ID: <span className="font-mono text-gray-700">{req.userId}</span></span>
                              {req.userEmail && <span>Email: <span className="text-gray-700">{req.userEmail}</span></span>}
                              <span>Submitted: <span className="text-gray-700">{new Date(req.submittedAt).toLocaleString()}</span></span>
                            </div>
                          </div>
                        </div>

                        {/* ID Document Details Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* PAN Card Data if present */}
                          {(req.documentType === 'pan_card' || req.documentType === 'both' || req.panNumber) && (
                            <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-100 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                  <span>💳</span> PAN Card
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-white text-red-700 px-2 py-0.5 rounded border border-red-200">
                                  {req.panNumber || 'N/A'}
                                </span>
                              </div>
                              <p className="text-gray-600 mt-1">Name on PAN: <strong className="text-gray-900">{req.panCardName || req.userFullName || 'N/A'}</strong></p>
                              {req.dob && <p className="text-gray-600">DOB: <strong className="text-gray-900">{req.dob}</strong></p>}
                            </div>
                          )}

                          {/* National ID Data if present */}
                          {(req.documentType === 'national_id' || req.documentType === 'both' || req.nationalIdNumber) && (
                            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                  <span>🪪</span> {req.nationalIdType || 'National ID Card'}
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                                  {req.nationalIdNumber || 'N/A'}
                                </span>
                              </div>
                              <p className="text-gray-600 mt-1">Name on ID: <strong className="text-gray-900">{req.nationalIdName || req.userFullName || 'N/A'}</strong></p>
                              {req.dob && <p className="text-gray-600">DOB: <strong className="text-gray-900">{req.dob}</strong></p>}
                            </div>
                          )}
                        </div>

                        {/* AI Pre-Validation Status */}
                        {req.aiNotes && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs flex items-start gap-2">
                            <span className="text-base mt-0.5">🤖</span>
                            <div>
                              <span className="font-bold text-gray-800">AI Pre-Scan Assessment: </span>
                              <span className="text-gray-600">{req.aiNotes}</span>
                              {req.aiConfidence && (
                                <span className="ml-2 font-bold text-emerald-600">({req.aiConfidence}% match score)</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Review Notes / Rejection Reason */}
                        {req.reviewNote && (
                          <p className="text-xs text-gray-500 italic">Staff Note: {req.reviewNote}</p>
                        )}
                        {req.rejectionReason && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                            <strong>Rejection Reason:</strong> {req.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Middle: Document Image Previews with Zoom */}
                      <div className="flex flex-wrap lg:flex-nowrap gap-3 items-center">
                        {req.panCardPhotoUrl && (
                          <div className="text-center">
                            <span className="block text-[10px] font-bold text-gray-500 mb-1">PAN CARD PHOTO</span>
                            <div 
                              onClick={() => setPreviewImage(req.panCardPhotoUrl || null)}
                              className="relative w-28 h-20 bg-gray-100 border border-gray-200 rounded-xl overflow-hidden cursor-zoom-in group shadow-sm hover:ring-2 hover:ring-red-400 transition"
                            >
                              <img src={req.panCardPhotoUrl} alt="PAN Card" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                🔍 Click to Zoom
                              </div>
                            </div>
                          </div>
                        )}

                        {req.nationalIdPhotoUrl && (
                          <div className="text-center">
                            <span className="block text-[10px] font-bold text-gray-500 mb-1">ID FRONT</span>
                            <div 
                              onClick={() => setPreviewImage(req.nationalIdPhotoUrl || null)}
                              className="relative w-28 h-20 bg-gray-100 border border-gray-200 rounded-xl overflow-hidden cursor-zoom-in group shadow-sm hover:ring-2 hover:ring-indigo-400 transition"
                            >
                              <img src={req.nationalIdPhotoUrl} alt="ID Front" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                🔍 Click to Zoom
                              </div>
                            </div>
                          </div>
                        )}

                        {req.nationalIdBackPhotoUrl && (
                          <div className="text-center">
                            <span className="block text-[10px] font-bold text-gray-500 mb-1">ID BACK</span>
                            <div 
                              onClick={() => setPreviewImage(req.nationalIdBackPhotoUrl || null)}
                              className="relative w-28 h-20 bg-gray-100 border border-gray-200 rounded-xl overflow-hidden cursor-zoom-in group shadow-sm hover:ring-2 hover:ring-indigo-400 transition"
                            >
                              <img src={req.nationalIdBackPhotoUrl} alt="ID Back" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                🔍 Click to Zoom
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Staff Action Buttons */}
                      <div className="flex flex-row lg:flex-col gap-2 justify-end lg:w-44 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveVerification(req)}
                              className="flex-1 lg:flex-none py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                            >
                              <span>✓</span>
                              <span>Approve & Verify</span>
                            </button>
                            <button
                              onClick={() => handleRejectVerification(req)}
                              className="flex-1 lg:flex-none py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition border border-red-200 flex items-center justify-center gap-1.5"
                            >
                              <span>✕</span>
                              <span>Reject Request</span>
                            </button>
                          </>
                        ) : req.status === 'verified' ? (
                          <div className="space-y-2 text-center lg:text-right">
                            <div className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                              ✓ Verified by {req.reviewedBy || 'Admin'}
                            </div>
                            {currentUser.role === 'admin' && (
                              <button
                                onClick={() => handleRevokeVerification(req.userId, req.username)}
                                className="w-full py-1.5 px-3 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-semibold rounded-lg transition"
                              >
                                Revoke Verification
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 text-center lg:text-right">
                            <div className="text-xs text-red-700 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                              ✕ Rejected
                            </div>
                            <button
                              onClick={() => handleApproveVerification(req)}
                              className="w-full py-1.5 px-3 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 text-xs font-semibold rounded-lg transition"
                            >
                              Re-evaluate & Approve
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : activeTab === 'content' ? (
        <AdminContentCMS currentUser={currentUser} />
      ) : activeTab === 'notifications' ? (
        <AdminNotifications currentUser={currentUser} users={users} />
      ) : activeTab === 'reports' ? (
        <AdminReports 
          currentUser={currentUser}
          users={users}
          vehicles={allVehicles}
          transactions={allTransactions}
          withdrawals={withdrawals}
        />
      ) : activeTab === 'audit' ? (
        <AdminAuditLogs />
      ) : activeTab === 'config' ? (
        <AdminAppConfig currentUser={currentUser} />
      ) : activeTab === 'coupons' ? (
        <AdminCoupons currentUser={currentUser} />
      ) : activeTab === 'vendors' ? (
        <AdminVendors currentUser={currentUser} users={users} />
      ) : activeTab === 'moderation' ? (
        <AdminModeration currentUser={currentUser} vehicles={allVehicles} />
      ) : activeTab === 'sessions' ? (
        <AdminSessions currentUser={currentUser} users={users} />
      ) : activeTab === 'version' ? (
        <AdminVersionControl currentUser={currentUser} />
      ) : null}

      {/* In-App Verification Action Modal (Approval / Rejection / Revoke) */}
      {verifActionModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => !isProcessingVerif && setVerifActionModal(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden border border-gray-100 animate-scale-up" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                  verifActionModal.type === 'approve'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : verifActionModal.type === 'reject'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}>
                  {verifActionModal.type === 'approve' ? '🛡️' : verifActionModal.type === 'reject' ? '✕' : '⚠️'}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base sm:text-lg">
                    {verifActionModal.type === 'approve' 
                      ? 'Approve Identity Verification' 
                      : verifActionModal.type === 'reject' 
                      ? 'Reject Verification Request' 
                      : 'Revoke User Verification'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    User: <strong className="text-gray-900">@{verifActionModal.username || verifActionModal.req?.username}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isProcessingVerif && setVerifActionModal(null)}
                disabled={isProcessingVerif}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4">
              {verifActionModal.type === 'approve' && (
                <div className="space-y-3.5">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs text-emerald-900 space-y-2">
                    <p className="font-semibold text-sm text-emerald-800 flex items-center gap-1.5">
                      <span>✓</span> Ready to Grant Verified Status
                    </p>
                    <p className="leading-relaxed">
                      Approving this request will immediately mark <strong>@{verifActionModal.username}</strong> as officially verified. The user will receive full platform privileges including:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-emerald-800">
                      <li>Placing live and auction bids without KYC limits</li>
                      <li>Listing vehicles for auction and direct sale</li>
                      <li>Verified badge (🛡️) shown on their profile and bids</li>
                    </ul>
                  </div>

                  {verifActionModal.req && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Document Type:</span>
                        <span className="font-bold text-gray-800 uppercase">{verifActionModal.req.documentType}</span>
                      </div>
                      {verifActionModal.req.panNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">PAN Number:</span>
                          <span className="font-mono font-bold text-gray-900">{verifActionModal.req.panNumber}</span>
                        </div>
                      )}
                      {verifActionModal.req.nationalIdNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">National ID ({verifActionModal.req.nationalIdType || 'ID'}):</span>
                          <span className="font-mono font-bold text-gray-900">{verifActionModal.req.nationalIdNumber}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {verifActionModal.type === 'reject' && (
                <div className="space-y-3.5">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Select a preset reason or enter custom feedback. This explanation will be sent directly to the user so they can correct their submission.
                  </p>

                  {/* Preset reason chips */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Quick Preset Reasons:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Document photo was blurry or unreadable',
                        'Name does not match identity card',
                        'Invalid PAN or National ID number',
                        'Both front and back photos required',
                        'Document appears expired or altered'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectReason(preset)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition text-left font-medium ${
                            rejectReason === preset
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom reason textarea */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Rejection Reason / Notes to User:
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain why the verification could not be approved..."
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              {verifActionModal.type === 'revoke' && (
                <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                  <p className="font-bold text-sm text-amber-800">
                    Are you sure you want to revoke verification?
                  </p>
                  <p className="leading-relaxed">
                    User <strong>@{verifActionModal.username}</strong> will lose verified status. Their bidding and vehicle listing access will be paused until they submit a new verification document and receive approval.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setVerifActionModal(null)}
                disabled={isProcessingVerif}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl text-xs sm:text-sm transition active:scale-98 disabled:opacity-50"
              >
                Cancel
              </button>
              
              {verifActionModal.type === 'approve' && (
                <button
                  type="button"
                  onClick={() => verifActionModal.req && executeApproveVerification(verifActionModal.req)}
                  disabled={isProcessingVerif}
                  className="flex-[1.4] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs sm:text-sm transition shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingVerif ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Confirm & Approve</span>
                    </>
                  )}
                </button>
              )}

              {verifActionModal.type === 'reject' && (
                <button
                  type="button"
                  onClick={() => verifActionModal.req && executeRejectVerification(verifActionModal.req, rejectReason)}
                  disabled={isProcessingVerif || !rejectReason.trim()}
                  className="flex-[1.4] py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs sm:text-sm transition shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingVerif ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <>
                      <span>✕</span>
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              )}

              {verifActionModal.type === 'revoke' && (
                <button
                  type="button"
                  onClick={() => verifActionModal.userId && executeRevokeVerification(verifActionModal.userId, verifActionModal.username || 'User')}
                  disabled={isProcessingVerif}
                  className="flex-[1.4] py-3 bg-gray-900 hover:bg-black text-white font-extrabold rounded-xl text-xs sm:text-sm transition shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingVerif ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <span>Confirm Revocation</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom / Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-4 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center p-2 bg-gray-900 rounded-2xl">
              <img src={previewImage} alt="Document High-Res Preview" className="max-w-full max-h-full object-contain rounded-xl" />
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-gray-500 px-2">
              <span>AutoBid Identity Verification Document Inspector</span>
              <button 
                onClick={() => setPreviewImage(null)} 
                className="px-4 py-1.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
