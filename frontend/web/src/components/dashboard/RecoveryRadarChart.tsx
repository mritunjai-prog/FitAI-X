import { useState, useEffect } from 'react';

export default function RecoveryRadarChart({ vitals }: { vitals?: any }) {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const upr = vitals?.recoveryUpper ?? 0.8;
  const lwr = vitals?.recoveryLower ?? 0.6;
  const cor = vitals?.recoveryCore ?? 0.9;
  const crd = vitals?.recoveryCardio ?? 0.7;

  const ptUpr = `50,${50 - upr * 40}`;
  const ptLwr = `${50 + lwr * 40},50`;
  const ptCor = `50,${50 + cor * 40}`;
  const ptCrd = `${50 - crd * 40},50`;
  const pointsStr = `${ptUpr} ${ptLwr} ${ptCor} ${ptCrd}`;

  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-2xl p-5 flex flex-col shadow-lg h-[320px]">
      <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase w-full text-left mb-6">Recovery Radar</h3>
      
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="relative w-48 h-48 flex-shrink-0">
        {/* Radar SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          {/* Background Web / Rings */}
          <polygon points="50,10 90,50 50,90 10,50" fill="none" stroke="var(--color-gold-border)" strokeWidth="1" />
          <polygon points="50,25 75,50 50,75 25,50" fill="none" stroke="var(--color-gold-border)" strokeWidth="1" strokeDasharray="2,2" />
          <polygon points="50,40 60,50 50,60 40,50" fill="none" stroke="var(--color-gold-border)" strokeWidth="1" strokeDasharray="2,2" />
          
          {/* Center Crosshairs */}
          <line x1="50" y1="10" x2="50" y2="90" stroke="var(--color-gold-border)" strokeWidth="1" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="var(--color-gold-border)" strokeWidth="1" />

          {/* Data Polygon (The Diamond) */}
          <polygon 
            points={loaded ? pointsStr : "50,50 50,50 50,50 50,50"} 
            fill="rgba(245, 196, 0, 0.2)" 
            stroke="var(--color-gold, #F5C400)" 
            strokeWidth="2" 
            strokeLinejoin="round"
            className="drop-shadow-[0_0_6px_rgba(245,196,0,0.5)] transition-all duration-1000 ease-in-out"
          />

          {/* Data Points */}
          <g className={`transition-opacity duration-1000 delay-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
            <circle cx="50" cy={50 - upr * 40} r="3" fill="var(--color-gold, #F5C400)" />
            <circle cx={50 + lwr * 40} cy="50" r="3" fill="var(--color-gold, #F5C400)" />
            <circle cx="50" cy={50 + cor * 40} r="3" fill="var(--color-gold, #F5C400)" />
            <circle cx={50 - crd * 40} cy="50" r="3" fill="var(--color-gold, #F5C400)" />
          </g>
        </svg>

        {/* Labels positioned absolutely around the SVG */}
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text-secondary tracking-widest">UPR</span>
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text-secondary tracking-widest">COR</span>
        <span className="absolute top-1/2 -left-6 -translate-y-1/2 text-[10px] font-bold text-text-secondary tracking-widest">CRD</span>
        <span className="absolute top-1/2 -right-6 -translate-y-1/2 text-[10px] font-bold text-text-secondary tracking-widest">LWR</span>
        </div>
      </div>
    </div>
  );
}
