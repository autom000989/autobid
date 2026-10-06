import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, getDocs, onSnapshot, query, orderBy } from '../../firebase';
import { User } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminNotificationsProps {
  currentUser: User;
  users: User[];
}

export const AdminNotifications: React.FC<AdminNotificationsProps> = ({ currentUser, users }) => {
  const [targetAudience, setTargetAudience] = useState<'all' | 'bidders' | 'sellers' | 'admins'>('all');
  const [notifType, setNotifType] = useState<'announcement' | 'promo' | 'alert' | 'system'>('announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionLink, setActionLink] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'broadcast_history'), orderBy('sentAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setBroadcastHistory(list);
    }, (err) => console.warn('Broadcast history fetch error:', err));
    return () => unsub();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      // Determine recipient user list
      let recipientUsers = [...users];
      if (targetAudience === 'bidders') {
        recipientUsers = users.filter(u => (u.deposits || 0) > 0 || u.role === 'user');
      } else if (targetAudience === 'sellers') {
        recipientUsers = users.filter(u => u.isVerified);
      } else if (targetAudience === 'admins') {
        recipientUsers = users.filter(u => u.role === 'admin' || u.role === 'finance' || u.role === 'support');
      }

      // If no users registered in filtered segment yet, still record broadcast
      const recipientCount = recipientUsers.length;

      // Dispatch in-app notification to each target user in Firestore
      const sendPromises = recipientUsers.map(u => 
        addDoc(collection(db, 'notifications'), {
          userId: u.id,
          title,
          message,
          type: notifType,
          read: false,
          createdAt: Date.now(),
          link: actionLink || 'home',
          broadcast: true
        })
      );

      await Promise.all(sendPromises);

      // Record broadcast history
      await addDoc(collection(db, 'broadcast_history'), {
        title,
        message,
        targetAudience,
        notifType,
        recipientCount,
        sentBy: currentUser.email || currentUser.username,
        sentAt: Date.now()
      });

      await logAdminAction(
        currentUser,
        'DISPATCH_BROADCAST_NOTIFICATION',
        'notifications',
        targetAudience,
        `Dispatched "${title}" to ${recipientCount} recipients (${targetAudience})`
      );

      alert(`Notification broadcast dispatched successfully to ${recipientCount} users!`);
      setTitle('');
      setMessage('');
      setActionLink('');
    } catch (err: any) {
      alert('Failed to send broadcast: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 4: Push & In-App Notifications</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Reach users directly with announcements, auction countdowns, or promo deals on demand without developer scripts.
          </p>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Active Audience Base: <strong className="text-gray-900">{users.length} Registered Users</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Composer */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span>✍️</span> Compose New Notification
          </h3>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Audience Segment</label>
                <select
                  value={targetAudience}
                  onChange={(e: any) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All Registered Platform Users ({users.length})</option>
                  <option value="bidders">Active Bidders & Buyers</option>
                  <option value="sellers">Verified Vehicle Sellers</option>
                  <option value="admins">Admin & Operations Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notification Priority & Type</label>
                <select
                  value={notifType}
                  onChange={(e: any) => setNotifType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="announcement">📢 Platform Announcement</option>
                  <option value="promo">🎁 Promotion / Discount Deal</option>
                  <option value="alert">⚠️ Important Alert / Live Auction</option>
                  <option value="system">⚙️ System Maintenance Update</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Notification Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. 🏎️ Supercar Sunday: Rare Ferrari & Porsche Live Bidding Starting Now!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Message Body *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter message details that will appear in the user's notification center and push banner..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Navigation Action Link (Optional)</label>
              <input
                type="text"
                placeholder="e.g. /auctions or /settings"
                value={actionLink}
                onChange={(e) => setActionLink(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Broadcasting...
                  </>
                ) : (
                  <>
                    <span>🚀</span> Dispatch Broadcast
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Notification Preview */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">📱 Live Mobile / Web Preview</h3>
            <p className="text-xs text-gray-500">How recipients will experience this alert in their notification bell:</p>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="font-bold text-red-600 flex items-center gap-1">
                  <span>🔔</span> AutoBid Alert
                </span>
                <span>Just now</span>
              </div>
              <h4 className="font-bold text-gray-900 text-xs">
                {title || 'Your Notification Title Here'}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {message || 'The notification body and instructions will display here for users to read immediately.'}
              </p>
              {actionLink && (
                <div className="text-[11px] font-semibold text-blue-600 underline">
                  Tap to view →
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
            <strong>Delivery Rule:</strong> In-app alerts are saved in real-time Firestore with zero lag. All signed-in members will see the bell indicator increment immediately.
          </div>
        </div>
      </div>

      {/* Broadcast History */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-gray-900 text-sm">📜 Sent Broadcast History</h3>
        {broadcastHistory.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No broadcasts sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Title & Message</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Recipients</th>
                  <th className="py-2.5 px-3">Sent By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {broadcastHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 whitespace-nowrap text-gray-500">
                      {new Date(item.sentAt).toLocaleDateString()} {new Date(item.sentAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 max-w-sm">
                      <div className="font-bold text-gray-900">{item.title}</div>
                      <div className="text-gray-500 text-[11px] truncate">{item.message}</div>
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {item.targetAudience}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-600">
                      {item.recipientCount} users
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                      {item.sentBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
