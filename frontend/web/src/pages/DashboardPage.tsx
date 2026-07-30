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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

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

  const [vitals, setVitals] = useState<any>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>([]);
  const [insight, setInsight] = useState<any>(null);
  const [currentWorkout, setCurrentWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const loadingMessages = [
    "Rachel AI is creating your personalized fitness plan...",
    "Analyzing your onboarding profile...",
    "Generating workouts, nutrition, and schedule..."
  ];

  useEffect(() => {
    let msgInterval: any;
    if (loading) {
      msgInterval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
    }
    return () => clearInterval(msgInterval);
  }, [loading]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vitalsRes, planRes, insightRes, workoutRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/vitals`),
          fetch(`${API_URL}/dashboard/weekly-plan`),
          fetch(`${API_URL}/dashboard/insights`),
          fetch(`${API_URL}/dashboard/current-workout`)
        ]);

        if (vitalsRes.ok) setVitals(await vitalsRes.json());
        if (planRes.ok) setWeeklyPlan(await planRes.json());
        if (insightRes.ok) setInsight(await insightRes.json());
        if (workoutRes.ok) setCurrentWorkout(await workoutRes.json());
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div key={theme} className="max-w-[1600px] mx-auto w-full p-4 md:p-8 animate-fade-in">
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gold animate-pulse text-lg font-bold text-center">
            {loadingMessages[loadingMsgIdx]}
          </div>
        </div>

        {/* Top Row: Weekly Planner Skeleton */}
        <div className="mb-6 w-full glass-card h-[180px] p-6 animate-pulse">
          <div className="h-6 w-48 bg-card-inner rounded mb-6"></div>
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-6 h-3 bg-card-inner rounded"></div>
                <div className="w-full aspect-[3/4] bg-card-inner rounded-xl"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid: Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column (Workout Focus) */}
          <div className="w-full lg:w-[40%] flex flex-col gap-6">
            <div className="glass-card h-[500px] animate-pulse rounded-[24px]"></div>
            <div className="flex-1 flex flex-col justify-end">
              <div className="glass-card h-[200px] animate-pulse rounded-[24px]"></div>
            </div>
          </div>

          {/* Right Side (Metrics & Social) */}
          <div className="w-full lg:w-[60%] flex flex-col xl:flex-row gap-6">
            
            {/* Inner Column 1: Health Metrics */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="bg-card h-[160px] animate-pulse rounded-[24px]"></div>
              <div className="flex-1 bg-card animate-pulse rounded-[24px]"></div>
              <div className="bg-card h-[320px] animate-pulse rounded-[24px]"></div>
            </div>

            {/* Inner Column 2: Social & Activity */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="bg-card h-[220px] animate-pulse rounded-[24px]"></div>
              <div className="bg-card h-[280px] animate-pulse rounded-[24px]"></div>
              <div className="flex-1 bg-card animate-pulse rounded-[24px]"></div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={theme} className="max-w-[1600px] mx-auto w-full p-4 md:p-8 animate-fade-in">
      
      {/* Top Row: Weekly Planner */}
      <div className="mb-6 w-full">
        <WeeklyMicrocycle plan={weeklyPlan} />
      </div>

      {/* Main Grid: Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column (Workout Focus) */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6">
          <WorkoutFocus workout={currentWorkout} />
          <div className="flex-1 flex flex-col justify-end">
            <AiDailyInsight insight={insight} />
          </div>
        </div>

        {/* Right Side (Metrics & Social) */}
        <div className="w-full lg:w-[60%] flex flex-col xl:flex-row gap-6">
          
          {/* Inner Column 1: Health Metrics */}
          <div className="flex-1 flex flex-col gap-6">
            <LiveVitalsGraph bpm={heartRate} vitals={vitals} />
            <div className="flex-1">
              <SevenDayLoad vitals={vitals} />
            </div>
            <RecoveryRadarChart vitals={vitals} />
          </div>

          {/* Inner Column 2: Social & Activity */}
          <div className="flex-1 flex flex-col gap-6">
            <LeaderboardStreak vitals={vitals} />
            <ConcentricActivityRings vitals={vitals} />
            <div className="flex-1 flex flex-col justify-end">
              <SocialFeed feedItems={feedItems} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
