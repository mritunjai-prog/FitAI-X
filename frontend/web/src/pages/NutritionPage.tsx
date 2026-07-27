import React, { useState } from 'react';
import { 
  Utensils, DollarSign, ShoppingCart, Leaf, Flame, Droplet, Check, RefreshCw, X, ChevronRight, Calculator
} from 'lucide-react';
import clsx from 'clsx';

// Mock Data
const MEALS = [
  { id: 1, type: 'Breakfast', name: 'Oatmeal & Protein Shake', cals: 450, p: 40, c: 50, f: 10, cost: 2.50 },
  { id: 2, type: 'Lunch', name: 'Chicken & Rice Bowl', cals: 650, p: 55, c: 70, f: 15, cost: 4.20 },
  { id: 3, type: 'Snack', name: 'Greek Yogurt & Almonds', cals: 250, p: 20, c: 15, f: 12, cost: 1.80 },
  { id: 4, type: 'Dinner', name: 'Salmon & Sweet Potato', cals: 700, p: 45, c: 60, f: 30, cost: 6.50 },
];

const GROCERIES = {
  Produce: [
    { item: 'Sweet Potatoes', qty: '2 lbs', cost: 3.50 },
    { item: 'Broccoli', qty: '2 heads', cost: 2.80 },
  ],
  Meat: [
    { item: 'Chicken Breast', qty: '3 lbs', cost: 12.00 },
    { item: 'Salmon Fillets', qty: '1 lb', cost: 14.50 },
  ],
  Dairy: [
    { item: 'Greek Yogurt', qty: '32 oz', cost: 5.50 },
  ],
  Pantry: [
    { item: 'Oats', qty: '1 box', cost: 4.00 },
    { item: 'Almonds', qty: '1 bag', cost: 6.50 },
    { item: 'Rice', qty: '5 lbs', cost: 5.00 },
  ]
};

export default function NutritionPage() {
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
  const [budgetConstraint, setBudgetConstraint] = useState('Standard ($75/wk)');

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Nutrition & Budget Planner</h1>
            <p className="text-text-secondary">AI Meal generation optimized for your macros and wallet.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsGroceryOpen(true)}
              className="flex items-center gap-2 px-6 py-2 bg-text-primary text-surface font-bold rounded-lg hover:bg-text-secondary transition-colors"
            >
              <ShoppingCart size={18} />
              <span>Generate Grocery List</span>
            </button>
          </div>
        </div>

        {/* AI Insight / Budget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="text-brand-orange" size={20} />
              <h3 className="font-bold text-text-primary">Daily Targets</h3>
            </div>
            <div className="text-3xl font-display font-bold text-text-primary mb-1">2,050 <span className="text-lg text-text-secondary">kcal</span></div>
            <div className="flex justify-between text-sm mt-4">
              <span className="text-brand-red font-bold">160g P</span>
              <span className="text-brand-blue font-bold">195g C</span>
              <span className="text-brand-orange font-bold">67g F</span>
            </div>
          </div>
          
          <div className="p-5 rounded-2xl border border-border bg-card col-span-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-brand-green/10 to-transparent pointer-events-none"></div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="text-brand-green" size={20} />
              <h3 className="font-bold text-text-primary">Budget Optimization</h3>
            </div>
            <p className="text-text-secondary mb-4">
              AI optimized this week's meals for cost. Ingredients like rice and oats are reused across meals to minimize waste.
            </p>
            <div className="flex items-center gap-2">
              {['Tight ($40/wk)', 'Standard ($75/wk)', 'Premium ($120/wk)'].map(b => (
                <button 
                  key={b}
                  onClick={() => setBudgetConstraint(b)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                    budgetConstraint === b ? "bg-brand-green/10 border-brand-green text-brand-green" : "border-border text-text-secondary hover:border-brand-green/30"
                  )}
                >
                  {b}
                </button>
              ))}
              <span className="ml-auto text-xs text-text-secondary flex items-center gap-1"><RefreshCw size={12}/> Auto-recalculates</span>
            </div>
          </div>
        </div>

        {/* Meal Plan List */}
        <h2 className="text-xl font-display font-bold text-text-primary mb-4">Today's Meal Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MEALS.map(meal => (
            <div key={meal.id} className="p-5 rounded-2xl border border-border bg-card hover:border-gold/30 transition-colors flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{meal.type}</span>
                <span className="text-xs font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-md">${meal.cost.toFixed(2)}</span>
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-4 leading-tight">{meal.name}</h3>
              
              <div className="mt-auto">
                <div className="text-lg font-bold text-brand-orange mb-2">{meal.cals} kcal</div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-card-inner rounded-md p-1.5 text-center text-xs text-text-secondary">
                    <strong className="block text-text-primary">{meal.p}g</strong> Protein
                  </div>
                  <div className="flex-1 bg-card-inner rounded-md p-1.5 text-center text-xs text-text-secondary">
                    <strong className="block text-text-primary">{meal.c}g</strong> Carbs
                  </div>
                  <div className="flex-1 bg-card-inner rounded-md p-1.5 text-center text-xs text-text-secondary">
                    <strong className="block text-text-primary">{meal.f}g</strong> Fats
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grocery List Modal */}
      {isGroceryOpen && (
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-full flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-border flex justify-between items-center bg-card-inner rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
                  <ShoppingCart size={24} className="text-brand-green" />
                  AI Grocery List
                </h2>
                <p className="text-text-secondary text-sm mt-1">Generated for 7 days based on "{budgetConstraint}"</p>
              </div>
              <button onClick={() => setIsGroceryOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              {Object.entries(GROCERIES).map(([category, items]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 border-b border-border pb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-lg hover:bg-card-inner transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded border border-border flex items-center justify-center group-hover:border-brand-green cursor-pointer">
                            {/* Checkbox visual */}
                          </div>
                          <span className="font-medium text-text-primary">{item.item}</span>
                          <span className="text-sm text-text-secondary ml-2">{item.qty}</span>
                        </div>
                        <span className="font-bold text-text-primary">${item.cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-border bg-card-inner rounded-b-2xl flex justify-between items-center">
              <div>
                <span className="text-sm text-text-secondary block">Estimated Total</span>
                <span className="text-3xl font-display font-bold text-brand-green">$53.80</span>
              </div>
              <button className="px-6 py-3 bg-brand-green text-surface font-bold rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2">
                Export to Instacart <ChevronRight size={18} />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
