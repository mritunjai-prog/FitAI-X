import React, { useState, useEffect } from 'react';
import { Activity, Heart, Dumbbell, AlertTriangle, Sparkles, Watch, PlusCircle, Loader2, Shield, Edit2, Link, Target, Crosshair } from 'lucide-react';
import axios from 'axios';

// Interfaces for our fetched data
interface ProfileData {
  identity: {
    name: string;
    email: string;
    avatar: string;
    totalWorkouts: number;
    currentStreak: number;
  };
  fitnessProfile: {
    height: number;
    weight: number;
    age: number;
    goals: string[];
    activeGoals: string[];
  };
  telemetry: {
    oura: { status: string; battery?: number };
    polar: { status: string };
    appleWatch: { status: string };
  };
  aiPreferences: {
    adaptiveProgression: boolean;
    voiceFeedback: boolean;
    nutritionSync: boolean;
  };
  equipment: {
    commercialGym: boolean;
    homeGym: boolean;
    dumbbellsOnly: boolean;
  };
  settings: {
    publicProfile: boolean;
    twoFactorAuth: boolean;
    workoutReminders: boolean;
    recoveryAlerts: boolean;
  };
  muscleBalance: any[];
  injuryModel: any[];
}

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

export default function ProfilePage() {
  const theme = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [localPreferences, setLocalPreferences] = useState<any>(null);
  const [localSettings, setLocalSettings] = useState<any>(null);
  
  // Local state for UI toggles
  const [activeEquip, setActiveEquip] = useState<string[]>(['Dumbbells', 'Barbell']);
  
  // Dynamic Goals Simulation
  const [activeGoalOverride, setActiveGoalOverride] = useState<string | null>(null);
  const [isRecalculatingGoal, setIsRecalculatingGoal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/v1/profile');
        setProfile(response.data);
        setLocalPreferences(response.data.aiPreferences);
        setLocalSettings(response.data.settings);
      } catch (err) {
        console.error('Failed to fetch profile', err);
        setError('Failed to load profile data. Ensure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const toggleEquipment = (eq: string) => {
    setActiveEquip(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--color-gold)] drop-shadow-[0_0_15px_rgba(255,170,0,0.5)]" />
          <p className="text-sm text-text-secondary tracking-widest uppercase font-bold animate-pulse">Loading Engine</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-full w-full items-center justify-center flex-col gap-4 min-h-[500px]">
        <div className="w-20 h-20 rounded-full bg-brand-red/10 border border-brand-red/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.2)]">
          <AlertTriangle className="w-10 h-10 text-brand-red" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Sync Failed</h2>
        <p className="text-text-secondary font-medium text-center max-w-md">{error || 'Unknown error occurred.'}</p>
      </div>
    );
  }

  const { identity, fitnessProfile, telemetry, injuryModel } = profile;
  
  // Using some mock data for equipment options
  const equipmentOptions = ['Dumbbells', 'Barbell', 'Resistance Bands', 'Pull-up Bar', 'Full Gym'];

  return (
    <div key={theme} className="w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col h-full animate-fade-in pb-20 overflow-y-auto relative">
      {/* High-tech grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(var(--color-gold-border)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
      
      <header className="mb-8 relative z-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary mb-2 tracking-tight">Profile & Settings</h1>
          <p className="text-lg font-medium text-text-secondary">Configure physical baselines, hardware integrations, and neural protocol preferences.</p>
        </div>
      </header>

      {/* Goal Recalculation Overlay */}
      {isRecalculatingGoal && (
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-xl">
          <Loader2 className="w-16 h-16 animate-spin text-gold mb-4" />
          <h2 className="text-3xl font-display font-bold text-text-primary mb-2">Recalculating Ecosystem</h2>
          <p className="text-text-secondary">Adjusting workouts, meal plans, and recovery targets to match your new goal.</p>
        </div>
      )}

      {/* 3-COLUMN POWER LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* === COLUMN 1: FITNESS & PREFERENCES (3 Cols) === */}
        <div className="xl:col-span-3 flex flex-col gap-6 h-full">
          {/* Bento Metrics */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase mb-2">Fitness Profile</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Height" icon="height" value={fitnessProfile.height} unit="cm" />
              <StatCard label="Weight" icon="scale" value={fitnessProfile.weight} unit="kg" />
              <StatCard label="Age" icon="calendar_today" value={fitnessProfile.age} unit="yrs" />
              <StatCard label="Body Fat" icon="activity" value={14} unit="%" />
              <div className="col-span-2">
                <div className="glass-card p-4 flex justify-between items-center border border-gold-border/20 shadow-md bg-[var(--color-card-inner)] group hover:border-brand-cyan/50 transition-all cursor-pointer">
                  <span className="text-[10px] font-bold text-text-secondary tracking-widest uppercase flex items-center gap-2"><Target size={12} className="text-brand-cyan"/> Experience Level</span>
                  <span className="text-sm font-black text-brand-cyan tracking-wider uppercase group-hover:scale-105 transition-transform">Elite</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Profile */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg">
            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase mb-4 flex items-center gap-2">
              <Dumbbell size={16} /> Equipment Access
            </h3>
            <div className="flex flex-wrap gap-2">
              {equipmentOptions.map(eq => {
                const isActive = activeEquip.includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-gradient-to-r from-gold to-brand-amber text-[var(--color-surface)] shadow-[0_0_10px_rgba(255,170,0,0.3)] border border-transparent' 
                        : 'bg-[var(--color-card-inner)] text-text-secondary border border-gold-border/30 hover:border-gold/50'
                    }`}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* === COLUMN 2: PERSONAL IDENTITY & GOALS (5 Cols) === */}
        <div className="xl:col-span-5 flex flex-col gap-6 h-full">
          {/* Identity Hero */}
          <div className="glass-card p-8 border border-gold-border/30 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
            {/* Background Texture */}
            <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-surface via-card to-surface overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold rounded-full mix-blend-overlay filter blur-[80px] opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-cyan rounded-full mix-blend-overlay filter blur-[80px] opacity-[0.15] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>
            
            <div className="relative group mb-6 mt-8">
              <div className="absolute inset-0 bg-gold rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-br from-gold via-gold-light to-transparent relative z-10 shadow-2xl">
                <img 
                  alt="User profile avatar" 
                  className="w-full h-full rounded-full border-[4px] border-[var(--color-card)] object-cover" 
                  src={identity.avatar} 
                />
              </div>
              <button className="absolute bottom-1 right-1 bg-card border border-gold-border p-3 rounded-full text-text-secondary hover:text-gold hover:scale-110 transition-all z-20 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <Edit2 size={16} />
              </button>
            </div>
            
            <h2 className="text-3xl font-extrabold text-text-primary tracking-tight mb-1">{identity.name}</h2>
            <p className="font-mono text-sm text-text-secondary mb-8">{identity.email}</p>
            
            {/* Quick Stats Row */}
            <div className="flex items-center justify-center w-full px-4 py-6 mt-2 bg-[var(--color-card-inner)] rounded-2xl border border-gold-border/20 shadow-inner">
              <div className="flex flex-col items-center flex-1 group">
                <span className="text-3xl font-black text-gold group-hover:scale-110 transition-transform">{identity.totalWorkouts}</span>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">Workouts</span>
              </div>
              <div className="w-px h-10 bg-gold-border/30"></div>
              <div className="flex flex-col items-center flex-1 group">
                <span className="text-3xl font-black text-brand-green group-hover:scale-110 transition-transform">{identity.currentStreak}</span>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">Day Streak</span>
              </div>
              <div className="w-px h-10 bg-gold-border/30"></div>
              <div className="flex flex-col items-center flex-1 group">
                <span className="text-3xl font-black text-text-primary group-hover:scale-110 transition-transform">Lv.8</span>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">Rank</span>
              </div>
            </div>
          </div>

          {/* Dynamic Goals */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg">
            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase mb-4 flex items-center gap-2">
              <Target size={16} /> Dynamic Goals
            </h3>
            <div className="flex flex-wrap gap-3">
              {fitnessProfile.goals.map((goal: string) => {
                const isActive = activeGoalOverride ? activeGoalOverride === goal : fitnessProfile.activeGoals.includes(goal);
                
                const handleGoalClick = () => {
                  setIsRecalculatingGoal(true);
                  setTimeout(() => {
                    setActiveGoalOverride(goal);
                    setIsRecalculatingGoal(false);
                  }, 1200);
                };

                return (
                  <button 
                    key={goal}
                    onClick={handleGoalClick}
                    className={`px-4 py-2 rounded-xl font-mono text-sm font-bold flex items-center gap-2 transition-all duration-300 hover:-translate-y-1 ${
                      isActive 
                        ? 'bg-gold/10 border border-gold text-gold shadow-[0_0_15px_rgba(255,170,0,0.15)] hover:shadow-[0_0_20px_rgba(255,170,0,0.3)]' 
                        : 'bg-surface border border-gold-border text-text-secondary hover:border-gold/50 hover:text-text-primary'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-gold animate-pulse shadow-[0_0_8px_rgba(255,170,0,0.6)]' : 'bg-transparent border border-text-secondary'}`}></div>
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dietary Protocol */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg">
            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase mb-4 flex items-center gap-2">
              <Activity size={16} /> Dietary Protocol
            </h3>
            <div className="flex flex-wrap gap-3">
              {['High-Protein', 'Keto', 'Vegan', 'Intermittent Fasting'].map((diet: string) => {
                const isActive = diet === 'High-Protein';
                return (
                  <button 
                    key={diet}
                    className={`px-4 py-2 rounded-xl font-mono text-sm font-bold flex items-center gap-2 transition-all duration-300 hover:-translate-y-1 ${
                      isActive 
                        ? 'bg-brand-cyan/10 border border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(0,255,255,0.15)] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]' 
                        : 'bg-surface border border-gold-border/30 text-text-secondary hover:border-brand-cyan/50 hover:text-text-primary'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.6)]' : 'bg-transparent border border-text-secondary'}`}></div>
                    {diet}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Injury-Memory Model */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase flex items-center gap-2">
                <AlertTriangle size={16} /> Injury-Memory Model
              </h3>
              <button className="text-xs font-bold text-gold hover:brightness-125 transition-colors uppercase tracking-widest flex items-center gap-1">
                <PlusCircle size={14} /> Add
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {injuryModel.map((item: any, i: number) => {
                const isHealing = item.status === 'active';
                const isCleared = item.status === 'cleared';
                const statusColor = isHealing ? 'text-brand-amber border-brand-amber/30 bg-brand-amber/10' : (isCleared ? 'text-brand-green border-brand-green/30 bg-brand-green/10' : 'text-brand-red border-brand-red/30 bg-brand-red/10');
                
                return (
                  <div key={i} className="p-4 bg-[var(--color-card-inner)] rounded-xl border border-gold-border/20 flex justify-between items-center group hover:border-gold-border/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isHealing ? 'bg-brand-amber/10 text-brand-amber' : 'bg-brand-green/10 text-brand-green'}`}>
                        <Crosshair size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">{item.desc}</h4>
                        <p className="text-xs font-mono text-text-secondary mt-0.5">Logged {item.date}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${statusColor}`}>
                      {isHealing ? 'Healing' : 'Cleared'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === COLUMN 3: HARDWARE & TOGGLES (4 Cols) === */}
        <div className="xl:col-span-4 flex flex-col gap-6 h-full">
          {/* Hardware Links */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg">
            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase mb-4">Telemetry Devices</h3>
            <div className="space-y-3">
              <DeviceCard title="Oura Ring Gen 3" icon={<Watch size={20} />} status="Connected" battery={telemetry.oura.battery} />
              <DeviceCard title="Polar H10" icon={<Heart size={20} />} status="Searching..." isSearching />
            </div>
          </div>

          {/* AI Coaching Engine */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg">
            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase mb-6 flex items-center gap-2">
              <Sparkles size={16} className="text-gold" /> AI Coaching Engine
            </h3>
            <div className="space-y-5">
              <ToggleRow 
                title="Adaptive Progression" 
                desc="AI auto-adjusts volume based on recovery."
                checked={localPreferences?.adaptiveProgression}
                onChange={() => setLocalPreferences({...localPreferences, adaptiveProgression: !localPreferences?.adaptiveProgression})}
              />
              <hr className="border-gold-border/10" />
              <ToggleRow 
                title="Voice Feedback" 
                desc="Spoken cues during workouts via headphones."
                checked={localPreferences?.voiceFeedback}
                onChange={() => setLocalPreferences({...localPreferences, voiceFeedback: !localPreferences?.voiceFeedback})}
              />
              <hr className="border-gold-border/10" />
              <ToggleRow 
                title="Nutrition Auto-Sync" 
                desc="Import macro data from Apple Health."
                checked={localPreferences?.nutritionSync}
                onChange={() => setLocalPreferences({...localPreferences, nutritionSync: !localPreferences?.nutritionSync})}
              />
              <hr className="border-gold-border/10" />
              <ToggleRow 
                title="Form Enforcement" 
                desc="Haptic alerts via connected devices if form breaks."
                checked={true}
                onChange={() => {}}
              />
            </div>
          </div>

          {/* Privacy & Integrations */}
          <div className="glass-card p-6 border border-gold-border/20 shadow-lg flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase mb-6 flex items-center gap-2">
              <Shield size={16} /> Privacy & Integrations
            </h3>
            <div className="space-y-5 flex-1">
              <ToggleRow 
                title="Public Profile" 
                desc="Allow others to see you on the leaderboard."
                checked={localSettings?.publicProfile}
                onChange={() => setLocalSettings({...localSettings, publicProfile: !localSettings?.publicProfile})}
              />
              <hr className="border-gold-border/10" />
              <ToggleRow 
                title="Apple Health Sync" 
                desc="Two-way sync for workouts and biometrics."
                checked={true}
                onChange={() => {}}
              />
              <hr className="border-gold-border/10" />
              <ToggleRow 
                title="Workout Reminders" 
                desc="Daily nudge based on your schedule."
                checked={localSettings?.workoutReminders}
                onChange={() => setLocalSettings({...localSettings, workoutReminders: !localSettings?.workoutReminders})}
              />
              <hr className="border-gold-border/10" />
              <ToggleRow 
                title="Recovery Alerts" 
                desc="Notify when readiness drops too low."
                checked={localSettings?.recoveryAlerts}
                onChange={() => setLocalSettings({...localSettings, recoveryAlerts: !localSettings?.recoveryAlerts})}
              />
              <hr className="border-gold-border/10" />
              <ToggleRow 
                title="Two-Factor Auth" 
                desc="Secure your account with 2FA app."
                checked={localSettings?.twoFactorAuth}
                onChange={() => setLocalSettings({...localSettings, twoFactorAuth: !localSettings?.twoFactorAuth})}
              />
            </div>
            
            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gold-border/20 flex justify-end gap-4">
              <button className="px-6 py-2.5 rounded-xl border border-gold-border text-gold font-bold hover:bg-surface transition-colors">Discard</button>
              <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold to-brand-amber text-surface-dark font-black shadow-[0_0_15px_rgba(255,170,0,0.3)] hover:scale-105 transition-all">Apply Config</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- MICRO-COMPONENTS ---

function StatCard({ label, value, unit, extra }: { label: string, value: number, unit: string, icon?: string, extra?: string }) {
  return (
    <div className="glass-card p-5 flex flex-col justify-between border border-gold-border/20 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(255,170,0,0.1)] transition-all shadow-md relative overflow-hidden group h-32 w-full bg-[var(--color-card-inner)]">
      <span className="text-[10px] font-bold text-text-secondary tracking-widest uppercase flex items-center gap-1.5">
        <Activity size={12} className="text-text-secondary group-hover:text-gold transition-colors" /> {label}
      </span>
      <div className="flex flex-col mt-auto">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-black text-text-primary tracking-tight">{value}</span>
          {unit && <span className="text-xs font-mono font-bold text-text-secondary">{unit}</span>}
        </div>
        {extra && <span className="text-xs font-mono font-bold text-brand-amber mt-1">{extra}</span>}
      </div>
    </div>
  );
}

function DeviceCard({ title, icon, status, battery, isSearching }: { title: string, icon: React.ReactNode, status: string, battery?: number, isSearching?: boolean }) {
  const isConnected = !isSearching;
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${isConnected ? 'bg-[var(--color-card-inner)] border-gold-border/30' : 'bg-surface/50 border-gold-border/20 border-dashed opacity-80'}`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isConnected ? 'bg-card text-gold border-gold-border' : 'bg-surface text-text-secondary border-gold-border/50 animate-pulse'}`}>
          {icon}
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${isConnected ? 'text-text-primary' : 'text-text-secondary'}`}>{title}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isConnected ? 'text-brand-green' : 'text-brand-amber animate-pulse'}`}>
              {status} {battery && `• ${battery}%`}
            </span>
          </div>
        </div>
      </div>
      {isConnected ? (
        <button className="p-1.5 text-text-secondary hover:text-brand-red transition-colors" title="Disconnect">
          <Link size={16} />
        </button>
      ) : (
        <button className="text-xs font-bold text-gold hover:brightness-125 transition-colors uppercase tracking-widest">
          Pair
        </button>
      )}
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange }: { title: string, desc: string, checked: boolean, onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className={`text-sm font-bold transition-colors ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>{title}</p>
        <p className="text-xs font-medium text-text-secondary mt-1 max-w-[200px] leading-relaxed">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-surface-dark after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold border border-gold-border/50 shadow-inner"></div>
      </label>
    </div>
  );
}
