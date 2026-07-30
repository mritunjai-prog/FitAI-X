import { useState, useEffect } from 'react';

export default function ConcentricActivityRings({ vitals }: { vitals?: any }) {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // SVG properties
  const size = 160;
  const strokeWidth = 14;
  const center = size / 2;
  
  // Rings configuration (outer to inner)
  const rings = [
    { name: 'Move', color: '#3B82F6', percentage: Math.min(100, (vitals?.moveProgress || 0) * 100), radius: 66 },
    { name: 'Water', color: '#10B981', percentage: Math.min(100, (vitals?.waterProgress || 0) * 100), radius: 48 },
    { name: 'Train', color: '#F5C400', percentage: Math.min(100, (vitals?.trainProgress || 0) * 100), radius: 30 }
  ];

  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-2xl p-5 flex flex-col shadow-lg overflow-hidden h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase">Today's Activity</h3>
      </div>
      
      <div className="flex-1 flex justify-between items-center px-2">
        <div className="flex flex-col gap-4">
          {rings.map((ring, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ring.color, boxShadow: `0 0 8px ${ring.color}80` }}></div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-primary tracking-wide">{ring.name}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
          {rings.map((ring, idx) => {
            const circumference = 2 * Math.PI * ring.radius;
            const strokeDasharray = circumference;
            // Draw animation: start at full offset (empty), animate to target
            const targetOffset = circumference - (ring.percentage / 100) * circumference;
            const strokeDashoffset = loaded ? targetOffset : circumference;
            
            return (
              <g key={idx}>
                {/* Background Track */}
                <circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  className="opacity-10"
                />
                {/* Progress Ring */}
                <circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
              </g>
            );
          })}
        </svg>
      </div>
      </div>
    </div>
  );
}
