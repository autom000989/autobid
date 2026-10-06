import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from '../../firebase';
import { Coupon, User } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminCouponsProps {
  currentUser: User;
}

export const AdminCoupons: React.FC<AdminCouponsProps> = ({ currentUser }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'flat',
    value: 20,
    maxUses: 100,
    daysValid: 30,
    description: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coupons'), (snap) => {
      const list: Coupon[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Coupon));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setCoupons(list);
    });
    return () => unsub();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCoupon.code.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      const expiresAt = Date.now() + newCoupon.daysValid * 86400000;
      const docRef = await addDoc(collection(db, 'coupons'), {
        code: cleanCode,
        discountType: newCoupon.discountType,
        value: newCoupon.value,
        maxUses: newCoupon.maxUses,
        usedCount: 0,
        expiresAt,
        isActive: true,
        description: newCoupon.description,
        createdAt: Date.now()
      });

      await logAdminAction(
        currentUser,
        'CREATE_COUPON',
        'coupons',
        docRef.id,
        `Created promo code ${cleanCode}: ${newCoupon.value}${newCoupon.discountType === 'percent' ? '%' : ' INR'} off`
      );

      setShowAddModal(false);
      setNewCoupon({
        code: '',
        discountType: 'percent',
        value: 20,
        maxUses: 100,
        daysValid: 30,
        description: ''
      });
      alert(`Coupon code ${cleanCode} created successfully!`);
    } catch (err: any) {
      alert('Failed to create coupon: ' + err.message);
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        isActive: !coupon.isActive
      });
      await logAdminAction(currentUser, 'TOGGLE_COUPON', 'coupons', coupon.id, `Set isActive=${!coupon.isActive} for ${coupon.code}`);
    } catch (err: any) {
      alert('Failed to toggle coupon: ' + err.message);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon code ${coupon.code}?`)) return;
    try {
      await deleteDoc(doc(db, 'coupons', coupon.id));
      await logAdminAction(currentUser, 'DELETE_COUPON', 'coupons', coupon.id, `Deleted coupon code ${coupon.code}`);
    } catch (err: any) {
      alert('Failed to delete coupon: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 12: Coupons & Discount Management</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Empower growth and marketing teams to schedule discounts, fee waivers, and promo codes without hardcoding developer logic.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Promo Code
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Active & Scheduled Promotions ({coupons.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Discount Value</th>
                <th className="py-3 px-4">Usage (Used / Max)</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        🎟️
                      </div>
                      <p className="font-semibold text-gray-700 text-sm">No promotional codes created yet</p>
                      <p className="text-[11px] text-gray-400">Click "Create Promo Code" to launch marketing campaigns.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isExpired = Date.now() > coupon.expiresAt;
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2 py-0.5 rounded-lg inline-block">
                          {coupon.code}
                        </div>
                        {coupon.description && (
                          <div className="text-[11px] text-gray-500 mt-0.5">{coupon.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 text-sm">
                        {coupon.discountType === 'percent' ? `${coupon.value}% OFF` : `₹${coupon.value} FLAT OFF`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">
                          {coupon.usedCount || 0} / {coupon.maxUses} uses
                        </div>
                        <div className="w-24 bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, ((coupon.usedCount || 0) / coupon.maxUses) * 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(coupon.expiresAt).toLocaleDateString()}
                        {isExpired && <span className="block text-[10px] text-red-500 font-bold uppercase">Expired</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${coupon.isActive && !isExpired ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                          {coupon.isActive && !isExpired ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleToggleCoupon(coupon)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700"
                        >
                          {coupon.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">Generate Discount Coupon Code</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIPSELLER20"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none uppercase focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e: any) => setNewCoupon(prev => ({ ...prev, discountType: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="percent">Percentage (%) Off</option>
                    <option value="flat">Flat Amount (₹) Off</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCoupon.maxUses}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, maxUses: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCoupon.daysValid}
                    onChange={(e) => setNewCoupon(prev => ({ ...prev, daysValid: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Internal Description / Campaign</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali festive seller commission waiver"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                />
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
                  Launch Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
