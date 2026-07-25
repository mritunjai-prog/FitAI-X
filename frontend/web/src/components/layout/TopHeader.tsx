import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Sun, Moon, PanelLeft, Dumbbell, Calendar, Home as HomeIcon, ArrowRight, X } from 'lucide-react';

interface TopHeaderProps {
  isLightMode: boolean;
  toggleTheme: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function TopHeader({ isLightMode, toggleTheme, isSidebarOpen, toggleSidebar }: TopHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    if (isSearchOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);
  return (
    <header className="h-16 px-4 md:px-8 border-b border-gold-border flex items-center justify-between bg-card-inner/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle (Only visible when sidebar is closed) */}
        {!isSidebarOpen && (
          <button 
            onClick={toggleSidebar} 
            className="text-text-secondary hover:text-text-primary hover:bg-card-inner transition-all flex items-center justify-center p-2 rounded-lg group"
            title="Open sidebar"
          >
            <PanelLeft size={20} className="group-hover:scale-95 transition-transform" />
          </button>
        )}
        
        {/* Command Palette / Search */}
        <div ref={searchContainerRef} className="hidden md:flex flex-col relative z-50">
          <div className="relative flex items-center group">
            <div className="absolute left-3 text-text-secondary group-focus-within:text-gold transition-colors pointer-events-none">
              <Search size={18} />
            </div>
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search or jump to... (Ctrl+K)" 
              className={`bg-card border border-gold-border text-text-primary text-sm pl-10 pr-10 py-2 w-64 md:w-80 focus:outline-none focus:border-gold transition-all ${isSearchOpen ? 'rounded-t-lg border-b-transparent shadow-lg' : 'rounded-lg'}`}
            />
            {searchQuery && (
              <button 
                className="absolute right-3 text-text-secondary hover:text-brand-red transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 w-full bg-card border border-gold-border border-t-0 rounded-b-lg shadow-2xl overflow-hidden animate-fade-in-down">
              <div className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
                <div className="px-3 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  Quick Actions
                </div>
                
                <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-card-inner group transition-colors">
                  <div className="flex items-center gap-3 text-text-primary">
                    <Dumbbell size={16} className="text-gold" />
                    <span className="text-sm">Generate Today's Workout</span>
                  </div>
                  <ArrowRight size={14} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-card-inner group transition-colors">
                  <div className="flex items-center gap-3 text-text-primary">
                    <Calendar size={16} className="text-brand-green" />
                    <span className="text-sm">Reschedule Session</span>
                  </div>
                  <ArrowRight size={14} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="px-3 py-2 mt-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  Navigation
                </div>

                <button 
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-card-inner group transition-colors"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <div className="flex items-center gap-3 text-text-primary">
                    <HomeIcon size={16} className="text-text-secondary" />
                    <span className="text-sm">Go to Dashboard</span>
                  </div>
                  <div className="text-[10px] text-text-secondary font-mono bg-surface px-1.5 rounded border border-gold-border">G D</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full border border-gold-border bg-surface text-text-secondary hover:text-gold transition-colors"
          title="Toggle Theme"
        >
          {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-full border border-gold-border bg-surface text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={18} />
          {/* Unread Badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-red rounded-full border border-surface"></span>
        </button>

        {/* Top Profile Avatar (Mobile mainly, or redundant visual) */}
        <img 
          src="https://i.pravatar.cc/150?img=11" 
          alt="Profile" 
          className="w-8 h-8 rounded-full border border-gold md:hidden" 
        />
      </div>
    </header>
  );
}
