import { Flame, Trophy, TrendingUp } from 'lucide-react';

export default function LeaderboardStreak({ vitals }: { vitals?: any }) {
  const currentStreak = vitals?.currentStreak || 0;
  const xpTotal = vitals?.xpTotal || 0;

  const leaderboard = [
    { rank: 1, name: 'You', score: xpTotal, isMe: true },
    { rank: 2, name: 'David M.', score: Math.max(0, xpTotal - 150), isMe: false },
    { rank: 3, name: 'Sarah J.', score: Math.max(0, xpTotal - 320), isMe: false },
  ];

  // Sort by score just in case
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.forEach((item, idx) => item.rank = idx + 1);

  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-[24px] p-6 shadow-lg flex flex-col gap-6 h-full max-h-[400px]">
      {/* Streak Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase mb-1">Current Streak</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-[var(--color-text-gold)] tracking-tighter">{currentStreak}</span>
            <span className="text-sm font-bold text-text-secondary mb-1">Days</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-full bg-brand-amber/10 border border-brand-amber/30 flex items-center justify-center text-brand-amber shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Flame size={24} fill="currentColor" />
        </div>
      </div>

      <div className="w-full h-[1px] bg-gold-border"></div>

      {/* Leaderboard Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <Trophy size={16} className="text-[var(--color-text-gold)]" />
          <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase">Weekly Top</h3>
        </div>
        
        <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
          {leaderboard.map((user, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                user.isMe 
                  ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/30 text-[var(--color-text-gold)] shadow-[0_0_15px_rgba(245,196,0,0.1)]' 
                  : 'bg-card-inner border-[var(--color-gold-border)] text-text-primary hover:bg-[var(--color-gold)]/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-black text-sm w-4 text-center ${user.rank === 1 ? 'text-[var(--color-text-gold)]' : 'text-text-secondary'}`}>
                  {user.rank}
                </span>
                <span className="font-bold text-sm">{user.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-sm">{user.score}</span>
                <TrendingUp size={12} className={user.isMe ? 'text-[var(--color-text-gold)]' : 'text-brand-green'} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
