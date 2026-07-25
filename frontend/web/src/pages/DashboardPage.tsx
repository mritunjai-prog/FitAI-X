import { useEffect, useState } from 'react';
import WeeklyMicrocycle from '../components/dashboard/WeeklyMicrocycle';
import WorkoutFocus from '../components/dashboard/WorkoutFocus';
import ConcentricActivityRings from '../components/dashboard/ConcentricActivityRings';
import LiveVitalsGraph from '../components/dashboard/LiveVitalsGraph';
import RecoveryRadarChart from '../components/dashboard/RecoveryRadarChart';
import SevenDayLoad from '../components/dashboard/SevenDayLoad';
import SocialFeed from '../components/dashboard/SocialFeed';
import LeaderboardStreak from '../components/dashboard/LeaderboardStreak';
import AiDailyInsight from '../components/dashboard/AiDailyInsight';
import { useRealtimeSocket } from '../hooks/useRealtimeSocket';

function useTheme() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
    
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export default function DashboardPage() {
  const theme = useTheme();
  const { heartRate, feedItems } = useRealtimeSocket();

  return (
    <div key={theme} className="max-w-[1600px] mx-auto w-full p-4 md:p-8 animate-fade-in">
      
      {/* Top Row: Weekly Planner */}
      <div className="mb-6 w-full">
        <WeeklyMicrocycle />
      </div>

      {/* Main Grid: Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column (Workout Focus) */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6">
          <WorkoutFocus />
          <div className="flex-1 flex flex-col justify-end">
            <AiDailyInsight />
          </div>
        </div>

        {/* Right Side (Metrics & Social) */}
        <div className="w-full lg:w-[60%] flex flex-col xl:flex-row gap-6">
          
          {/* Inner Column 1: Health Metrics */}
          <div className="flex-1 flex flex-col gap-6">
            <LiveVitalsGraph bpm={heartRate} />
            <div className="flex-1">
              <SevenDayLoad />
            </div>
            <RecoveryRadarChart />
          </div>

          {/* Inner Column 2: Social & Activity */}
          <div className="flex-1 flex flex-col gap-6">
            <LeaderboardStreak />
            <ConcentricActivityRings />
            <div className="flex-1 flex flex-col justify-end">
              <SocialFeed feedItems={feedItems} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
