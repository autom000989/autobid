import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, addDoc, updateDoc, doc } from '../../firebase';
import { DealerPartner, User } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminVendorsProps {
  currentUser: User;
  users: User[];
}

export const AdminVendors: React.FC<AdminVendorsProps> = ({ currentUser, users }) => {
  const [dealers, setDealers] = useState<DealerPartner[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDealer, setNewDealer] = useState({
    userId: '',
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    dealerLicense: '',
    taxId: '',
    tier: 'Gold' as 'Silver' | 'Gold' | 'Platinum'
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dealers'), (snap) => {
      const list: DealerPartner[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as DealerPartner));
      setDealers(list);
    });
    return () => unsub();
  }, []);

  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealer.businessName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'dealers'), {
        ...newDealer,
        isVerified: true,
        status: 'active',
        activeListingsCount: 0,
        totalGmv: 0,
        rating: 5.0,
        joinedAt: Date.now()
      });

      // Also if linked to a user, mark user as verified dealership
      if (newDealer.userId) {
        await updateDoc(doc(db, 'users', newDealer.userId), {
          isVerified: true,
          verificationStatus: 'verified',
          dealerId: docRef.id
        });
      }

      await logAdminAction(
        currentUser,
        'ONBOARD_DEALERSHIP',
        'dealers',
        docRef.id,
        `Onboarded dealer ${newDealer.businessName} (Tier: ${newDealer.tier})`
      );

      setShowAddModal(false);
      setNewDealer({
        userId: '',
        businessName: '',
        ownerName: '',
        email: '',
        phone: '',
        dealerLicense: '',
        taxId: '',
        tier: 'Gold'
      });
      alert(`Dealership partner ${newDealer.businessName} onboarded successfully!`);
    } catch (err: any) {
      alert('Failed to onboard dealership: ' + err.message);
    }
  };

  const handleToggleTier = async (dealer: DealerPartner, tier: 'Silver' | 'Gold' | 'Platinum') => {
    try {
      await updateDoc(doc(db, 'dealers', dealer.id), { tier });
      await logAdminAction(currentUser, 'UPDATE_DEALER_TIER', 'dealers', dealer.id, `Changed tier to ${tier} for ${dealer.businessName}`);
    } catch (err: any) {
      alert('Failed to update tier: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 13: Vendor & Partner Management</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Centralized hub for onboarding, verifying, and tracking auto dealerships, commercial fleet sellers, and partners.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Onboard Certified Dealership
        </button>
      </div>

      {/* Dealers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Certified Dealership Partners ({dealers.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Dealership Business</th>
                <th className="py-3 px-4">Owner & Contact</th>
                <th className="py-3 px-4">License / GSTIN</th>
                <th className="py-3 px-4">Partner Tier</th>
                <th className="py-3 px-4">Inventory / GMV</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dealers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        🏢
                      </div>
                      <p className="font-semibold text-gray-700 text-sm">No commercial dealerships onboarded yet</p>
                      <p className="text-[11px] text-gray-400">Onboard high-volume car dealers to scale platform inventory.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                dealers.map((dealer) => (
                  <tr key={dealer.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <span>{dealer.businessName}</span>
                        <span className="text-blue-500 text-xs" title="Certified Partner">✓</span>
                      </div>
                      <div className="text-[11px] text-gray-400">Member since {new Date(dealer.joinedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{dealer.ownerName}</div>
                      <div className="text-[11px] text-gray-500">{dealer.email}</div>
                      <div className="text-[11px] text-gray-400">{dealer.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                      <div>Lic: {dealer.dealerLicense || 'N/A'}</div>
                      <div>GST: {dealer.taxId || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={dealer.tier}
                        onChange={(e: any) => handleToggleTier(dealer, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase outline-none ${
                          dealer.tier === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                          dealer.tier === 'Gold' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="Silver">Silver Tier</option>
                        <option value="Gold">Gold Partner</option>
                        <option value="Platinum">Platinum VIP</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{dealer.activeListingsCount || 0} active cars</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">₹{(dealer.totalGmv || 0).toLocaleString()} GMV</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {dealer.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => alert(`Dealership performance metrics:\nRating: ${dealer.rating}/5.0\nInventory: ${dealer.activeListingsCount}\nTotal GMV: ₹${dealer.totalGmv}`)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        Performance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Dealership Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">Onboard Certified Dealership Partner</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateDealer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dealership Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Pre-Owned Motor Group"
                  value={newDealer.businessName}
                  onChange={(e) => setNewDealer(prev => ({ ...prev, businessName: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Owner / Representative Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajiv Khanna"
                    value={newDealer.ownerName}
                    onChange={(e) => setNewDealer(prev => ({ ...prev, ownerName: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Link Platform Account (Optional)</label>
                  <select
                    value={newDealer.userId}
                    onChange={(e) => {
                      const u = users.find(usr => usr.id === e.target.value);
                      setNewDealer(prev => ({
                        ...prev,
                        userId: e.target.value,
                        email: u?.email || prev.email,
                        ownerName: u?.fullName || prev.ownerName
                      }));
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="">Select registered user...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username} ({u.email || u.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="dealers@apexmotors.in"
                    value={newDealer.email}
                    onChange={(e) => setNewDealer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={newDealer.phone}
                    onChange={(e) => setNewDealer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dealer License</label>
                  <input
                    type="text"
                    placeholder="DL-2026-X99"
                    value={newDealer.dealerLicense}
                    onChange={(e) => setNewDealer(prev => ({ ...prev, dealerLicense: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">GST / Tax ID</label>
                  <input
                    type="text"
                    placeholder="07AAAAA0000A1Z5"
                    value={newDealer.taxId}
                    onChange={(e) => setNewDealer(prev => ({ ...prev, taxId: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tier Level</label>
                  <select
                    value={newDealer.tier}
                    onChange={(e: any) => setNewDealer(prev => ({ ...prev, tier: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Silver">Silver Tier</option>
                    <option value="Gold">Gold Partner</option>
                    <option value="Platinum">Platinum VIP</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-xs"
                >
                  Onboard Dealership
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
