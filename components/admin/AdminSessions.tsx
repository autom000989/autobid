import React, { useState } from 'react';
import { db, doc, updateDoc } from '../../firebase';
import { User } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminSessionsProps {
  currentUser: User;
  users: User[];
}

export const AdminSessions: React.FC<AdminSessionsProps> = ({ currentUser, users }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForRevoke, setSelectedUserForRevoke] = useState<User | null>(null);

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  });

  const handleForceLogout = async (user: User) => {
    if (!window.confirm(`Force sign out all active devices for @${user.username}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        sessionRevokedAt: Date.now()
      });
      await logAdminAction(
        currentUser,
        'FORCE_LOGOUT_USER',
        'users',
        user.id,
        `Revoked active login sessions for @${user.username} (${user.email || user.id})`
      );
      alert(`All active sessions for @${user.username} have been terminated.`);
    } catch (err: any) {
      alert('Failed to revoke sessions: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 15: Session & Device Management</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Security command tool to inspect connected devices, track login origins, and terminate compromised sessions instantly.
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          Tracking <strong className="text-gray-900">{users.length} User Accounts</strong>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by username, email, or user UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gray-900"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Users & Sessions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status & Devices</th>
                <th className="py-3 px-4">Last Session Revoke</th>
                <th className="py-3 px-4 text-right">Security Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">@{user.username}</div>
                      <div className="text-[11px] text-gray-500">{user.email || 'No email attached'}</div>
                      <div className="text-[10px] font-mono text-gray-400">UID: {user.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Active Session
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Web Browser / Mobile App
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {(user as any).sessionRevokedAt ? (
                        <div>{new Date((user as any).sessionRevokedAt).toLocaleString()}</div>
                      ) : (
                        <span className="text-gray-400">Never revoked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleForceLogout(user)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors"
                      >
                        Force Sign Out All Devices
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
