import React, { useState, useEffect } from 'react';
import { User, WalletTransaction, WithdrawalRequest } from '../types';
import { GoogleGenAI } from "@google/genai";
import { db, doc, getDoc, setDoc, deleteDoc, updateDoc, collection, query, where, onSnapshot, addDoc } from '../firebase';
import { IdentityVerificationModal } from './IdentityVerificationModal';
import { WalletView } from './WalletView';
import { sanitizeInstagramUsername, validateInstagramUsername } from '../utils/username';

interface SettingsProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentUser: User;
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  t: any;
  initialSection?: SettingsSection;
}

type SettingsSection = 
  | 'MENU' 
  | 'EDIT_PROFILE'
  | 'WALLET'
  | 'BLOCKED_USERS' 
  | 'LANGUAGES' 
  | 'VERIFY' 
  | 'AI_ASSISTANT' 
  | 'RAISE_TICKET' 
  | 'VIEW_TICKETS' 
  | 'CONTACT_SUPPORT' 
  | 'CHANGE_PASSWORD' 
  | 'DEVICES'
  | 'PLATFORM_SERVICES'
  | 'PROMOTIONS'
  | 'DONATE';

// --- Helper Components ---

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-gray-500 uppercase tracking-wider mt-4">
    {icon}
    {title}
  </div>
);

