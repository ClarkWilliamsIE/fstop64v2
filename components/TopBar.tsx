import React from 'react';
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
  
  // NEW PROPS
  isBeta?: boolean;
  onToggleBeta?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onOpen, onExport, onReset, onCopy, onPaste, canPaste, isExporting, 
  user, profile, onSignIn, onSignOut, onUpgrade,
  isBeta, onToggleBeta
}) => {
  return (
    <header className="h-14 bg-[#1e1e1e] border-b border-zinc-800 flex items-center justify-between px-6 z-20 shadow-lg shrink-0">
      <div className="flex items-center space-x-6">
        <h1 className="text-sm font-light tracking-[0.2em] text-white flex items-center mr-4 select-none">
          <span className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center text-[10px] mr-3 font-bold bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-xl">
            f/64
          </span>
          <span className="font-semibold text-zinc-100">F/STOP</span>
          <span className="text-zinc-500 ml-1">64</span>
        </h1>
        
        {/* BETA TOGGLE SWITCH */}
        {onToggleBeta && (
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={isBeta} onChange={onToggleBeta} />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${isBeta ? 'text-red-500' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
              {isBeta ? 'Beta' : 'Stable'}
            </span>
          </label>
        )}

        <div className="flex items-center space-x-1 border-l border-zinc-800 pl-6 h-8">
           {/* ... Copy/Paste buttons ... */}
           <button onClick={onCopy} className="px-3 py-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded hover:bg-zinc-800">Copy</button>
           <button disabled={!canPaste} onClick={onPaste} className={`px-3 py-1 text-[11px] font-medium transition-colors rounded ${canPaste ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}>Paste</button>
        </div>
      </div>
      
      {/* ... Rest of the bar (Auth, Export, etc) ... */}
      <div className="flex items-center space-x-6">
        {user ? (
          <div className="flex items-center gap-4 border-r border-zinc-800 pr-6 h-8">
             {/* ... User Info ... */}
             <div className="text-right">
               <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{user.email?.split('@')[0]}</p>
               <div className="flex items-center gap-2 justify-end">
                 <span className={`text-[10px] font-bold ${profile?.is_pro ? 'text-blue-400' : 'text-zinc-400'}`}>
                   {profile?.is_pro ? 'PRO MEMBER' : `${30 - (profile?.export_count || 0)} FREE EXPORTS LEFT`}
                 </span>
               </div>
             </div>

             {!profile?.is_pro && (
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
            {isExporting ? 'Exporting...' : 'Export Active'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
