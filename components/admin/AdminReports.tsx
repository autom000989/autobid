import React, { useState } from 'react';
import { User, Vehicle } from '../../types';

interface AdminReportsProps {
  users: User[];
  vehicles: Vehicle[];
  transactions: any[];
  withdrawals: any[];
  currentUser: User;
}

export const AdminReports: React.FC<AdminReportsProps> = ({
  users,
  vehicles,
  transactions,
  withdrawals,
  currentUser
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');

  const filterByTime = (timestamp?: number) => {
    if (timeRange === 'all' || !timestamp) return true;
    const now = Date.now();
    const diff = now - timestamp;
    if (timeRange === '7d') return diff <= 7 * 86400000;
    if (timeRange === '30d') return diff <= 30 * 86400000;
    return true;
  };

  const filteredUsers = users.filter(u => filterByTime(u.createdAt));
  const filteredVehicles = vehicles.filter(v => filterByTime(v.listedAt || v.startTime));
  const filteredTransactions = transactions.filter(t => filterByTime(t.timestamp));
  const filteredWithdrawals = withdrawals.filter(w => filterByTime(w.createdAt));

  const totalDeposits = filteredTransactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCommissions = filteredTransactions
    .filter(t => t.type === 'commission' || t.type === 'admin_deduct' || t.type === 'fee')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalPayouts = filteredWithdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const downloadFile = (content: string, filename: string, type: 'text/csv' | 'application/json') => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 1. Export Users
  const exportUsersCSV = () => {
    const headers = ['User ID', 'Username', 'Email', 'Full Name', 'Role', 'Verified', 'Verification Status', 'Deposit Balance (INR)', 'Created At'];
    const rows = filteredUsers.map(u => [
      `"${u.id}"`,
      `"${u.username}"`,
      `"${u.email || ''}"`,
      `"${u.fullName || ''}"`,
      u.role || 'user',
      u.isVerified ? 'YES' : 'NO',
      u.verificationStatus || 'unverified',
      u.deposits || 0,
      new Date(u.createdAt || Date.now()).toISOString()
    ]);
    downloadFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `users_report_${timeRange}_${Date.now()}.csv`, 'text/csv');
  };

  // 2. Export Vehicles
  const exportVehiclesCSV = () => {
    const headers = ['Vehicle ID', 'Make', 'Model', 'Year', 'Listing Type', 'Starting Price', 'Current Bid', 'Direct Price', 'Status', 'Owner ID', 'Views', 'Watch Count', 'Listed At'];
    const rows = filteredVehicles.map(v => [
      `"${v.id}"`,
      `"${v.make}"`,
      `"${v.model}"`,
      v.year,
      v.listingType || 'auction',
      v.startingPrice || 0,
      v.currentBid || 0,
      v.directPrice || 0,
      v.status,
      `"${v.ownerId || ''}"`,
      v.views || 0,
      v.watchCount || 0,
      v.listedAt ? new Date(v.listedAt).toISOString() : ''
    ]);
    downloadFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `vehicles_inventory_report_${timeRange}_${Date.now()}.csv`, 'text/csv');
  };

  // 3. Export Transactions
  const exportTransactionsCSV = () => {
    const headers = ['Transaction ID', 'User ID', 'Username', 'Type', 'Amount (INR)', 'Description', 'Status', 'Timestamp'];
    const rows = filteredTransactions.map(t => [
      `"${t.id || ''}"`,
      `"${t.userId || ''}"`,
      `"${t.username || ''}"`,
      t.type || 'transaction',
      t.amount || 0,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.status || 'success',
      new Date(t.timestamp || Date.now()).toISOString()
    ]);
    downloadFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `transactions_ledger_${timeRange}_${Date.now()}.csv`, 'text/csv');
  };

  // 4. Export Executive Financial Summary (JSON)
  const exportExecutiveSummaryJSON = () => {
    const summary = {
      generatedAt: new Date().toISOString(),
      generatedBy: currentUser.email,
      timeRange,
      kpis: {
        totalUsers: filteredUsers.length,
        totalVehicles: filteredVehicles.length,
        liveAuctionsCount: filteredVehicles.filter(v => v.status === 'Live Auction').length,
        totalDepositsVolume: totalDeposits,
        totalCommissionsCollected: totalCommissions,
        totalPayoutsApproved: totalPayouts,
        netPlatformTreasury: totalDeposits + totalCommissions - totalPayouts
      }
    };
    downloadFile(JSON.stringify(summary, null, 2), `executive_summary_${timeRange}_${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 5: Reports & Business Exports</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Generate one-click auditor and founder reports without waiting on developer queries or writing SQL.
          </p>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${timeRange === '7d' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${timeRange === '30d' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${timeRange === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Deposits Volume</span>
          <div className="text-xl font-black text-gray-900 mt-1">₹{totalDeposits.toLocaleString()}</div>
          <span className="text-[10px] text-gray-400">Total inward funds</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Commissions</span>
          <div className="text-xl font-black text-emerald-600 mt-1">₹{totalCommissions.toLocaleString()}</div>
          <span className="text-[10px] text-gray-400">Net revenue earned</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Approved Payouts</span>
          <div className="text-xl font-black text-amber-600 mt-1">₹{totalPayouts.toLocaleString()}</div>
          <span className="text-[10px] text-gray-400">Withdrawn to bank</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Inventory</span>
          <div className="text-xl font-black text-blue-600 mt-1">{filteredVehicles.length} cars</div>
          <span className="text-[10px] text-gray-400">Across all auctions</span>
        </div>
      </div>

      {/* Downloadable Reports Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Report 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">👥</span>
              <h3 className="font-bold text-gray-900 text-sm">Master User & KYC Register</h3>
            </div>
            <p className="text-xs text-gray-500">
              Complete list of all registered buyers and sellers, verification status, contact info, wallet balances, and roles.
            </p>
            <div className="text-[11px] text-gray-400 font-semibold pt-1">
              Includes {filteredUsers.length} user records
            </div>
          </div>
          <button
            onClick={exportUsersCSV}
            className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            <span>📥</span> Download Users Report (CSV)
          </button>
        </div>

        {/* Report 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚗</span>
              <h3 className="font-bold text-gray-900 text-sm">Vehicle & Auction Activity Report</h3>
            </div>
            <p className="text-xs text-gray-500">
              Detailed inventory listing covering reserve prices, current bids, auction durations, views, and ownership status.
            </p>
            <div className="text-[11px] text-gray-400 font-semibold pt-1">
              Includes {filteredVehicles.length} vehicle records
            </div>
          </div>
          <button
            onClick={exportVehiclesCSV}
            className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            <span>📥</span> Download Inventory Report (CSV)
          </button>
        </div>

        {/* Report 3 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <h3 className="font-bold text-gray-900 text-sm">Transactions & Treasury Ledger</h3>
            </div>
            <p className="text-xs text-gray-500">
              Line-item log of all Razorpay deposits, listing fees, refunds, and withdrawal payout settlements.
            </p>
            <div className="text-[11px] text-gray-400 font-semibold pt-1">
              Includes {filteredTransactions.length} transaction entries
            </div>
          </div>
          <button
            onClick={exportTransactionsCSV}
            className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            <span>📥</span> Download Ledger (CSV)
          </button>
        </div>

        {/* Report 4 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="font-bold text-gray-900 text-sm">Investor & Executive Summary (JSON)</h3>
            </div>
            <p className="text-xs text-gray-500">
              Clean machine-readable metrics dataset ready for investor pitch decks, audit compliance, or financial forecasting.
            </p>
            <div className="text-[11px] text-gray-400 font-semibold pt-1">
              Comprehensive platform metrics dataset
            </div>
          </div>
          <button
            onClick={exportExecutiveSummaryJSON}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            <span>📦</span> Download Executive Summary (JSON)
          </button>
        </div>
      </div>
    </div>
  );
};
