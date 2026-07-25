import { Heart } from 'lucide-react';

export default function LiveVitalsWidget() {
  return (
    <div className="glass-card p-6 relative group h-full">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse"></span>
        <h3 className="font-bold text-text-primary">Live Vitals</h3>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-surface border border-gold-border p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-text-secondary uppercase mb-1">BPM</span>
          <div className="flex items-center gap-1">
            <span className="text-3xl font-extrabold text-text-primary">62</span>
            <Heart size={16} className="text-brand-red" fill="currentColor" />
          </div>
        </div>

        <div className="flex-1 bg-surface border border-gold-border p-4 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-text-secondary uppercase mb-1">Steps</span>
          <span className="text-2xl font-extrabold text-text-primary">4,281</span>
        </div>
      </div>

      {/* Simulated Live ECG Wave (Requested feature) */}
      <div className="w-full h-12 overflow-hidden relative opacity-70">
        <svg viewBox="0 0 400 40" className="w-[200%] h-full stroke-brand-green absolute -left-1/2 animate-[slide_3s_linear_infinite]" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* A simple repeated ECG wave pattern */}
          <path d="M0 20 L40 20 L50 10 L60 30 L70 20 L100 20 L140 20 L150 10 L160 30 L170 20 L200 20 L240 20 L250 10 L260 30 L270 20 L300 20 L340 20 L350 10 L360 30 L370 20 L400 20" className="drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]"/>
        </svg>
      </div>

      <style>{`
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
      `}</style>
    </div>
  );
}
