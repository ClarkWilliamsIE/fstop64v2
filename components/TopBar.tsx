import React from 'react';
import { UserProfile } from '../types';

interface TopBarProps {
  // ... existing props ...
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
  
  // NEW PROP
  onManage: () => void;

  // (Optional Beta props if you kept them)
  isBeta?: boolean;
  onToggleBeta?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onOpen, onExport, onReset, onCopy, onPaste, canPaste, isExporting, 
  user, profile, onSignIn, onSignOut, onUpgrade, onManage, // <--- Destructure onManage
  isBeta, onToggleBeta
}) => {
  return (
    <header className="h-14 bg-[#1e1e1e] border-b border-zinc-800 flex items-center justify-between px-6 z-20 shadow-lg shrink-0">
      {/* ... Left side (Title/Copy/Paste) ... */}
      <div className="flex items-center space-x-6">
        <h1 className="text-sm font-light tracking-[0.2em] text-white flex items-center mr-4 select-none">
           {/* ... Logo ... */}
           <span className="font-semibold text-zinc-100">F/STOP</span>
           <span className="text-zinc-500 ml-1">64</span>
        </h1>
        {/* ... */}
      </div>

      <div className="flex items-center space-x-6">
        {user ? (
          <div className="flex items-center gap-4 border-r border-zinc-800 pr-6 h-8">
            <div className="text-right">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{user.email?.split('@')[0]}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className={`text-[10px] font-bold ${profile?.is_pro ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {profile?.is_pro ? 'PRO MEMBER' : `${30 - (profile?.export_count || 0)} FREE EXPORTS LEFT`}
                </span>
              </div>
            </div>
            
            {/* CONDITIONAL BUTTONS */}
            {profile?.is_pro ? (
                // MANAGE BUTTON (For Pros)
                <button 
                  onClick={onManage}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded border border-zinc-700 transition-all"
                >
                  Manage
                </button>
            ) : (
                // UPGRADE BUTTON (For Free Users)
                <button 
                  onClick={onUpgrade}
                  className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-lg shadow-orange-500/20 transition-all transform hover:scale-105"
                >
                  Upgrade
                </button>
            )}

            <button onClick={onSignOut} className="text-[10px] text-zinc-600 hover:text-white transition-colors uppercase font-bold tracking-widest">Sign Out</button>
          </div>
        ) : (
          <button onClick={onSignIn} className="px-4 py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest border border-blue-900/50 rounded-md">Sign In</button>
        )}

        {/* ... Right side buttons (Import/Export) ... */}
        <div className="flex items-center space-x-3">
          <button onClick={onReset} className="px-4 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">Reset</button>
          <button onClick={onOpen} className="px-4 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded transition-all border border-zinc-700">Import</button>
          <button disabled={isExporting} onClick={onExport} className={`px-5 py-1.5 text-xs font-bold rounded transition-all shadow-sm uppercase tracking-widest ${isExporting ? 'bg-blue-800 text-blue-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
            {isExporting ? 'Exporting...' : 'Export Active'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
