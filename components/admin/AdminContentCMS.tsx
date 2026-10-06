import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc } from '../../firebase';
import { ContentBanner, User } from '../../types';
import { logAdminAction } from './adminAuditHelper';

interface AdminContentCMSProps {
  currentUser: User;
}

export const AdminContentCMS: React.FC<AdminContentCMSProps> = ({ currentUser }) => {
  const [banners, setBanners] = useState<ContentBanner[]>([]);
  const [announcement, setAnnouncement] = useState({ text: '🔥 Mega Auto Auction Live: Zero Listing Fees This Weekend!', active: true });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    targetUrl: '',
    position: 'hero' as 'hero' | 'top_bar' | 'footer' | 'popup',
    isActive: true
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'content_banners'), (snap) => {
      const list: ContentBanner[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ContentBanner));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setBanners(list);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'announcement'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setAnnouncement({ text: d.text || '', active: d.active ?? true });
      }
    });

    return () => {
      unsub();
      unsubSettings();
    };
  }, []);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAnnouncement(true);
    try {
      await setDoc(doc(db, 'settings', 'announcement'), {
        text: announcement.text,
        active: announcement.active,
        updatedAt: Date.now(),
        updatedBy: currentUser.email
      });
      await logAdminAction(currentUser, 'UPDATE_ANNOUNCEMENT_BAR', 'settings', 'announcement', `Set announcement text: ${announcement.text.slice(0, 30)}... active=${announcement.active}`);
      alert('Announcement bar updated live!');
    } catch (err: any) {
      alert('Failed to update announcement: ' + err.message);
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.title.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'content_banners'), {
        ...newBanner,
        createdAt: Date.now()
      });
      await logAdminAction(currentUser, 'CREATE_BANNER', 'content_banners', docRef.id, `Created ${newBanner.position} banner: "${newBanner.title}"`);
      setShowAddModal(false);
      setNewBanner({
        title: '',
        subtitle: '',
        imageUrl: '',
        targetUrl: '',
        position: 'hero',
        isActive: true
      });
    } catch (err: any) {
      alert('Failed to create banner: ' + err.message);
    }
  };

  const handleToggleBanner = async (banner: ContentBanner) => {
    try {
      await updateDoc(doc(db, 'content_banners', banner.id), {
        isActive: !banner.isActive
      });
      await logAdminAction(currentUser, 'TOGGLE_BANNER', 'content_banners', banner.id, `Set isActive=${!banner.isActive} for "${banner.title}"`);
    } catch (err: any) {
      alert('Failed to toggle banner: ' + err.message);
    }
  };

  const handleDeleteBanner = async (banner: ContentBanner) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'content_banners', banner.id));
      await logAdminAction(currentUser, 'DELETE_BANNER', 'content_banners', banner.id, `Deleted banner "${banner.title}"`);
    } catch (err: any) {
      alert('Failed to delete banner: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-gray-900">Module 2: Content Management (CMS)</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Update marketing banners, announcements, and featured categories instantly without requiring an app store release.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Promotional Banner
        </button>
      </div>

      {/* Global Announcement Bar Editor */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <h3 className="font-bold text-gray-900 text-sm">Global Top Announcement Bar</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={announcement.active}
              onChange={(e) => setAnnouncement(prev => ({ ...prev, active: e.target.checked }))}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
            />
            Display Bar on Site
          </label>
        </div>

        <form onSubmit={handleSaveAnnouncement} className="space-y-3">
          <div>
            <input
              type="text"
              value={announcement.text}
              onChange={(e) => setAnnouncement(prev => ({ ...prev, text: e.target.value }))}
              placeholder="e.g. ⚡ Special Weekend Flash Auction: 100+ Verified Cars Ending Today!"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-900 outline-none"
              required
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Preview: <span className="font-semibold text-red-600">{announcement.text || 'No text set'}</span></span>
            <button
              type="submit"
              disabled={isSavingAnnouncement}
              className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSavingAnnouncement ? 'Saving...' : 'Save & Publish Live'}
            </button>
          </div>
        </form>
      </div>

      {/* Banners Grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <span>🖼️</span> Active Marketing & Promo Banners ({banners.length})
        </h3>

        {banners.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
            <p className="font-semibold text-sm">No promotional banners yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Promotional Banner" to publish a hero campaign or auction highlight.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map(banner => (
              <div key={banner.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between">
                {banner.imageUrl ? (
                  <div className="h-36 bg-gray-100 overflow-hidden relative">
                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white uppercase">
                      {banner.position}
                    </span>
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${banner.isActive ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-tr from-gray-900 to-gray-800 p-4 flex flex-col justify-between text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{banner.position}</span>
                    <h4 className="font-bold text-base truncate">{banner.title}</h4>
                  </div>
                )}

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{banner.title}</h4>
                    {banner.subtitle && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{banner.subtitle}</p>}
                    {banner.targetUrl && (
                      <div className="text-[11px] text-blue-600 truncate mt-1">Link: {banner.targetUrl}</div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleBanner(banner)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${banner.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                      {banner.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(banner)}
                      className="text-red-500 hover:text-red-700 font-medium px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Banner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">Create New Promotional Banner</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateBanner} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festival Season Luxury Vehicle Clearance"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subtitle / Callout Text</label>
                <input
                  type="text"
                  placeholder="e.g. Save up to 40% on certified pre-owned SUVs & Sedans"
                  value={newBanner.subtitle}
                  onChange={(e) => setNewBanner(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newBanner.imageUrl}
                  onChange={(e) => setNewBanner(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Placement Position</label>
                  <select
                    value={newBanner.position}
                    onChange={(e: any) => setNewBanner(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="hero">Hero Top Carousel</option>
                    <option value="top_bar">Notification Strip</option>
                    <option value="footer">Footer Showcase</option>
                    <option value="popup">Welcome Modal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Action Link (Optional)</label>
                  <input
                    type="text"
                    placeholder="/auctions?filter=luxury"
                    value={newBanner.targetUrl}
                    onChange={(e) => setNewBanner(prev => ({ ...prev, targetUrl: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-xl shadow-xs"
                >
                  Publish Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
