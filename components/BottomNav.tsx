import React from 'react';

interface BottomNavProps {
  onNavigate: (page: string) => void;
  activePage: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onNavigate, activePage }) => {
  return (
    <div className="fixed bottom-3 left-0 right-0 z-50 px-3 flex justify-center pointer-events-none">
      <nav 
        aria-label="Bottom Navigation"
        className="pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-xl shadow-slate-900/10 px-1.5 py-1 flex items-center justify-between"
      >
        {/* Auctions / Home */}
        <button 
          onClick={() => onNavigate('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 ${
            activePage === 'home' ? 'text-red-600 font-bold' : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill={activePage === 'home' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] leading-tight">Auctions</span>
          {activePage === 'home' && <span className="w-1 h-1 bg-red-600 rounded-full mt-0.5"></span>}
        </button>

        {/* Search */}
        <button 
          onClick={() => onNavigate('search')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 ${
            activePage === 'search' ? 'text-red-600 font-bold' : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] leading-tight">Search</span>
          {activePage === 'search' && <span className="w-1 h-1 bg-red-600 rounded-full mt-0.5"></span>}
        </button>

        {/* Sell (Action Tab) */}
        <button 
          onClick={() => onNavigate('sell')}
          className="flex-1 flex flex-col items-center justify-center py-0.5 px-1 group"
        >
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 text-white flex items-center justify-center shadow-md shadow-red-500/25 group-active:scale-95 transition-all ${activePage === 'sell' ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className={`text-[10px] leading-tight mt-0.5 font-bold ${activePage === 'sell' ? 'text-red-600' : 'text-gray-600'}`}>Sell</span>
        </button>

        {/* Wallet */}
        <button 
          onClick={() => onNavigate('wallet')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 ${
            activePage === 'wallet' ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill={activePage === 'wallet' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-[10px] leading-tight">Wallet</span>
          {activePage === 'wallet' && <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5"></span>}
        </button>

        {/* Profile */}
        <button 
          onClick={() => onNavigate('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 ${
            activePage === 'profile' ? 'text-red-600 font-bold' : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill={activePage === 'profile' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] leading-tight">Profile</span>
          {activePage === 'profile' && <span className="w-1 h-1 bg-red-600 rounded-full mt-0.5"></span>}
        </button>

        {/* Settings */}
        <button 
          onClick={() => onNavigate('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 ${
            activePage === 'settings' ? 'text-red-600 font-bold' : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] leading-tight">Settings</span>
          {activePage === 'settings' && <span className="w-1 h-1 bg-red-600 rounded-full mt-0.5"></span>}
        </button>
      </nav>
    </div>
  );
};