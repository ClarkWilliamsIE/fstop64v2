import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-zinc-300 font-sans selection:bg-blue-500/30">
      <div className="h-14 border-b border-zinc-800 flex items-center px-6 bg-[#1a1a1a]">
        <h1 className="text-sm font-bold tracking-widest text-white uppercase">F/STOP 64 Terms of Service</h1>
      </div>

      <div className="max-w-3xl mx-auto py-12 px-6 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl text-white font-bold mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using F/STOP 64 ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">2. Description of Service</h2>
          <p>
            F/STOP 64 is a web-based image editing tool. We provide both free and paid ("Pro") tiers. 
            We reserve the right to modify, suspend, or discontinue the Service at any time, though we will do our best to notify users of major changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">3. User Content</h2>
          <p>
            You retain full ownership of the images you edit. By using the Service, you grant us a temporary, limited license to process your images 
            locally on your device. Since processing happens client-side, we do not claim any ownership or storage rights over your creative work.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">4. Pro Subscriptions & Refunds</h2>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li><strong>Billing:</strong> Pro memberships are billed monthly or annually via Stripe.</li>
            <li><strong>Cancellation:</strong> You may cancel at any time via the "Manage Subscription" portal. Access continues until the end of the billing cycle.</li>
            <li><strong>Refunds:</strong> Refunds are handled on a case-by-case basis. Please contact support if you believe there was a billing error.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg text-white font-bold mb-3">5. Limitation of Liability</h2>
          <p>
            The Service is provided "as is". We are not liable for any data loss, image corruption, or damages resulting from the use of our tool. 
            Always keep backups of your original photos.
          </p>
        </section>

        <div className="pt-8 border-t border-zinc-800 text-zinc-500 text-xs">
            Last Updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default Terms;
