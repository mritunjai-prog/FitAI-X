import React, { useState } from 'react';

export default function ProfilePage() {
  const [isAdaptiveCoaching, setAdaptiveCoaching] = useState(true);
  const [isVoiceFeedback, setVoiceFeedback] = useState(false);
  const [isNutritionSync, setNutritionSync] = useState(true);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#ebe1d0] font-['Manrope'] selection:bg-[#f5c400] selection:text-[#3d2f00]">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between w-full px-6 py-4 border-b border-[#4e4632] bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="text-[24px] font-black tracking-tighter text-[#f5c400]">FitAI X</div>
        <div className="flex gap-4">
          <span className="material-symbols-outlined cursor-pointer text-[#B0AA9A] hover:text-[#f5c400] active:scale-95 transition-all">notifications</span>
          <span className="material-symbols-outlined cursor-pointer text-[#B0AA9A] hover:text-[#f5c400] active:scale-95 transition-all">bolt</span>
        </div>
      </header>

      <main className="flex flex-col max-w-4xl gap-10 px-6 py-10 mx-auto">
        {/* Hero Section */}
        <section className="relative flex items-center gap-6 overflow-hidden border bg-[#161616] border-[#f5c400]/15 rounded-2xl p-6">
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-[#f5c400] to-transparent pointer-events-none"></div>
          
          <div className="relative w-20 h-20 p-[2px] rounded-full bg-gradient-to-br from-[#f5c400] to-[#b38d00]">
            <img 
              alt="User profile avatar" 
              className="object-cover w-full h-full border-2 rounded-full border-[#0A0A0A]" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBs0aRM5s6_f22oY_Jya-UvvMNGSGivaANAH0MtLocja2ltBy7WlqZeS2oUNL3Zvy6owK1y_pwI5FivaELc03lFVhin35MuIoem0gQbILbNX03ETq0_QfalXIE11fR8gSfatGNKiTM5UHUcXeUREBTIQnsqfCOv-lVzd2UHfHF0ol6VGxWOMUyRrVbPn0wBe0r0vnv6qEHKZrcQuocSrjc90qTqTugxMws-mJKpaNGCdkJ1Doc2pp9muvMYhuqjOcMhq95kAuCkjpk" 
            />
          </div>
          
          <div className="relative flex-1 z-10">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#ebe1d0]">Alex Mercer</h1>
              <span className="px-2 py-[2px] text-[10px] font-bold tracking-wider text-[#3d2f00] uppercase rounded bg-gradient-to-br from-[#f5c400] to-[#b38d00]">Pro</span>
            </div>
            <p className="text-sm text-[#B0AA9A]">alex.mercer@elite.fit</p>
          </div>
          
          <span className="material-symbols-outlined cursor-pointer text-[#9a9078] hover:text-[#f5c400] active:scale-95 transition-all">edit</span>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex flex-col gap-10">
            {/* Fitness Profile */}
            <section>
              <span className="block mb-2 text-[11px] font-bold tracking-widest text-[#B0AA9A] uppercase">Fitness Profile</span>
              <div className="grid grid-cols-3 gap-4 p-5 border bg-[#161616] border-[#f5c400]/15 rounded-2xl">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#B0AA9A]">Height</span>
                  <div className="flex items-baseline gap-1 p-3 bg-[#101010] rounded-lg border border-transparent focus-within:border-[#f5c400]">
                    <span className="text-2xl font-bold font-mono text-[#f5c400]">185</span>
                    <span className="text-xs text-[#9a9078]">cm</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#B0AA9A]">Weight</span>
                  <div className="flex items-baseline gap-1 p-3 bg-[#101010] rounded-lg border border-transparent focus-within:border-[#f5c400]">
                    <span className="text-2xl font-bold font-mono text-[#f5c400]">82</span>
                    <span className="text-xs text-[#9a9078]">kg</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#B0AA9A]">Age</span>
                  <div className="flex items-baseline gap-1 p-3 bg-[#101010] rounded-lg border border-transparent focus-within:border-[#f5c400]">
                    <span className="text-2xl font-bold font-mono text-[#f5c400]">29</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Dynamic Goals */}
            <section>
              <span className="block mb-2 text-[11px] font-bold tracking-widest text-[#B0AA9A] uppercase">Dynamic Goals</span>
              <div className="p-5 border bg-[#161616] border-[#f5c400]/15 rounded-2xl">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-full cursor-pointer bg-[#f5c400]/10 border border-[#f5c400]/50 text-[#f5c400]">
                    <span className="material-symbols-outlined text-[16px]">fitness_center</span> Hypertrophy
                  </div>
                  <div className="flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-full cursor-pointer bg-[#101010] border border-[#2e2a1e] text-[#B0AA9A]">
                    <span className="material-symbols-outlined text-[16px]">directions_run</span> Endurance
                  </div>
                  <div className="flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-full cursor-pointer bg-[#101010] border border-[#2e2a1e] text-[#B0AA9A]">
                    <span className="material-symbols-outlined text-[16px]">speed</span> Power
                  </div>
                  <div className="flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-full cursor-pointer bg-[#f5c400]/10 border border-[#f5c400]/50 text-[#f5c400]">
                    <span className="material-symbols-outlined text-[16px]">monitor_weight</span> Lean Mass
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-10">
            {/* AI Coaching Engine */}
            <section>
              <span className="block mb-2 text-[11px] font-bold tracking-widest text-[#B0AA9A] uppercase">AI Coaching Engine</span>
              <div className="relative overflow-hidden rounded-2xl p-[1px] group">
                <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-[#f5c400] via-[#ffb300] to-[#f5c400] animate-pulse group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex flex-col gap-4 p-5 bg-[#161616]/95 backdrop-blur-sm rounded-2xl">
                  
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setAdaptiveCoaching(!isAdaptiveCoaching)}>
                    <div className="flex flex-col">
                      <span className="text-base font-medium text-[#ebe1d0]">Adaptive Progression</span>
                      <span className="text-xs text-[#B0AA9A]">Auto-adjust weights based on previous sets</span>
                    </div>
                    <div className={`w-10 h-[23px] rounded-full relative transition-colors duration-300 border ${isAdaptiveCoaching ? 'bg-gradient-to-br from-[#f5c400] to-[#b38d00] border-transparent' : 'bg-[#101010] border-[#2e2a1e]'}`}>
                      <div className={`absolute top-[2px] left-[2px] w-[17px] h-[17px] rounded-full transition-transform duration-300 ${isAdaptiveCoaching ? 'translate-x-[17px] bg-[#3d2f00]' : 'bg-[#ebe1d0]'}`} />
                    </div>
                  </div>
                  
                  <div className="w-full h-[1px] bg-[#101010]"></div>
                  
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setVoiceFeedback(!isVoiceFeedback)}>
                    <div className="flex flex-col">
                      <span className="text-base font-medium text-[#ebe1d0]">Real-time Form Feedback</span>
                      <span className="text-xs text-[#B0AA9A]">Voice alerts during working sets</span>
                    </div>
                    <div className={`w-10 h-[23px] rounded-full relative transition-colors duration-300 border ${isVoiceFeedback ? 'bg-gradient-to-br from-[#f5c400] to-[#b38d00] border-transparent' : 'bg-[#101010] border-[#2e2a1e]'}`}>
                      <div className={`absolute top-[2px] left-[2px] w-[17px] h-[17px] rounded-full transition-transform duration-300 ${isVoiceFeedback ? 'translate-x-[17px] bg-[#3d2f00]' : 'bg-[#ebe1d0]'}`} />
                    </div>
                  </div>

                  <div className="w-full h-[1px] bg-[#101010]"></div>

                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setNutritionSync(!isNutritionSync)}>
                    <div className="flex flex-col">
                      <span className="text-base font-medium text-[#ebe1d0]">Nutrition Auto-Sync</span>
                      <span className="text-xs text-[#B0AA9A]">Adjust macros based on workout intensity</span>
                    </div>
                    <div className={`w-10 h-[23px] rounded-full relative transition-colors duration-300 border ${isNutritionSync ? 'bg-gradient-to-br from-[#f5c400] to-[#b38d00] border-transparent' : 'bg-[#101010] border-[#2e2a1e]'}`}>
                      <div className={`absolute top-[2px] left-[2px] w-[17px] h-[17px] rounded-full transition-transform duration-300 ${isNutritionSync ? 'translate-x-[17px] bg-[#3d2f00]' : 'bg-[#ebe1d0]'}`} />
                    </div>
                  </div>

                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Data Export */}
        <section className="mt-4">
          <button className="flex items-center justify-center w-full gap-3 py-4 transition-colors border rounded-xl border-[#4e4632] text-[#f5c400] hover:bg-[#393428]/30 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span className="text-xs font-bold tracking-widest uppercase">Export Biometric Data</span>
          </button>
        </section>

      </main>
    </div>
  );
}
