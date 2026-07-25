import { X, Send, Bot } from 'lucide-react';

interface RightCoachPanelProps {
  isOpen: boolean;
  toggleCoach: () => void;
}

export default function RightCoachPanel({ isOpen, toggleCoach }: RightCoachPanelProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-80 h-full bg-card-inner border-l border-gold-border flex flex-col z-30 transition-transform duration-300">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gold-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="https://i.pravatar.cc/150?img=5" alt="Rachel AI" className="w-10 h-10 rounded-full border-2 border-gold shadow-glow" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green rounded-full border-2 border-card-inner"></div>
          </div>
          <div>
            <h2 className="font-extrabold text-gold text-lg">Rachel</h2>
            <div className="flex items-center gap-1 text-xs font-semibold text-brand-green">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
              Active Session
            </div>
          </div>
        </div>
        <button onClick={toggleCoach} className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-card">
          <X size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <ChatMessage 
          isAi 
          message="Morning! Your HRV is down 4% today. I suggest swapping heavy deadlifts for a lighter hypertrophy focus." 
        />
        <ChatMessage 
          isAi={false} 
          message="Sounds good. Update the plan." 
        />
        <SystemMessage 
          title="Plan Updated" 
          content="Swapped 5x5 Deadlifts → 3x12 RDLs. Rest periods adjusted to 90s." 
        />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gold-border bg-card-inner">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Message Rachel..." 
            className="w-full bg-surface border border-gold-border rounded-xl pl-4 pr-10 py-3 text-sm focus:border-gold outline-none transition-colors"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gold hover:text-gold-light hover:scale-110 transition-transform">
            <Send size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function ChatMessage({ isAi, message }: { isAi: boolean, message: string }) {
  return (
    <div className={`flex gap-2 ${isAi ? '' : 'flex-row-reverse'}`}>
      {isAi ? (
        <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 text-gold mt-1">
          <Bot size={14} />
        </div>
      ) : (
        <img src="https://i.pravatar.cc/150?img=11" className="w-6 h-6 rounded-full mt-1 border border-gold/20" alt="User" />
      )}
      <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${
        isAi 
          ? 'bg-card border border-gold-border text-text-primary rounded-tl-sm' 
          : 'bg-surface border border-gold-border text-text-primary rounded-tr-sm'
      }`}>
        {message}
      </div>
    </div>
  );
}

function SystemMessage({ title, content }: { title: string, content: string }) {
  return (
    <div className="flex gap-2 mt-2">
      <div className="w-6 h-6 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0 text-brand-green mt-1 border border-brand-green/30">
        <Bot size={14} />
      </div>
      <div className="px-4 py-3 rounded-2xl bg-brand-green/5 border border-brand-green/20 text-sm flex-1">
        <h4 className="text-brand-green font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
          {title}
        </h4>
        <p className="text-text-secondary">{content}</p>
      </div>
    </div>
  );
}
