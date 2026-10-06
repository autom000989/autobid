import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot, setDoc } from '../../firebase';
import { AppConfig, User } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminAppConfigProps {
  currentUser: User;
}

export const AdminAppConfig: React.FC<AdminAppConfigProps> = ({ currentUser }) => {
  const [config, setConfig] = useState<AppConfig>({
    commissionRatePercent: 5,
    minBidIncrement: 5000,
    defaultLiveBidMinutes: 120,
    maintenanceMode: false,
    maintenanceMessage: 'AutoBid platform is undergoing scheduled engine optimization. We will be back online shortly.',
    allowDirectBuy: true,
    requireKycToBid: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app_config'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as AppConfig;
        setConfig(prev => ({ ...prev, ...d }));
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'app_config'), {
        ...config,
        updatedAt: Date.now(),
        updatedBy: currentUser.email || currentUser.username
      });
      await logAdminAction(
        currentUser,
        'UPDATE_APP_CONFIG',
        'settings',
        'app_config',
        `Commission=${config.commissionRatePercent}%, MinBid=₹${config.minBidIncrement}, MaintMode=${config.maintenanceMode}`
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert('Failed to save configuration: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 11: Feature Flags & App Configuration</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Control platform fees, auction thresholds, maintenance mode, and business rules dynamically with zero app restarts.
          </p>
        </div>
        {savedSuccess && (
          <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-fade-in">
            ✓ Settings applied live to platform!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span>⚙️</span> Auction Economics & Commission Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Platform Commission Fee (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={config.commissionRatePercent}
                  onChange={(e) => setConfig(prev => ({ ...prev, commissionRatePercent: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gray-900 outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Deducted from winning seller payouts.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Minimum Bid Increment (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={config.minBidIncrement}
                  onChange={(e) => setConfig(prev => ({ ...prev, minBidIncrement: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gray-900 outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">INR</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Smallest incremental amount allowed above previous bid.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Default Live Auction Window (Mins)
              </label>
              <input
                type="number"
                min="10"
                max="1440"
                step="10"
                value={config.defaultLiveBidMinutes}
                onChange={(e) => setConfig(prev => ({ ...prev, defaultLiveBidMinutes: parseInt(e.target.value) || 120 }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gray-900 outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Default intense live bidding duration.</p>
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span>🚩</span> Feature Toggles (Kill Switches)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex items-start justify-between">
              <div>
                <h4 className="font-bold text-xs text-gray-900">Direct "Buy Now" Mode</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Allows sellers to list cars with fixed Buy Now direct pricing without waiting for auction countdown.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={config.allowDirectBuy}
                  onChange={(e) => setConfig(prev => ({ ...prev, allowDirectBuy: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex items-start justify-between">
              <div>
                <h4 className="font-bold text-xs text-gray-900">Mandatory KYC Before Bidding</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Requires verified PAN / National ID before any user can submit bids on vehicles.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={config.requireKycToBid}
                  onChange={(e) => setConfig(prev => ({ ...prev, requireKycToBid: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Maintenance Mode Emergency Controls */}
        <div className={`p-6 rounded-2xl border transition-all ${config.maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.maintenanceMode ? '🚨' : '🛡️'}</span>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Platform Maintenance Mode</h3>
                <p className="text-xs text-gray-500">Locks public auctions and displays emergency maintenance notice to regular users.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          {config.maintenanceMode && (
            <div className="space-y-2 mt-4 pt-4 border-t border-red-200/60 animate-fade-in">
              <label className="block text-xs font-bold text-red-900">Custom Maintenance Message Displayed to Visitors</label>
              <textarea
                rows={2}
                value={config.maintenanceMessage}
                onChange={(e) => setConfig(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none text-red-900"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Deploying Config...' : 'Save & Deploy App Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
