
import React from 'react';

interface ModalProps {
  onClose: () => void;
  onAction: () => void;
}

export const LoginModal: React.FC<ModalProps> = ({ onClose, onAction }) => (
  <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
    <div className="bg-[#1e1e1e] border border-zinc-800 p-10 rounded-2xl shadow-2xl max-w-sm w-full text-center relative">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg shadow-blue-500/20">f/64</div>
      <h2 className="text-2xl font-bold text-white mb-3">Preserve the Moment</h2>
      <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
        Sign in to unlock your <span className="text-white font-bold">30 free monthly exports</span>. Your edits will be saved across devices.
      </p>
      <button 
        onClick={onAction}
        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all mb-4 uppercase tracking-widest text-xs"
      >
        Sign in to Export
      </button>
      <button onClick={onClose} className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-zinc-400 transition-colors">Maybe Later</button>
    </div>
  </div>
);

export const PaywallModal: React.FC<ModalProps & { isMock: boolean }> = ({ onClose, onAction, isMock }) => (
  <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex items-center justify-center p-6">
    <div className="bg-[#1e1e1e] border border-zinc-800 p-10 rounded-2xl shadow-2xl max-w-md w-full text-center">
      <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4 border border-blue-500/20">Monthly Limit Reached</span>
      <h2 className="text-3xl font-bold text-white mb-2">Unlimited Vision</h2>
      <p className="text-zinc-400 mb-8 text-sm leading-relaxed">Perfect for professional workflows. No limits, just pure processing power.</p>
      
      <div className="bg-zinc-900/50 rounded-2xl p-8 mb-8 border border-zinc-800 text-left">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Unlimited Pro</p>
            <p className="text-4xl font-bold text-white">$2<span className="text-lg font-normal text-zinc-600">/mo</span></p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Best Value</span>
          </div>
        </div>
        <ul className="space-y-3">
          {['Unlimited High-Res Exports', 'Cloud Preset Synchronization', 'Early Access to New Tools'].map(feat => (
            <li key={feat} className="flex items-center gap-3 text-xs text-zinc-300">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              {feat}
            </li>
          ))}
        </ul>
      </div>

      <button 
        onClick={onAction}
        className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all mb-4 shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs"
      >
        {isMock ? 'Upgrade (Simulated)' : 'Continue to Checkout'}
      </button>
      <button onClick={onClose} className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold hover:text-zinc-400">Return to Editor</button>
    </div>
  </div>
);
