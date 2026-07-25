import { useState, useEffect } from 'react';

export default function SevenDayLoad() {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    // Slight delay so the user sees the animation start
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const data = [
    { day: 'M', val: 0.3 },
    { day: 'T', val: 0.5 },
    { day: 'W', val: 0.8 },
    { day: 'T', val: 0.6 },
    { day: 'F', val: 0.4 },
    { day: 'S', val: 0.9 },
    { day: 'S', val: 0.7 },
  ];

  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-2xl p-5 flex flex-col shadow-lg h-full">
      <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase mb-6">7-Day Load</h3>
      
      <div className="flex items-end justify-between flex-1 w-full gap-2 mt-4">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1 group h-full">
            <div className="w-full bg-card-inner rounded-t-sm rounded-b-sm overflow-hidden h-full flex items-end">
              <div 
                className="w-full bg-brand-green transition-all duration-1000 ease-out rounded-t-sm group-hover:bg-[var(--color-gold)] shadow-[0_0_10px_rgba(245,196,0,0)] group-hover:shadow-[0_0_15px_rgba(245,196,0,0.5)]"
                style={{ height: loaded ? `${item.val * 100}%` : '0%' }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-text-secondary">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
