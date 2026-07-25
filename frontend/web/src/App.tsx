import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';
import RightCoachPanel from './components/layout/RightCoachPanel';

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLightMode, setIsLightMode] = useState(true);
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  // Toggle body class for light mode
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  return (
    <div className="flex h-screen w-full bg-surface text-text-primary overflow-hidden font-sans bg-micro-grid">
      {/* Left Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        isLightMode={isLightMode}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300">
        <TopHeader 
          isLightMode={isLightMode} 
          toggleTheme={() => setIsLightMode(!isLightMode)} 
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto w-full relative">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Right AI Coach Panel */}
      <RightCoachPanel isOpen={isCoachOpen} toggleCoach={() => setIsCoachOpen(!isCoachOpen)} />
      
      {/* Floating AI Bubble (When Coach is closed) */}
      {!isCoachOpen && (
        <button 
          onClick={() => setIsCoachOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-glow bg-card border border-gold flex items-center justify-center hover:scale-105 transition-transform z-50 cursor-pointer"
        >
          <img src="https://i.pravatar.cc/100?img=5" alt="Rachel AI" className="w-10 h-10 rounded-full" />
        </button>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
