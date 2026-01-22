import React from 'react';
import TopBar from './components/TopBar'; // Reusing your TopBar for consistency

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-zinc-300 font-sans selection:bg-blue-500/30">
      {/* Simple Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center px-6 bg-[#1a1a1a]">
        <h1 className="text-sm font-bold tracking-widest text-white uppercase">F/STOP 64 Privacy Policy</h1>
      </div>

      <div className="max-w-3xl mx-auto py-12 px-6 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl text-white font-bold mb-4">1. The Short Version</h2>
          <p>
            We respect your privacy. <strong>We do not view, store, or sell your photos.</strong> F/STOP 64 runs primarily in your browser. 
            When you edit a photo, the image data stays on your device. We only store your account info (email) and your saved presets.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">2. Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li><strong>Account Information:</strong> When you sign up via Google, we receive your email address and basic profile info to create your account.</li>
            <li><strong>Presets & Settings:</strong> If you save custom presets, we store those parameters in our database so you can access them later.</li>
            <li><strong>Usage Data:</strong> We track basic usage (e.g., "number of exports") to manage free/pro quotas.</li>
            <li><strong>Payment Data:</strong> All payments are processed by <strong>Stripe</strong>. We never see or store your credit card details.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">3. How We Process Images</h2>
          <p>
            Unlike other cloud editors, F/STOP 64 processes your images <strong>locally on your device</strong> using WebGL and Canvas technologies. 
            Your original photos and exported edits are not uploaded to our servers, meaning we technically cannot see them even if we wanted to.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">4. Third-Party Services</h2>
          <p className="mb-2">We rely on trusted third parties to keep the lights on:</p>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li><strong>Supabase:</strong> hosting our database and authentication.</li>
            <li><strong>Stripe:</strong> processing secure payments.</li>
            <li><strong>Vercel:</strong> hosting the website infrastructure.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">5. Your Rights</h2>
          <p>
            You can delete your account or cancel your subscription at any time. 
            Since we don't store your photos, there is no "image history" for us to delete—it's already only on your computer. 
            To request full account deletion, contact support or use the "Manage Subscription" portal.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">6. Contact</h2>
          <p>
            For privacy concerns, please email us at <strong>support@fstop64.com</strong> (or your actual email).
          </p>
        </section>
        
        <div className="pt-8 border-t border-zinc-800 text-zinc-500 text-xs">
            Last Updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default Privacy;
