import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot, setDoc } from '../../firebase';
import { AppVersionInfo, User } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminVersionControlProps {
  currentUser: User;
}

export const AdminVersionControl: React.FC<AdminVersionControlProps> = ({ currentUser }) => {
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo>({
    currentVersion: '2.4.0',
    minRequiredVersion: '2.3.0',
    forceUpdateEnabled: false,
    updateMessage: 'A critical real-time auction performance update has been deployed. Please reload the page to apply the latest security patches.',
    lastUpdated: Date.now()
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'version_control'), (snap) => {
      if (snap.exists()) {
        setVersionInfo(snap.data() as AppVersionInfo);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'version_control'), {
        ...versionInfo,
        lastUpdated: Date.now(),
        updatedBy: currentUser.email || currentUser.username
      });
      await logAdminAction(
        currentUser,
        'UPDATE_VERSION_POLICY',
        'settings',
        'version_control',
        `Current: ${versionInfo.currentVersion}, Min: ${versionInfo.minRequiredVersion}, ForceUpdate: ${versionInfo.forceUpdateEnabled}`
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Error updating version control: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBroadcastReload = async () => {
    if (!window.confirm('Broadcast an immediate client update ping to all active browser sessions?')) return;
    try {
      await setDoc(doc(db, 'settings', 'version_control'), {
        ...versionInfo,
        reloadTriggerTimestamp: Date.now(),
        lastUpdated: Date.now()
      });
      await logAdminAction(
        currentUser,
        'TRIGGER_CLIENT_RELOAD_PING',
        'settings',
        'version_control',
        'Triggered live client reload signal'
      );
      alert('Broadcast signal sent! Active client instances will sync.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 16: Force-Update & App Version Control</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enforce mandatory client app versions, push critical security patches, and prevent outdated clients from interacting with live auctions.
          </p>
        </div>
        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            ✓ Version policy updated!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span>🏷️</span> Semantic Version Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Current Production Version
              </label>
              <input
                type="text"
                required
                value={versionInfo.currentVersion}
                onChange={(e) => setVersionInfo(prev => ({ ...prev, currentVersion: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="2.4.0"
              />
              <p className="text-[10px] text-gray-400 mt-1">Latest stable release deployed to users.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Minimum Required Version (Hard Floor)
              </label>
              <input
                type="text"
                required
                value={versionInfo.minRequiredVersion}
                onChange={(e) => setVersionInfo(prev => ({ ...prev, minRequiredVersion: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="2.3.0"
              />
              <p className="text-[10px] text-gray-400 mt-1">Clients running versions below this will be prompted to refresh/update.</p>
            </div>
          </div>
        </div>

        {/* Force Update Toggle */}
        <div className={`p-6 rounded-2xl border transition-all ${versionInfo.forceUpdateEnabled ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200 shadow-xs'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Force-Update Hard Gate</h3>
              <p className="text-xs text-gray-500">When enabled, any client running below minimum version is blocked from bidding until they reload.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={versionInfo.forceUpdateEnabled}
                onChange={(e) => setVersionInfo(prev => ({ ...prev, forceUpdateEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-2">
            <label className="block text-xs font-bold text-gray-700">Client Update Prompt Notice</label>
            <textarea
              rows={2}
              value={versionInfo.updateMessage}
              onChange={(e) => setVersionInfo(prev => ({ ...prev, updateMessage: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleBroadcastReload}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <span>⚡</span> Broadcast Live Client Refresh Signal
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Updating...' : 'Publish Version Policy'}
          </button>
        </div>
      </form>
    </div>
  );
};