const MenuItem: React.FC<{ 
  label: string; 
  onClick?: () => void; 
  isDestructive?: boolean;
  rightElement?: React.ReactNode;
}> = ({ label, onClick, isDestructive, rightElement }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between px-6 py-4 bg-white/60 hover:bg-white/80 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${isDestructive ? 'text-red-600 font-semibold' : 'text-gray-800'}`}
  >
    <span className="font-medium text-sm sm:text-base">{label}</span>
    {rightElement || (
      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
      </svg>
    )}
  </div>
);

const SubViewHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
    <div className="flex items-center mb-6">
       <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-200 transition-colors mr-2 text-gray-600"
        >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
);

// --- Isolated Settings Menu Component ---

interface SettingsMenuProps {
  t: any;
  currentUser: User;
  currentLanguage: string;
  isPrivate: boolean;
  setIsPrivate: (val: boolean) => void;
  setActiveSection: (section: SettingsSection) => void;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  setShowDownloadConfirm: (val: boolean) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
  t, currentUser, currentLanguage, isPrivate, setIsPrivate, setActiveSection, onNavigate, onLogout, setShowDownloadConfirm 
}) => {
  return (
    <>
      <div className="flex items-center mb-6">
          <button 
              onClick={() => onNavigate('profile')}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-2 text-gray-600"
          >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{t.settingsTitle}</h1>
      </div>

      <div className="glass-panel rounded-[2rem] overflow-hidden shadow-sm">
          {/* Account Details */}
          <SectionHeader 
              title={t.accountDetails} 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} 
          />
          <div className="flex flex-col">
              <div className="px-6 py-4 bg-white/60 border-b border-gray-100">
                  <span className="block font-medium text-gray-800 text-sm sm:text-base mb-2">{t.privateAccount}</span>
                  <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                              type="radio" 
                              name="privacy" 
                              checked={isPrivate} 
                              onChange={() => setIsPrivate(true)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-700">{t.onPrivate}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                              type="radio" 
                              name="privacy" 
                              checked={!isPrivate} 
                              onChange={() => setIsPrivate(false)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-700">{t.offPublic}</span>
                      </label>
                  </div>
              </div>
              <MenuItem label="Edit Profile" onClick={() => setActiveSection('EDIT_PROFILE')} />
              <MenuItem label="My Wallet" onClick={() => onNavigate('wallet')} rightElement={<span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded-full mr-2">₹{(currentUser.deposits || 0).toLocaleString()}</span>} />
          </div>

          <SectionHeader 
              title="Services & Contributions" 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
          />
          <div className="bg-white/40">
              <MenuItem label="Platform Services & Boosts" onClick={() => setActiveSection('PLATFORM_SERVICES')} />
              <MenuItem label="Promotions & Advertising" onClick={() => setActiveSection('PROMOTIONS')} />
              <MenuItem label="Make a Donation" onClick={() => setActiveSection('DONATE')} />
          </div>

          <SectionHeader 
              title="Preferences & Safety" 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
          />
          <div className="bg-white/40">
              <MenuItem label={t.blockedUsers} onClick={() => setActiveSection('BLOCKED_USERS')} />
              <MenuItem label={t.languages} onClick={() => setActiveSection('LANGUAGES')} rightElement={<span className="text-gray-500 text-sm mr-2">{currentLanguage}</span>} />
              <MenuItem label={t.verifyAccount} onClick={() => setActiveSection('VERIFY')} rightElement={currentUser.isVerified ? <span className="text-blue-500 font-bold text-xs bg-blue-50 px-2 py-1 rounded-full">Verified</span> : <span className="text-gray-400 text-xs">Not Verified</span>} />
          </div>

          {/* Help and Support */}
          <SectionHeader 
              title={t.helpSupport} 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} 
          />
          <div className="flex flex-col">
              <MenuItem label={t.aiAssistant} onClick={() => setActiveSection('AI_ASSISTANT')} />
              <MenuItem label={t.raiseTicket} onClick={() => setActiveSection('RAISE_TICKET')} />
              <MenuItem label={t.viewTickets} onClick={() => setActiveSection('VIEW_TICKETS')} />
              <MenuItem label={t.contactSupport} onClick={() => setActiveSection('CONTACT_SUPPORT')} />
          </div>

          {/* Credentials & Data */}
          <SectionHeader 
              title={t.credentialsData} 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} 
          />
          <div className="flex flex-col">
              <MenuItem label={t.changePassword} onClick={() => setActiveSection('CHANGE_PASSWORD')} />
              <MenuItem label={t.loginDevices} onClick={() => setActiveSection('DEVICES')} />
              
              <MenuItem 
                  label={t.downloadData} 
                  onClick={() => setShowDownloadConfirm(true)}
                  rightElement={<svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
              />
          </div>

          {/* Login Actions */}
          <SectionHeader 
              title={t.loginSection} 
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>} 
          />
          <div className="flex flex-col">
              <MenuItem label={t.addAccount} onClick={() => alert("Add Account feature would open a new login flow.")} />
              <MenuItem label={t.switchAccount} onClick={() => alert("Switch Account would show a list of saved accounts.")} />
              <div className="border-t border-gray-100">
                  <MenuItem 
                      label={t.logOut} 
                      isDestructive 
                      onClick={onLogout}
                      rightElement={<svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
                  />
              </div>
          </div>
      </div>

      <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 font-medium">AutoBid AI v1.0.7</p>
          <p className="text-gray-300 text-[10px] mt-1">© 2024 AutoBid Inc.</p>
      </div>
    </>
  );
};

// --- Main Settings Component ---

export const Settings: React.FC<SettingsProps> = ({ onNavigate, onLogout, currentUser, currentLanguage, setLanguage, t, initialSection }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection || 'MENU');

  useEffect(() => {
     if (initialSection) {
         setActiveSection(initialSection);
     } else {
         setActiveSection('MENU');
     }
  }, [initialSection]);
  
  // -- State for Account Details --
  const [isPrivate, setIsPrivate] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([
    { id: 'b1', name: 'spam_bot_99' },
    { id: 'b2', name: 'annoying_bidder' }
  ]);
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);

  // -- State for Tickets --
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
     if (activeSection === 'VIEW_TICKETS' || activeSection === 'RAISE_TICKET') {
         const q = query(collection(db, 'tickets'), where('userId', '==', currentUser.id));
         const unsub = onSnapshot(q, (snapshot) => {
             const data: any[] = [];
             snapshot.forEach(d => {
                 data.push({ id: d.id, ...d.data() });
             });
             // Sort by date desc locally
             data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
             setTickets(data);
         }, (err) => console.error("Tickets fetch error:", err));
         return () => unsub();
     }
  }, [activeSection, currentUser.id]);

  // -- Helpers --
  const generateUserData = () => {
    return {
      personalInfo: {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email || `${currentUser.username}@autobid.com`,
        verified: currentUser.isVerified,
      },
      settings: { isPrivate, language: currentLanguage },
      exportMetaData: {
        app: "AutoBid AI",
        timestamp: new Date().toISOString(),
      }
    };
  };

  const executeDownload = (format: 'json' | 'html') => {
    const data = generateUserData();
    let content = '';
    let mimeType = '';
    let extension = '';

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = `
        <html>
          <head><title>AutoBid Export</title></head>
          <body>
            <h1>Data Export for ${currentUser.username}</h1>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </body>
        </html>
      `;
      mimeType = 'text/html';
      extension = 'html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autobid_data.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadConfirm(false);
  };

  // --- Sub-Views ---

  const EditProfileView = () => {
    const [username, setUsername] = useState(currentUser.username || '');
    const [fullName, setFullName] = useState(currentUser.fullName || '');
    const [bio, setBio] = useState(currentUser.bio || '');
    const [website, setWebsite] = useState(currentUser.website || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const validation = validateInstagramUsername(username);
      if (!validation.isValid) {
        setError(validation.error || "Please enter a valid Instagram-style username.");
        return;
      }

      setLoading(true);

      const lowerNewUser = sanitizeInstagramUsername(username);
      const lowerOldUser = sanitizeInstagramUsername(currentUser.username || '');
      
      try {
        if (lowerNewUser !== lowerOldUser) {
          const usernameRef = doc(db, 'usernames', lowerNewUser);
          const usernameDoc = await getDoc(usernameRef);
          if (usernameDoc.exists()) {
             setError("Username @" + lowerNewUser + " is already taken by another user.");
             setLoading(false);
             return;
          }
          // Delete old, set new
          if (lowerOldUser) await deleteDoc(doc(db, 'usernames', lowerOldUser));
          await setDoc(usernameRef, { uid: currentUser.id });
        }

        await updateDoc(doc(db, 'users', currentUser.id), {
          username: lowerNewUser,
          fullName: fullName,
          bio: bio,
          website: website
        });
        
        alert("Profile updated successfully!");
        setActiveSection('MENU');
      } catch (err: any) {
        setError("Error updating profile: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="animate-fade-in-right">
        <SubViewHeader title="Edit Profile" onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel p-6 rounded-[2rem]">
            {error && <div className="mb-4 text-red-600 font-medium text-sm bg-red-50 p-3 rounded-xl">{error}</div>}
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-bold text-gray-700">Username</label>
                      <span className="text-[11px] text-gray-400 font-medium">No spaces • Instagram format</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">@</span>
                      <input 
                        type="text" 
                        required 
                        value={username} 
                        onChange={(e) => {
                          const sanitized = sanitizeInstagramUsername(e.target.value);
                          setUsername(sanitized);
                        }} 
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium" 
                        placeholder="your_handle" 
                      />
                    </div>
                    {username && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        Public handle: <strong className="text-gray-900">@{username}</strong>
                      </p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Full Name" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Tell us about yourself..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website / Link</label>
                    <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="https://..." />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
      </div>
    );
  };

  const BlockedUsersView = () => (
    <div className="animate-fade-in-right">
      <SubViewHeader title={t.blockedUsers} onBack={() => setActiveSection('MENU')} />
      <div className="glass-panel rounded-2xl overflow-hidden">
        {blockedUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No blocked users.</div>
        ) : (
          blockedUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
               <span className="font-medium text-gray-800">{user.name}</span>
               <button 
                 onClick={() => setBlockedUsers(blockedUsers.filter(u => u.id !== user.id))}
                 className="text-xs bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-full transition-colors"
               >
                 Unblock
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const LanguageView = () => {
    const langs = ['English (US)', 'Español', 'Français', 'Deutsch', 'Hindi', 'Marathi', 'Sanskrit', 'Arabic', 'Urdu', 'Telugu', 'Malayalam', 'Tamil', 'Gujarati', 'Punjabi', 'Odia', 'Kannada', '日本語'];
    return (
      <div className="animate-fade-in-right">
        <SubViewHeader title={t.languages} onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel rounded-2xl overflow-hidden">
          {langs.map(lang => (
            <div 
              key={lang} 
              onClick={() => { setLanguage(lang); setActiveSection('MENU'); }}
              className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/50"
            >
              <span className="font-medium text-gray-800">{lang}</span>
              {currentLanguage === lang && <span className="text-red-600 font-bold">✓</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const VerifyView = () => (
    <div className="animate-fade-in-right">
      <SubViewHeader title={t.verifyAccount} onBack={() => setActiveSection('MENU')} />
      <div className="glass-panel rounded-[2rem] p-6 text-center">
         <div className={`w-20 h-20 ${currentUser.isVerified ? 'bg-emerald-50 text-emerald-600' : currentUser.verificationStatus === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm`}>
            {currentUser.isVerified ? '🛡️' : currentUser.verificationStatus === 'pending' ? '⏳' : '🪪'}
         </div>
         <h3 className="text-xl font-bold text-gray-900 mb-2">
            {currentUser.isVerified ? 'Account Verified' : currentUser.verificationStatus === 'pending' ? 'Verification In Review' : 'Verify Your Identity'}
         </h3>
         <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            {currentUser.isVerified 
              ? 'Your account has been authenticated using your PAN / National ID. You have full access to bid on all vehicles, list and sell your cars, and participate in auction events.'
              : currentUser.verificationStatus === 'pending'
              ? 'Your identity documents have been submitted to our verification team and admin for review. You will be authorized once verified.'
              : 'AutoBid requires PAN Card or National ID verification for platform security. Only verified accounts are authorized to bid, sell vehicles, and participate in auction events.'}
         </p>
         
         {currentUser.isVerified ? (
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-6 py-3 rounded-2xl font-bold text-sm shadow-sm">
              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span>Verified Account — Authorized for Bidding & Selling</span>
            </div>
         ) : currentUser.verificationStatus === 'pending' ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-6 py-3 rounded-2xl font-bold text-sm">
                <span>⏳</span>
                <span>Verification Request Pending Admin Review</span>
              </div>
              <div>
                <button
                  onClick={() => setShowVerifyModal(true)}
                  className="text-xs text-amber-800 underline hover:text-amber-900 font-semibold"
                >
                  View / Re-submit Details
                </button>
              </div>
            </div>
         ) : (
            <button 
              onClick={() => setShowVerifyModal(true)}
              className="w-full max-w-sm mx-auto bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
            >
              <span>🛡️</span>
              <span>Verify with PAN / National ID</span>
            </button>
         )}
      </div>

      {showVerifyModal && (
        <IdentityVerificationModal
          currentUser={currentUser}
          isOpen={true}
          onClose={() => setShowVerifyModal(false)}
          onVerificationSubmitted={() => {
            setShowVerifyModal(false);
            alert("Verification request submitted! Once verified by our verification team / admin, your bidding, selling, and event privileges will be active.");
          }}
        />
      )}
    </div>
  );

  const AIAssistantView = () => {
    const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
      { role: 'model', text: "Hi! I'm the AutoBid Assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
      if(!input.trim()) return;
      const userMsg = input;
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setInput('');
      setLoading(true);

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { role: 'user', parts: [{ text: `You are a helpful customer support agent for AutoBid. User: ${userMsg}` }] }
          ]
        });
        setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm having trouble connecting." }]);
      } catch (e) {
        setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm offline at the moment." }]);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="animate-fade-in-right h-[calc(100vh-140px)] flex flex-col">
        <SubViewHeader title={t.aiAssistant} onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel flex-1 rounded-2xl overflow-hidden flex flex-col">
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-red-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-gray-400 ml-4">Typing...</div>}
           </div>
           <div className="p-3 bg-white/50 border-t border-gray-100 flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask for help..."
                className="flex-1 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm focus:outline-none focus:border-red-400"
              />
              <button onClick={handleSend} className="bg-red-500 text-white p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
           </div>
        </div>
      </div>
    );
  };

  const RaiseTicketView = () => {
    const [category, setCategory] = useState('amount_related');
    const [subject, setSubject] = useState('');
    const [desc, setDesc] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        try {
            await addDoc(collection(db, 'tickets'), {
                userId: currentUser.id,
                category,
                subject,
                description: desc,
                status: 'open',
                createdAt: Date.now()
            });
            alert("Support ticket created!");
            setSubject('');
            setDesc('');
            setCategory('amount_related');
            setActiveSection('VIEW_TICKETS');
        } catch (err: any) {
            alert("Error creating ticket: " + err.message);
        } finally {
            setSubmitted(false);
        }
    };

    return (
      <div className="animate-fade-in-right">
        <SubViewHeader title={t.raiseTicket} onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel p-6 rounded-[2rem]">
            {submitted ? (
                 <div className="text-center py-10">
                     <p className="font-bold text-gray-700">Submitting your ticket...</p>
                 </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-400 bg-white">
                        <option value="amount_related">Amount Related Query</option>
                        <option value="account_related">Account Related Query</option>
                        <option value="other">Other Query</option>
                    </select>
                    <input required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-400" placeholder="Subject" />
                    <textarea required value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-red-400" placeholder="Description..." />
                    <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-red-700 transition-all">Submit</button>
                </form>
            )}
        </div>
      </div>
    );
  };

  const ViewTicketsView = () => (
    <div className="animate-fade-in-right">
      <SubViewHeader title={t.viewTickets} onBack={() => setActiveSection('MENU')} />
      <div className="glass-panel rounded-2xl overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tickets found.</div>
        ) : (
            tickets.map(ticket => (
                <div key={ticket.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-white/40">
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-800">{ticket.subject}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${ticket.status === 'Resolved' || ticket.status === 'closed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{ticket.status}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        <span className="truncate w-1/2">ID: {ticket.id}</span>
                        <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ticket.date}</span>
                    </div>
                    {ticket.description && <p className="text-sm text-gray-600 mt-2">{ticket.description}</p>}
                </div>
            ))
        )}
      </div>
      <button onClick={() => setActiveSection('RAISE_TICKET')} className="mt-4 w-full bg-white text-red-600 border border-red-100 font-bold py-3 rounded-xl hover:bg-red-50 transition-all">
          {t.raiseTicket}
      </button>
    </div>
  );

  const ContactSupportView = () => (
    <div className="animate-fade-in-right">
      <SubViewHeader title={t.contactSupport} onBack={() => setActiveSection('MENU')} />
      <div className="glass-panel p-6 rounded-[2rem] space-y-4">
         <div className="flex items-center gap-4 p-4 bg-white/60 rounded-xl">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Call Us</p>
                <p className="text-lg font-bold text-gray-900">+1 (800) 123-4567</p>
            </div>
         </div>
         <div className="flex items-center gap-4 p-4 bg-white/60 rounded-xl">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Email Us</p>
                <p className="text-lg font-bold text-gray-900">support@autobid.ai</p>
            </div>
         </div>
         <p className="text-center text-xs text-gray-400 mt-4">Hours: Mon-Fri 9am - 6pm EST</p>
      </div>
    </div>
  );

  const ChangePasswordView = () => (
      <div className="animate-fade-in-right">
        <SubViewHeader title={t.changePassword} onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel p-6 rounded-[2rem]">
            <form onSubmit={(e) => { e.preventDefault(); alert("Password updated successfully!"); setActiveSection('MENU'); }} className="space-y-4">
                <input type="password" required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Current Password" />
                <input type="password" required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="New Password" />
                <input type="password" required className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Confirm New Password" />
                <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg">Update Password</button>
            </form>
        </div>
      </div>
  );

  const DevicesView = () => (
      <div className="animate-fade-in-right">
          <SubViewHeader title={t.loginDevices} onBack={() => setActiveSection('MENU')} />
          <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-green-50/50">
                  <div>
                      <p className="font-bold text-gray-800">Chrome on Windows</p>
                      <p className="text-xs text-green-600 font-bold">Current Session</p>
                  </div>
              </div>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <div>
                      <p className="font-bold text-gray-800">iPhone 13 Pro</p>
                      <p className="text-xs text-gray-500">Last active: 2 hours ago</p>
                  </div>
                  <button className="text-xs text-red-500 font-bold border border-red-100 px-3 py-1 rounded-full hover:bg-red-50">{t.logOut}</button>
              </div>
              <div className="p-4 flex justify-between items-center">
                  <div>
                      <p className="font-bold text-gray-800">Safari on Mac</p>
                      <p className="text-xs text-gray-500">Last active: 5 days ago</p>
                  </div>
                   <button className="text-xs text-red-500 font-bold border border-red-100 px-3 py-1 rounded-full hover:bg-red-50">{t.logOut}</button>
              </div>
          </div>
      </div>
  );

  const PlatformServicesView = () => {
    const [serviceType, setServiceType] = useState('boost_auction');
    const [amount, setAmount] = useState('500');
    
    const handlePay = async () => {
      const val = parseInt(amount, 10);
      if (isNaN(val) || val <= 0) return alert('Invalid amount');
      if (val > (currentUser.deposits || 0)) return alert('Insufficient funds in wallet.');
      
      const confirmMsg = `Pay ₹${val} from your wallet to Company for ${serviceType.replace('_', ' ')}?`;
      if (!window.confirm(confirmMsg)) return;

      try {
        const newBal = (currentUser.deposits || 0) - val;
        await updateDoc(doc(db, 'users', currentUser.id), { deposits: newBal });
        
        const ctCollectionRef = doc(db, 'settings', 'ct_collection');
        const ctCollectionSnap = await getDoc(ctCollectionRef);
        const currentCtBal = ctCollectionSnap.exists() ? (ctCollectionSnap.data().balance || 0) : 0;
        await setDoc(ctCollectionRef, { balance: currentCtBal + val }, { merge: true });

        await addDoc(collection(db, 'transactions'), {
          userId: currentUser.id,
          username: currentUser.username,
          type: `service_${serviceType}`,
          amount: val,
          description: `Paid for ${serviceType.replace('_', ' ')}`,
          timestamp: Date.now(),
          status: 'success',
          balanceAfter: newBal
        });
        alert('Service purchased successfully!');
        setActiveSection('MENU');
      } catch (err: any) {
        alert("Error purchasing service: " + err.message);
      }
    };

    return (
      <div className="animate-fade-in-right">
        <SubViewHeader title="Platform Services" onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel p-6 rounded-[2rem] space-y-6">
          <div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Enhance your reach</h3>
             <p className="text-sm text-gray-600">Select a service to boost your listings or pay commission on sold vehicles. The amount will be deducted directly from your wallet and credited to AutoBid Treasury.</p>
          </div>
          <div className="space-y-4">
             <label className="block text-sm font-semibold text-gray-700">Service Type</label>
             <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                <option value="boost_auction">Boost Vehicle Auction</option>
                <option value="boost_bidding">Boost Bidding (Homepage display last 15 min)</option>
                <option value="sales_commission">Pay Sales Commission</option>
             </select>
          </div>
          <div className="space-y-4">
             <label className="block text-sm font-semibold text-gray-700">Amount (₹)</label>
             <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" placeholder="Enter amount..." />
          </div>
          <button onClick={handlePay} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md">
            Pay ₹{amount || 0} from Wallet
          </button>
        </div>
      </div>
    );
  };

  const PromotionsView = () => {
    const [amount, setAmount] = useState('2000');
    const [description, setDescription] = useState('');
    
    const handlePay = async () => {
      const val = parseInt(amount, 10);
      if (isNaN(val) || val <= 0) return alert('Invalid amount');
      if (!description.trim()) return alert('Please enter campaign description.');
      if (val > (currentUser.deposits || 0)) return alert('Insufficient funds in wallet.');
      
      const confirmMsg = `Pay ₹${val} for Promotional Collaboration from your wallet?`;
      if (!window.confirm(confirmMsg)) return;

      try {
        const newBal = (currentUser.deposits || 0) - val;
        await updateDoc(doc(db, 'users', currentUser.id), { deposits: newBal });
        
        const ctCollectionRef = doc(db, 'settings', 'ct_collection');
        const ctCollectionSnap = await getDoc(ctCollectionRef);
        const currentCtBal = ctCollectionSnap.exists() ? (ctCollectionSnap.data().balance || 0) : 0;
        await setDoc(ctCollectionRef, { balance: currentCtBal + val }, { merge: true });

        await addDoc(collection(db, 'transactions'), {
          userId: currentUser.id,
          username: currentUser.username,
          type: `promotional_campaign`,
          amount: val,
          description: `Promotional Campaign: ${description}`,
          timestamp: Date.now(),
          status: 'success',
          balanceAfter: newBal
        });
        alert('Promotion campaign submitted successfully! Our team will contact you shortly.');
        setActiveSection('MENU');
      } catch (err: any) {
        alert("Error paying for promotion: " + err.message);
      }
    };

    return (
      <div className="animate-fade-in-right">
        <SubViewHeader title="Promotions & Advertising" onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel p-6 rounded-[2rem] space-y-6">
          <div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Collaborate with Us</h3>
             <p className="text-sm text-gray-600">Run ads, promotions, or collaboration campaigns on our platform. Provide details of your campaign below.</p>
          </div>
          <div className="space-y-4">
             <label className="block text-sm font-semibold text-gray-700">Campaign Details</label>
             <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" placeholder="e.g. Instagram promotion for a brand..." />
          </div>
          <div className="space-y-4">
             <label className="block text-sm font-semibold text-gray-700">Campaign Budget (₹)</label>
             <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" placeholder="Enter budget..." />
          </div>
          <button onClick={handlePay} className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-md">
            Pay ₹{amount || 0} from Wallet
          </button>
        </div>
      </div>
    );
  };

  const DonationsView = () => {
    const [amount, setAmount] = useState('100');
    const [isAnonymous, setIsAnonymous] = useState(false);
    
    const handlePay = async () => {
      const val = parseInt(amount, 10);
      if (isNaN(val) || val <= 0) return alert('Invalid amount');
      if (val > (currentUser.deposits || 0)) return alert('Insufficient funds in wallet.');
      
      const confirmMsg = `Donate ₹${val} to AutoBid Foundation?`;
      if (!window.confirm(confirmMsg)) return;

      try {
        const newBal = (currentUser.deposits || 0) - val;
        await updateDoc(doc(db, 'users', currentUser.id), { deposits: newBal });
        
        const ctCollectionRef = doc(db, 'settings', 'ct_collection');
        const ctCollectionSnap = await getDoc(ctCollectionRef);
        const currentCtBal = ctCollectionSnap.exists() ? (ctCollectionSnap.data().balance || 0) : 0;
        await setDoc(ctCollectionRef, { balance: currentCtBal + val }, { merge: true });

        await addDoc(collection(db, 'transactions'), {
          userId: currentUser.id,
          username: isAnonymous ? 'Anonymous' : currentUser.username,
          realUserId: currentUser.id, // kept private for legal reasons
          realUsername: currentUser.username,
          type: `donation`,
          amount: val,
          description: `Donation to AutoBid Foundation`,
          isAnonymous,
          timestamp: Date.now(),
          status: 'success',
          balanceAfter: newBal
        });
        alert('Thank you for your generous donation!');
        setActiveSection('MENU');
      } catch (err: any) {
        alert("Error processing donation: " + err.message);
      }
    };

    return (
      <div className="animate-fade-in-right">
        <SubViewHeader title="Make a Donation" onBack={() => setActiveSection('MENU')} />
        <div className="glass-panel p-6 rounded-[2rem] space-y-6">
          <div className="text-center">
             <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Support AutoBid Foundation</h3>
             <p className="text-sm text-gray-600 mb-6">Your donations help us improve the community and support local charities. You can choose to remain publicly anonymous.</p>
          </div>
          
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
             <label className="block text-sm font-semibold text-gray-700">Donation Amount (₹)</label>
             <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" placeholder="Enter amount..." />
          </div>

          <label className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
             <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300" />
             <div>
               <p className="text-sm font-bold text-gray-900">Donate Anonymously</p>
               <p className="text-xs text-gray-500">Your details will be kept private and only used for lawful compliance.</p>
             </div>
          </label>

          <button onClick={handlePay} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            Donate ₹{amount || 0}
          </button>
        </div>
      </div>
    );
  };

  // --- Render ---

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-fade-in-up relative">
      
      {/* Confirmation Modal */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDownloadConfirm(false)}></div>
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t.downloadData}</h3>
            <div className="bg-red-50 border border-red-100 p-3 rounded-lg mb-4">
              <p className="text-red-700 text-xs font-bold uppercase mb-1">Warning</p>
              <p className="text-red-600 text-sm">Contains sensitive personal info.</p>
            </div>
            <p className="text-gray-600 text-sm mb-6">Select a format to download your account history.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => executeDownload('json')}
                className="w-full py-3 rounded-xl border-2 border-gray-100 hover:border-red-100 hover:bg-red-50 text-gray-800 font-bold transition-all flex items-center justify-center gap-2"
              >
                Download JSON
              </button>
              <button 
                onClick={() => executeDownload('html')}
                className="w-full py-3 rounded-xl border-2 border-gray-100 hover:border-red-100 hover:bg-red-50 text-gray-800 font-bold transition-all flex items-center justify-center gap-2"
              >
                Download HTML
              </button>
               <button 
                onClick={() => setShowDownloadConfirm(false)}
                className="w-full py-2 text-gray-400 font-medium hover:text-gray-600 mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Main Menu or Sub-View */}
      {activeSection === 'MENU' ? (
        <SettingsMenu 
           t={t}
           currentUser={currentUser}
           currentLanguage={currentLanguage}
           isPrivate={isPrivate}
           setIsPrivate={setIsPrivate}
           setActiveSection={setActiveSection}
           onNavigate={onNavigate}
           onLogout={onLogout}
           setShowDownloadConfirm={setShowDownloadConfirm}
        />
      ) : (
         <>
            {activeSection === 'EDIT_PROFILE' && <EditProfileView />}
            {activeSection === 'WALLET' && <WalletView currentUser={currentUser} onNavigate={onNavigate} />}
            {activeSection === 'BLOCKED_USERS' && <BlockedUsersView />}
            {activeSection === 'LANGUAGES' && <LanguageView />}
            {activeSection === 'VERIFY' && <VerifyView />}
            {activeSection === 'AI_ASSISTANT' && <AIAssistantView />}
            {activeSection === 'RAISE_TICKET' && <RaiseTicketView />}
            {activeSection === 'VIEW_TICKETS' && <ViewTicketsView />}
            {activeSection === 'CONTACT_SUPPORT' && <ContactSupportView />}
            {activeSection === 'CHANGE_PASSWORD' && <ChangePasswordView />}
            {activeSection === 'DEVICES' && <DevicesView />}
            {activeSection === 'PLATFORM_SERVICES' && <PlatformServicesView />}
            {activeSection === 'PROMOTIONS' && <PromotionsView />}
            {activeSection === 'DONATE' && <DonationsView />}
         </>
      )}

    </div>
  );
};