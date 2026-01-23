import React from 'react';

interface AboutModalProps {
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm select-none p-4" onClick={onClose}>
      <div 
        className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl w-full max-w-lg text-left border border-zinc-800 relative" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
            <span className="text-xl">👋</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Why F/STOP 64?</h2>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <p>
            I built this tool because I was tired of subscription-bloat and privacy-invasive software. 
            Photography should be about creativity, not uploading your personal memories to a black-box server.
          </p>

          <p>
            <strong>F/STOP 64 is different.</strong> All processing happens <span className="text-blue-400 font-bold">locally on your device</span>. 
            We never see your photos. We don't train AI on them. They stay yours.
          </p>

           <p>
            <strong>F/STOP 64 is 100% free for people processing 30 photos a month or less. If you want to pay to use, the low price will go toward developing new features</strong> 
          </p>

          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 my-4">
            <h3 className="text-white font-bold mb-1 flex items-center gap-2">
              <span className="text-green-500">$2.00 per month</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-wider">The Promise</span>
            </h3>
            <p className="text-xs text-zinc-400">
              This app costs less than a flat white. That price helps cover the server costs for the database and authentication. 
              It will never increase. No hidden tiers, no rug pulls. Just a fair price for a useful tool.
            </p>
          </div>

          <p>
            Thank you for supporting independent software.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Made in New Zealand 🇳🇿</span>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 hover:bg-white text-black text-xs font-bold rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
