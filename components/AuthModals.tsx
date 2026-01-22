import React from 'react';

// --- 1. LOGIN MODAL (Standard Sign In) ---
interface LoginModalProps {
  onClose: () => void;
  onAction: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onAction }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] p-8 rounded-xl shadow-2xl w-96 text-center border border-zinc-800 relative" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">Member Access</h2>
        <p className="text-zinc-400 text-xs mb-8">Sign in to sync your exports and access Pro features.</p>

        {/* Action Button */}
        <button 
          onClick={onAction}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 px-4 rounded hover:bg-zinc-200 transition-all mb-4"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          <span className="text-sm">Continue with Google</span>
        </button>
        
        {/* Legal Footer */}
        <p className="mt-6 text-[10px] text-zinc-500 leading-normal">
          By continuing, you agree to our<br/>
          <a href="/terms" target="_blank" className="underline hover:text-zinc-300">Terms of Service</a> and <a href="/privacy" target="_blank" className="underline hover:text-zinc-300">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

// --- 2. PAYWALL MODAL (Upgrade to Pro) ---
interface PaywallModalProps {
  onClose: () => void;
  onAction: () => void;
  isMock: boolean;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, onAction, isMock }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md select-none p-4" onClick={onClose}>
      <div className="bg-gradient-to-b from-[#1e1e1e] to-[#121212] p-8 rounded-2xl shadow-2xl w-[420px] text-center border border-zinc-700 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Decorative Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>

        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full mx-auto flex items-center justify-center shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">UNLOCK PRO</h2>
          <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">Limitless Creativity</p>
        </div>

        <div className="space-y-3 mb-8 text-left bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-3 text-sm text-zinc-200">
            <span className="text-green-500">✓</span> Unlimited High-Res Exports
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-200">
            <span className="text-green-500">✓</span> Batch Processing
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-200">
            <span className="text-green-500">✓</span> Cloud Preset Sync
          </div>
           <div className="flex items-center gap-3 text-sm text-zinc-200">
            <span className="text-green-500">✓</span> Priority Support
          </div>
        </div>

        <button 
          onClick={onAction}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-lg shadow-lg shadow-orange-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider text-sm"
        >
          {isMock ? 'Mock Upgrade (Free)' : 'Upgrade Now - $10/mo'}
        </button>
        
        <p className="mt-4 text-[10px] text-zinc-500">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
};

// --- 3. LOGIN PROMPT MODAL (Soft "Sign in to export") ---
interface LoginPromptModalProps {
  onClose: () => void;
  onSignIn: () => void;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ onClose, onSignIn }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] p-6 rounded-xl shadow-2xl w-80 text-center border border-zinc-800 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="w-12 h-12 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4 text-2xl">
          💾
        </div>
        
        <h3 className="text-lg font-bold text-white mb-2">Save Your Work</h3>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Sign in to export your photos for free. No credit card required.
        </p>

        <button 
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-2.5 px-4 rounded hover:bg-zinc-200 transition-all mb-3"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wide">Sign in with Google</span>
        </button>
        
        <button onClick={onClose} className="text-[10px] text-zinc-600 hover:text-zinc-400 underline">
          Cancel
        </button>
      </div>
    </div>
  );
};
