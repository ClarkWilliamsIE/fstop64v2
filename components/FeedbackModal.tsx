import React, { useState } from 'react';
import { submitFeedback } from '../lib/supabase';

interface FeedbackModalProps {
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus('sending');
    
    const { error } = await submitFeedback(text, email);
    
    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      setTimeout(onClose, 1500); // Close after 1.5s
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] p-6 rounded-xl shadow-2xl w-96 border border-zinc-800 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <span>💡</span> Suggest a Feature
        </h3>
        <p className="text-xs text-zinc-400 mb-4">What should we build next? Bugs? Ideas?</p>

        {status === 'success' ? (
          <div className="py-8 text-center text-green-500 font-bold animate-pulse">
            Thanks! We received your idea.
          </div>
        ) : (
          <div className="space-y-3">
            <textarea 
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 resize-none h-32 placeholder:text-zinc-600"
              placeholder="I wish this app could..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            
            <input 
              type="email"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 placeholder:text-zinc-600"
              placeholder="Email (optional, for updates)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button 
              onClick={handleSubmit}
              disabled={!text.trim() || status === 'sending'}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {status === 'sending' ? 'Sending...' : 'Submit Idea'}
            </button>
            
            {status === 'error' && <p className="text-xs text-red-500 text-center">Something went wrong. Try again.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
