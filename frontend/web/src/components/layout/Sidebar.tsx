import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Dumbbell,
  BarChart2, 
  Clock, 
  PanelLeftClose,
  Calendar,
  Utensils
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isLightMode: boolean;
}

export default function Sidebar({ isOpen, toggleSidebar, isLightMode }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside 
      className={`h-full bg-card-inner border-r border-gold-border flex flex-col transition-all duration-300 relative ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className={`flex flex-shrink-0 items-center h-16 border-b border-gold-border overflow-hidden ${isOpen ? 'justify-between px-3' : 'justify-center px-4'}`}>
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 min-w-[40px] min-h-[40px] rounded-full border-2 border-gold flex-shrink-0 overflow-hidden drop-shadow-md">
            <img 
              src={isLightMode ? "/logo-light.png" : "/logo-dark.png"} 
              alt="FitAI X Logo" 
              className="absolute inset-0 h-full w-full object-cover scale-[1.08]"
              onError={(e) => {
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.style.display = 'none';
                  parent.nextElementSibling?.classList.remove('hidden');
                }
              }}
            />
          </div>
          {/* Fallback Text if image not found AND sidebar is closed */}
          <h1 className={`font-extrabold text-xl tracking-tight text-text-gold hidden flex-shrink-0 ${isOpen ? 'hidden' : ''}`}>
            X
          </h1>
          {/* Main Text when sidebar is open */}
          {isOpen && (
            <h1 className="font-extrabold text-xl tracking-tight text-text-gold whitespace-nowrap">
              FitAI X
            </h1>
          )}
        </div>
        
        {/* ChatGPT Style Actions (When Open) */}
        {isOpen && (
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleSidebar} 
              className="text-text-secondary hover:text-text-primary hover:bg-card transition-all flex items-center justify-center p-1.5 rounded-lg group"
              title="Close sidebar"
            >
              <PanelLeftClose size={20} className="group-hover:scale-95 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 pt-6 pb-6 px-3 flex flex-col gap-2">
        {isOpen && (
          <div className="px-3 mb-1">
            <span className="text-[10px] font-bold tracking-widest text-text-secondary/70 uppercase">Main Menu</span>
          </div>
        )}
        <NavItem icon={<Home size={20} />} label="Dashboard" active={isActive('/')} isOpen={isOpen} onClick={() => navigate('/')} />
        <NavItem icon={<Dumbbell size={20} />} label="Workout Builder" active={isActive('/workout')} isOpen={isOpen} onClick={() => navigate('/workout')} />
        <NavItem icon={<Utensils size={20} />} label="Meal Planner" active={isActive('/meals')} isOpen={isOpen} onClick={() => navigate('/meals')} />
        <NavItem icon={<Calendar size={20} />} label="Smart Calendar" active={isActive('/calendar')} isOpen={isOpen} onClick={() => navigate('/calendar')} />
        <NavItem icon={<BarChart2 size={20} />} label="Analytics" active={isActive('/analytics')} isOpen={isOpen} onClick={() => navigate('/analytics')} />
        <NavItem icon={<Clock size={20} />} label="AI Timeline" active={isActive('/timeline')} isOpen={isOpen} onClick={() => navigate('/timeline')} />
      </nav>

      {/* Bottom Actions (Merged Profile & Logout) */}
      <div className="mt-auto p-3 border-t border-gold-border">
        <div 
          className={`flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-card-inner text-left cursor-pointer ${
            !isOpen ? 'justify-center flex-col' : ''
          } ${isActive('/profile') ? 'bg-card ring-1 ring-gold/20 shadow-sm' : ''}`}
        >
          {/* Profile Clickable Area */}
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
            onClick={() => navigate('/profile')}
            title="View Profile"
          >
            <div className="relative flex-shrink-0">
              <img src="https://i.pravatar.cc/150?img=11" alt="User" className="w-10 h-10 rounded-full border border-gold-border" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green rounded-full border-2 border-card-inner"></div>
            </div>
            
            {isOpen && (
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <span className={`font-bold text-sm truncate ${isActive('/profile') ? 'text-text-gold' : 'text-text-primary'}`}>
                  Alex Mercer
                </span>
              </div>
            )}
          </div>

          {/* Logout Action */}
          <button 
            className="p-2 rounded-lg text-text-secondary hover:text-brand-red hover:bg-brand-red/10 transition-colors flex-shrink-0"
            title="Logout"
            onClick={(e) => {
              e.stopPropagation(); // Prevent clicking profile
              console.log("Logout clicked");
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" x2="9" y1="12" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isOpen: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, isOpen, onClick }: NavItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
        active 
          ? 'bg-gold/10 text-text-gold font-bold border border-gold/20' 
          : 'text-text-secondary hover:bg-card hover:text-text-primary'
      } ${!isOpen && 'justify-center'}`}
      title={!isOpen ? label : undefined}
    >
      <div className={active ? 'text-text-gold' : 'text-text-secondary group-hover:text-text-primary'}>
        {icon}
      </div>
      {isOpen && <span>{label}</span>}
    </button>
  );
}
