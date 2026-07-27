import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Utensils, Activity, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

// Fake Data for the Smart Calendar
const initialSchedule = {
  0: [], // Sun (Past)
  1: [
    { id: 'w1', type: 'workout', title: 'Heavy Chest & Triceps', duration: '45m', intensity: 'High' },
    { id: 'm1', type: 'meal', title: 'High Carb Refuel', cals: 850 }
  ], // Mon
  2: [
    { id: 'w2', type: 'workout', title: 'Back & Biceps', duration: '50m', intensity: 'Medium' }
  ], // Tue
  3: [
    { id: 'w3', type: 'workout', title: 'Active Recovery', duration: '20m', intensity: 'Low' }
  ], // Wed
  4: [
    { id: 'w4', type: 'workout', title: 'Heavy Legs', duration: '60m', intensity: 'High' },
    { id: 'm4', type: 'meal', title: 'Post-Legs Feast', cals: 1100 }
  ], // Thu
  5: [
    { id: 'w5', type: 'workout', title: 'Shoulders & Abs', duration: '40m', intensity: 'Medium' }
  ], // Fri
  6: [
    { id: 'w6', type: 'workout', title: 'Long Run', duration: '60m', intensity: 'High' }
  ], // Sat
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CalendarPage() {
  const [schedule, setSchedule] = useState<Record<number, any[]>>(initialSchedule);
  const [draggedItem, setDraggedItem] = useState<{ id: string; dayIndex: number; data: any } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [dependencyWarning, setDependencyWarning] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, item: any, dayIndex: number) => {
    setDraggedItem({ id: item.id, dayIndex, data: item });
    e.dataTransfer.effectAllowed = 'move';
    // Small timeout to allow drag image to render before making original transparent
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('opacity-30');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('opacity-30');
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDayIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.dayIndex === targetDayIndex) {
      setDraggedItem(null);
      return;
    }

    // Move item
    const newSchedule = { ...schedule };
    
    // Remove from source
    newSchedule[draggedItem.dayIndex] = newSchedule[draggedItem.dayIndex].filter(i => i.id !== draggedItem.id);
    
    // Add to target
    newSchedule[targetDayIndex] = [...newSchedule[targetDayIndex], draggedItem.data];
    
    setSchedule(newSchedule);
    setDraggedItem(null);

    // Simulate AI Dependency Recalculation
    triggerAiRecalculation(draggedItem.data, targetDayIndex, newSchedule);
  };

  const triggerAiRecalculation = (movedItem: any, targetDay: number, currentSchedule: any) => {
    setIsRecalculating(true);
    setDependencyWarning(null);

    setTimeout(() => {
      // Very basic mock logic for "AI dependency recalculation"
      const updatedSchedule = { ...currentSchedule };
      
      if (movedItem.title === 'Heavy Legs' && targetDay === 5) {
        // Moved Heavy Legs to Friday, move Saturday's Long run to Sunday
        if (updatedSchedule[6].find((i: any) => i.title === 'Long Run')) {
          setDependencyWarning("Heavy Legs moved before Long Run. AI shifted Long Run to Sunday to allow recovery.");
          updatedSchedule[6] = updatedSchedule[6].filter((i: any) => i.title !== 'Long Run');
          updatedSchedule[0] = [...updatedSchedule[0], { id: 'w6', type: 'workout', title: 'Long Run', duration: '60m', intensity: 'High' }];
        }
      } else {
        setDependencyWarning("AI optimized nutrition and recovery windows around new schedule.");
      }

      setSchedule(updatedSchedule);
      setIsRecalculating(false);
      
      setTimeout(() => setDependencyWarning(null), 5000); // clear warning
    }, 1500);
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-text-gold" size={24} />
            <h1 className="text-3xl font-display font-bold text-text-primary">Smart Calendar</h1>
          </div>
          <p className="text-text-secondary">Drag and drop workouts. The AI will instantly recalculate dependencies, recovery, and meals.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-card border border-border rounded-lg p-1">
            <button className="px-4 py-2 rounded-md bg-gold/10 text-text-gold font-medium">Week</button>
            <button className="px-4 py-2 rounded-md text-text-secondary hover:text-text-primary">Month</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-border bg-card hover:bg-card-inner transition-colors">
              <ChevronLeft size={20} className="text-text-primary" />
            </button>
            <button className="p-2 rounded-lg border border-border bg-card hover:bg-card-inner transition-colors">
              <ChevronRight size={20} className="text-text-primary" />
            </button>
          </div>
        </div>
      </div>

      {dependencyWarning && (
        <div className="mb-6 p-4 rounded-xl bg-brand-orange/10 border border-brand-orange/30 flex items-start gap-3 animate-pulse-glow">
          <AlertTriangle className="text-brand-orange mt-0.5" size={20} />
          <div>
            <h4 className="text-brand-orange font-bold text-sm">Dependency Shifted</h4>
            <p className="text-text-secondary text-sm mt-1">{dependencyWarning}</p>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 min-h-0 bg-card border border-border rounded-2xl overflow-hidden flex flex-col relative">
        
        {/* Recalculating Overlay */}
        {isRecalculating && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
            <RefreshCw className="text-text-gold animate-spin mb-4" size={40} />
            <h3 className="text-xl font-display font-bold text-text-primary">Recalculating Ecosystem...</h3>
            <p className="text-text-secondary mt-2">Adjusting recovery windows and meal plans</p>
          </div>
        )}

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border bg-card-inner">
          {DAYS.map((day, i) => (
            <div key={day} className="py-4 px-2 text-center border-r border-border last:border-r-0">
              <span className="text-xs font-bold tracking-wider text-text-secondary uppercase">{day.substring(0, 3)}</span>
              <div className={clsx(
                "text-2xl font-display mt-1",
                i === 2 ? "text-text-gold font-bold" : "text-text-primary"
              )}>
                {22 + i}
              </div>
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="grid grid-cols-7 flex-1 min-h-[500px]">
          {DAYS.map((_, dayIndex) => (
            <div 
              key={dayIndex} 
              className={clsx(
                "border-r border-border last:border-r-0 p-2 flex flex-col gap-2 transition-colors",
                draggedItem?.dayIndex !== dayIndex && "hover:bg-card-inner/50"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dayIndex)}
            >
              {schedule[dayIndex]?.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, dayIndex)}
                  onDragEnd={handleDragEnd}
                  className={clsx(
                    "p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-1",
                    item.type === 'workout' ? "bg-card-inner border-border" : "bg-brand-blue/5 border-brand-blue/20"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === 'workout' ? (
                      <div className="p-1.5 rounded-md bg-gold/10">
                        <Dumbbell size={14} className="text-text-gold" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-md bg-brand-blue/10">
                        <Utensils size={14} className="text-brand-blue" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                      {item.type}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-text-primary mb-1">{item.title}</h4>
                  
                  <div className="flex items-center gap-3 mt-3">
                    {item.duration && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Activity size={12} />
                        {item.duration}
                      </span>
                    )}
                    {item.intensity && (
                      <span className={clsx(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        item.intensity === 'High' ? 'bg-brand-red/10 text-brand-red' :
                        item.intensity === 'Medium' ? 'bg-brand-orange/10 text-brand-orange' :
                        'bg-brand-green/10 text-brand-green'
                      )}>
                        {item.intensity}
                      </span>
                    )}
                    {item.cals && (
                      <span className="text-xs font-medium text-brand-blue">
                        {item.cals} kcal
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
