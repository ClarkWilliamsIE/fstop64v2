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
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">Member Access</h2>
        <p className="text-zinc-400 text-xs mb-8">Sign in to sync your exports and access Pro features.</p>

        <button 
          onClick={onAction}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 px-4 rounded hover:bg-zinc-200 transition-all mb-4"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          <span className="text-sm">Continue with Google</span>
        </button>
        
        <p className="mt-6 text-[10px] text-zinc-500 leading-normal">
          By continuing, you agree to our<br/>
          <a href="/terms" target="_blank" className="underline hover:text-zinc-300">Terms of Service</a> and <a href="/privacy" target="_blank" className="underline hover:text-zinc-300">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

// --- 2. PAYWALL MODAL (Honest/Indie Version) ---
interface PaywallModalProps {
  onClose: () => void;
  onAction: () => void;
  isMock: boolean;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, onAction, isMock }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md select-none p-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl w-[440px] text-center border border-zinc-700 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Subtle Gradient Glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent blur-sm"></div>

        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="w-14 h-14 bg-zinc-800 rounded-full mx-auto flex items-center justify-center border border-zinc-700 mb-4 text-2xl shadow-lg">
             ✨
          </div>
          <h2 className="text-xl font-bold text-white mb-1 tracking-wide">Become a Supporter</h2>
          <p className="text-zinc-400 text-xs">Unlocking batch tools for power users.</p>
        </div>

        {/* The Promise Box (Matching About Page) */}
        <div className="bg-zinc-900/80 p-4 rounded-lg border border-zinc-700/50 mb-6 text-left">
            <h3 className="text-white font-bold mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                 <span className="text-green-500">NZD $2.00</span>
                 <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-700">The Promise</span>
              </span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This price helps cover server costs. It will <strong>never increase</strong> for you. 
              No hidden tiers, no rug pulls. Just a fair price for a useful tool.
            </p>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-8 text-left px-2">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">What you get</p>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="text-blue-500 font-bold">✓</span> Unlimited High-Res Exports
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="text-blue-500 font-bold">✓</span> Batch Processing (Download All)
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="text-blue-500 font-bold">✓</span> Support Independent Dev 🇳🇿
          </div>
        </div>

        <button 
          onClick={onAction}
          className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 px-6 rounded-lg shadow-lg transform transition-all active:scale-[0.98] uppercase tracking-wider text-xs"
        >
          {isMock ? 'Mock Upgrade (Free)' : 'Support F/STOP 64 - $2 NZD/mo'}
        </button>
        
        <p className="mt-4 text-[10px] text-zinc-600">
          Secure payment via Stripe. Cancel instantly anytime.
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

// --- 4. EXPORT OPTIONS MODAL (Quality Selector) ---
interface ExportOptionsModalProps {
  onClose: () => void;
  onConfirm: (quality: number) => void;
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({ onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] p-6 rounded-xl shadow-2xl w-80 text-center border border-zinc-800 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h3 className="text-lg font-bold text-white mb-4">Select Quality</h3>
        
        <div className="space-y-2">
          {/* Option 1: Web */}
          <button 
            onClick={() => onConfirm(0.6)}
            className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 group"
          >
            <div className="text-left">
              <div className="text-xs font-bold text-zinc-300 group-hover:text-white">Web / Email</div>
              <div className="text-[10px] text-zinc-500">Fast • ~500KB</div>
            </div>
            <span className="text-xs text-zinc-500 font-mono">60%</span>
          </button>

          {/* Option 2: Social */}
          <button 
            onClick={() => onConfirm(0.8)}
            className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 group"
          >
             <div className="text-left">
              <div className="text-xs font-bold text-zinc-300 group-hover:text-white">Social Media</div>
              <div className="text-[10px] text-zinc-500">Balanced • ~2MB</div>
            </div>
             <span className="text-xs text-zinc-500 font-mono">80%</span>
          </button>

          {/* Option 3: Print (Standard) */}
          <button 
            onClick={() => onConfirm(0.92)}
            className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-600 group ring-1 ring-zinc-700"
          >
             <div className="text-left">
              <div className="text-xs font-bold text-white">Print Ready</div>
              <div className="text-[10px] text-zinc-400">Standard • ~5MB</div>
            </div>
             <span className="text-xs text-zinc-400 font-mono">92%</span>
          </button>

          {/* Option 4: Ultra */}
          <button 
            onClick={() => onConfirm(1.0)}
            className="w-full flex items-center justify-between p-3 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-800 group"
          >
             <div className="text-left">
              <div className="text-xs font-bold text-blue-200">Ultra / Lossless</div>
              <div className="text-[10px] text-blue-400">Max Detail • ~10MB+</div>
            </div>
             <span className="text-xs text-blue-400 font-mono">100%</span>
          </button>
        </div>
        
        <button onClick={onClose} className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 underline">
          Cancel
        </button>
      </div>
    </div>
  );
};
