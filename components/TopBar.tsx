import React, { useState } from 'react';
import { UserProfile } from '../types';

interface TopBarProps {
  onOpen: () => void;
  onExport: () => void;
  onReset: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  isExporting: boolean;
  user: any;
  profile: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onUpgrade: () => void;
  onManage: () => void;
  onAbout: () => void;
  onFeedback: () => void; // Added for the new Suggest a Feature modal
  isBeta?: boolean;
  onToggleBeta?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onOpen, onExport, onReset, onCopy, onPaste, canPaste, isExporting, 
  user, profile, onSignIn, onSignOut, onUpgrade, onManage, onAbout, onFeedback,
  isBeta, onToggleBeta
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-[#1e1e1e] border-b border-zinc-800 z-50 shadow-lg relative shrink-0">
      <div className="h-14 flex items-center justify-between px-4 md:px-6">
        
        {/* LEFT: Logo & Beta Toggle */}
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-light tracking-[0.2em] text-white flex items-center select-none">
            <span className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center text-[10px] mr-3 font-bold bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-xl">
              f/64
            </span>
            <span className="font-semibold text-zinc-100 hidden sm:inline">F/STOP</span>
            <span className="text-zinc-500 ml-1 hidden sm:inline">64</span>
          </h1>
          
          <button 
            onClick={onAbout}
            className="hidden md:block text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors ml-2"
          >
            About
          </button>

          {/* New Feature Button for Desktop */}
          <button 
            onClick={onFeedback}
            className="hidden md:flex items-center gap-1.5 text-[10px] font-bold text-yellow-600/80 hover:text-yellow-500 uppercase tracking-widest transition-colors ml-4 group"
          >
            <span className="text-xs group-hover:scale-110 transition-transform">💡</span>
            Suggest Feature
          </button>

          {onToggleBeta && (
            <label className="flex items-center gap-2 cursor-pointer group ml-4">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={isBeta} onChange={onToggleBeta} />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${isBeta ? 'text-red-500' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                {isBeta ? 'Beta' : 'Stable'}
              </span>
            </label>
          )}
        </div>
        
        {/* RIGHT: Desktop Controls */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="flex items-center space-x-1 border-l border-zinc-800 pl-6 h-8">
             <button onClick={onCopy} className="px-3 py-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded hover:bg-zinc-800">Copy</button>
             <button disabled={!canPaste} onClick={onPaste} className={`px-3 py-1 text-[11px] font-medium transition-colors rounded ${canPaste ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}>Paste</button>
          </div>

          {user ? (
            <div className="flex items-center gap-4 border-r border-zinc-800 pr-6 h-8">
               <div className="text-right">
                 <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{user.email?.split('@')[0]}</p>
                 <div className="flex items-center gap-2 justify-end">
                   <span className={`text-[10px] font-bold ${profile?.is_pro ? 'text-blue-400' : 'text-zinc-400'}`}>
                     {profile?.is_pro ? 'PRO MEMBER' : `${30 - (profile?.export_count || 0)} FREE EXPORTS`}
                   </span>
                 </div>
               </div>
               {profile?.is_pro ? (
                  <button onClick={onManage} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded border border-zinc-700 transition-all">Manage</button>
               ) : (
                  <button onClick={onUpgrade} className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-lg shadow-orange-500/20 transition-all transform hover:scale-105">Upgrade</button>
               )}
               <button onClick={onSignOut} className="text-[10px] text-zinc-600 hover:text-white transition-colors uppercase font-bold tracking-widest">Sign Out</button>
            </div>
          ) : (
            <button onClick={onSignIn} className="px-4 py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest border border-blue-900/50 rounded-md">Sign In</button>
          )}
          
          <div className="flex items-center space-x-3">
            <button onClick={onReset} className="px-4 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">Reset</button>
            <button onClick={onOpen} className="px-4 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded transition-all border border-zinc-700">Import</button>
            <button disabled={isExporting} onClick={onExport} className={`px-5 py-1.5 text-xs font-bold rounded transition-all shadow-sm uppercase tracking-widest ${isExporting ? 'bg-blue-800 text-blue-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
              {isExporting ? (
                 <span className="flex items-center gap-2">
                   <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   ...
                 </span>
              ) : 'Export'}
            </button>
          </div>
        </div>

        {/* MOBILE: Hamburger */}
        <button 
          className="md:hidden p-2 text-zinc-400 hover:text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* MOBILE: Dropdown Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#1a1a1a] border-b border-zinc-800 p-4 space-y-4 shadow-2xl absolute w-full z-50">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { onOpen(); setIsMenuOpen(false); }} className="p-3 bg-zinc-800 text-zinc-200 rounded text-xs font-bold text-center">Import Photo</button>
            <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="p-3 bg-blue-600 text-white rounded text-xs font-bold text-center">Export Active</button>
          </div>
          
          <div className="flex justify-between items-center border-t border-zinc-800 pt-4">
             <button onClick={onCopy} className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Copy Settings</button>
             <button disabled={!canPaste} onClick={onPaste} className="text-xs text-zinc-400 font-bold uppercase tracking-widest disabled:opacity-50">Paste Settings</button>
             <button onClick={onReset} className="text-xs text-red-400 font-bold uppercase tracking-widest">Reset</button>
          </div>

          <div className="border-t border-zinc-800 pt-4 flex flex-col gap-4">
            <button onClick={() => { onFeedback(); setIsMenuOpen(false); }} className="w-full text-left text-xs font-bold text-yellow-500 uppercase tracking-widest">💡 Suggest a Feature</button>
            <button onClick={() => { onAbout(); setIsMenuOpen(false); }} className="w-full text-left text-xs font-bold text-zinc-400 uppercase tracking-widest">About F/STOP 64</button>
            
            {user ? (
              <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800/50">
                <div className="flex justify-between items-center">
                   <span className="text-xs text-zinc-500">{user.email}</span>
                   <span className={`text-[10px] font-bold ${profile?.is_pro ? 'text-blue-400' : 'text-zinc-400'}`}>
                     {profile?.is_pro ? 'PRO' : `${30 - (profile?.export_count || 0)} FREE LEFT`}
                   </span>
                </div>
                {profile?.is_pro ? (
                    <button onClick={onManage} className="w-full py-2 bg-zinc-800 text-zinc-300 rounded text-xs">Manage Subscription</button>
                ) : (
                    <button onClick={onUpgrade} className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded text-xs font-bold uppercase tracking-widest">Upgrade to Pro</button>
                )}
                <button onClick={onSignOut} className="w-full py-2 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest">Sign Out</button>
              </div>
            ) : (
              <button onClick={onSignIn} className="w-full py-2 bg-zinc-800 text-blue-400 font-bold rounded text-xs uppercase tracking-widest">Sign In / Sign Up</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
