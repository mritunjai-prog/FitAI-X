import { useState, useEffect } from 'react';

export default function LiveVitalsGraph({ bpm = 0, vitals }: { bpm?: number, vitals?: any }) {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const displayBpm = bpm > 0 ? bpm : (vitals?.bpm || '--');

  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-2xl p-5 flex flex-col shadow-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase">Live Vitals</h3>
        <span className="flex items-center gap-2 text-xs font-semibold text-brand-red">
          <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
          LIVE
        </span>
      </div>

      {/* BPM Section */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-text-primary tracking-tighter">{displayBpm}</span>
          <span className="text-xs font-bold text-text-secondary">BPM</span>
      </div>

      {/* ECG SVG */}
      <div className="h-16 w-full relative mb-6">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full stroke-brand-red fill-none" strokeWidth="1.5">
          <path 
            d="M 0 15 L 20 15 L 25 5 L 30 25 L 35 15 L 50 15 L 55 10 L 60 20 L 65 15 L 80 15 L 85 5 L 90 25 L 95 15 L 100 15"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-1000 ease-linear"
            strokeDasharray="200"
            strokeDashoffset={loaded ? "0" : "200"}
          />
        </svg>
      </div>

      {/* Body Battery Section */}
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-2">
          <h4 className="font-bold text-xs tracking-widest text-text-secondary uppercase">Fatigue Prediction</h4>
          <span className="text-sm font-bold text-brand-blue">{vitals?.bodyBattery || '--'}%</span>
        </div>
        <div className="h-16 w-full relative">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            {/* Gradient Fill */}
            <defs>
              <line x1="0" y1="20" x2="100" y2="20" stroke="var(--color-gold-border)" strokeWidth="0.5" />
              <line x1="0" y1="40" x2="100" y2="40" stroke="var(--color-gold-border)" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="100" y2="60" stroke="var(--color-gold-border)" strokeWidth="0.5" />
              <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-blue, #3B82F6)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--color-brand-blue, #3B82F6)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path 
              d="M 0 10 Q 20 5 40 20 T 80 30 T 100 25 L 100 40 L 0 40 Z" 
              fill="url(#batteryGrad)"
            />
            {/* Line */}
            <path 
              d="M 0 10 Q 20 5 40 20 T 80 30 T 100 25" 
              fill="none" 
              stroke="var(--color-brand-blue, #3B82F6)" 
              strokeWidth="2" 
              strokeLinecap="round"
              className="drop-shadow-[0_0_5px_rgba(59,130,246,0.6)]"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
