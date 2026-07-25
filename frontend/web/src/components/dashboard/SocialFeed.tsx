import SocialAvatars from './SocialAvatars';

export default function SocialFeed({ feedItems = [] }: { feedItems?: any[] }) {
  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-[24px] p-6 flex flex-col shadow-lg h-[320px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase">Live Workout Feed</h3>
        <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
      </div>

      {/* Stories / Active Friends */}
      <div className="mb-6 -mx-2 border-b border-gold-border pb-4 flex-shrink-0 min-w-0">
        <SocialAvatars />
      </div>

      <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Render Live Feed Items */}
        {feedItems.length > 0 ? (
          feedItems.map((item, idx) => (
            <div key={item.id || idx} className="bg-card-inner border border-gold-border/50 rounded-xl p-4 transition-colors hover:bg-card-inner/80 cursor-pointer group animate-fade-in-down">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sm text-text-primary group-hover:text-gold transition-colors">{item.name}</span>
                <span className="text-xs font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-sm">{item.time}</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {item.action}
              </p>
            </div>
          ))
        ) : (
          <div className="text-xs text-text-secondary opacity-50 italic text-center py-4">Waiting for live activity...</div>
        )}

        {/* Static Older Item for visual padding if feed is small */}
        <div className="bg-card-inner border border-gold-border/50 rounded-xl p-4 opacity-70">
          <div className="flex justify-between items-start mb-2">
            <span className="font-bold text-sm text-text-primary">Alex M.</span>
            <span className="text-[10px] text-text-secondary">2h ago</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Completed 45 min HIIT session. Max HR 182 BPM.
          </p>
        </div>
      </div>
    </div>
  );
}
