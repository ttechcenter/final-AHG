import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Lightbulb, Target, AlertTriangle, ShieldCheck, Zap, DollarSign, Calendar, TrendingUp, Trophy, Loader2 } from 'lucide-react';
import { MonthlyReport } from '../../types';
import { getMonthLabel, getMonthDateRange } from '../../lib/dateUtils';

interface MonthlySWOTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MonthlyReport, 'id' | 'user_id' | 'year' | 'month' | 'created_at' | 'updated_at'>) => void;
  employeeName: string;
  monthLabel: string;
  year: number;
  month: number;
  userId: string;
  existing?: MonthlyReport | null;
}

interface MonthlyStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalFinancial: number;
  salesBreakdown: Array<{ category: string; amount: number }>;
}

const EMPTY = {
  strengths: '',
  weaknesses: '',
  opportunities: '',
  threats: '',
  achievements: '',
  challenges: '',
  goals_next_month: '',
};

export default function MonthlySWOTModal({
  isOpen,
  onClose,
  onSubmit,
  employeeName,
  monthLabel,
  year,
  month,
  userId,
  existing,
}: MonthlySWOTModalProps) {
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    totalFinancial: 0,
    salesBreakdown: [],
  });

  useEffect(() => {
    if (isOpen) {
      if (existing) {
        setForm({
          strengths: existing.strengths ?? '',
          weaknesses: existing.weaknesses ?? '',
          opportunities: existing.opportunities ?? '',
          threats: existing.threats ?? '',
          achievements: existing.achievements ?? '',
          challenges: existing.challenges ?? '',
          goals_next_month: existing.goals_next_month ?? '',
        });
      } else {
        setForm({ ...EMPTY });
      }

      loadMonthlyData();
    }
  }, [isOpen, existing, year, month, userId]);

  const loadMonthlyData = async () => {
    setLoading(true);

    const { start, end } = getMonthDateRange(year, month);

    // Get all weeks in this month
    const { data: plans } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_type', 'personal')
      .gte('week_start_date', start)
      .lte('week_start_date', end);

    const planIds = (plans ?? []).map(p => p.id);

    let totalTasks = 0;
    let completedTasks = 0;

    if (planIds.length > 0) {
      const { data: items } = await supabase
        .from('plan_items')
        .select('is_completed')
        .in('plan_id', planIds);

      if (items) {
        totalTasks = items.length;
        completedTasks = items.filter(i => i.is_completed).length;
      }
    }

    // Get monthly sales
    const { data: sales } = await supabase
      .from('daily_sales')
      .select('category_name, amount')
      .eq('user_id', userId)
      .gte('sale_date', start)
      .lte('sale_date', end);

    let totalFinancial = 0;
    const salesBreakdown: Array<{ category: string; amount: number }> = [];

    if (sales && sales.length > 0) {
      totalFinancial = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
      const breakdownMap: Record<string, number> = {};
      sales.forEach(s => {
        breakdownMap[s.category_name] = (breakdownMap[s.category_name] || 0) + (s.amount || 0);
      });
      Object.entries(breakdownMap).forEach(([category, amount]) => {
        salesBreakdown.push({ category, amount });
      });
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    setMonthlyStats({
      totalTasks,
      completedTasks,
      completionRate,
      totalFinancial,
      salesBreakdown,
    });

    setLoading(false);
  };

  if (!isOpen) return null;

  const set = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      total_tasks: monthlyStats.totalTasks,
      completed_tasks: monthlyStats.completedTasks,
      completion_rate: monthlyStats.completionRate,
      total_financial: monthlyStats.totalFinancial,
    });
    onClose();
  };

  const swotFields = [
    { key: 'strengths', label: 'Strengths', icon: <ShieldCheck size={16} />, color: 'emerald', placeholder: 'What were your key strengths this month?' },
    { key: 'weaknesses', label: 'Weaknesses', icon: <AlertTriangle size={16} />, color: 'rose', placeholder: 'Areas that need improvement...' },
    { key: 'opportunities', label: 'Opportunities', icon: <Lightbulb size={16} />, color: 'sky', placeholder: 'Opportunities to leverage next month...' },
    { key: 'threats', label: 'Threats', icon: <Target size={16} />, color: 'amber', placeholder: 'Risks or obstacles ahead...' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-400',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 focus:ring-rose-400',
    sky: 'border-sky-200 bg-sky-50 text-sky-700 focus:ring-sky-400',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 focus:ring-amber-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap size={20} className="text-amber-400" />
              Monthly Report — {existing ? 'Edit' : 'Generate'}
            </h2>
            <p className="text-indigo-300 text-sm mt-1 flex items-center gap-1">
              <Calendar size={12} /> {employeeName} — {monthLabel}
            </p>
          </div>
          <button onClick={onClose} className="text-indigo-300 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600">Loading monthly data...</span>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <section className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                <h3 className="font-bold text-indigo-800 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp size={16} /> Monthly Performance Summary (Auto-calculated)
                </h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-gray-800">{monthlyStats.totalTasks}</p>
                    <p className="text-xs text-gray-500">Total Tasks</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-green-700">{monthlyStats.completedTasks}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-orange-600">{monthlyStats.completionRate}%</p>
                    <p className="text-xs text-gray-500">Rate</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-purple-700">{monthlyStats.totalFinancial.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Sales (ETB)</p>
                  </div>
                </div>

                {monthlyStats.salesBreakdown.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-indigo-200">
                    <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                      <DollarSign size={12} /> Sales Breakdown by Category:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {monthlyStats.salesBreakdown.map((s, i) => (
                        <div key={i} className="bg-white rounded px-3 py-1.5 text-xs shadow-sm">
                          <span className="text-gray-500">{s.category}:</span>{' '}
                          <span className="font-semibold text-green-700">{s.amount.toLocaleString()} ETB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Achievements */}
              <section>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Trophy size={16} className="text-yellow-600" />
                  Key Achievements
                </h3>
                <textarea
                  value={form.achievements}
                  onChange={(e) => set('achievements', e.target.value)}
                  placeholder="Describe your key achievements this month..."
                  rows={3}
                  className="w-full border border-yellow-200 rounded-xl px-4 py-3 text-sm resize-none bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </section>

              {/* Challenges */}
              <section>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <AlertTriangle size={16} className="text-red-600" />
                  Challenges Faced
                </h3>
                <textarea
                  value={form.challenges}
                  onChange={(e) => set('challenges', e.target.value)}
                  placeholder="Describe challenges or obstacles you encountered..."
                  rows={3}
                  className="w-full border border-red-200 rounded-xl px-4 py-3 text-sm resize-none bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </section>

              {/* Goals for Next Month */}
              <section>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Target size={16} className="text-blue-600" />
                  Goals for Next Month
                </h3>
                <textarea
                  value={form.goals_next_month}
                  onChange={(e) => set('goals_next_month', e.target.value)}
                  placeholder="What do you plan to achieve next month?"
                  rows={3}
                  className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm resize-none bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </section>

              {/* SWOT */}
              <section>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Zap size={16} className="text-slate-600" />
                  SWOT Analysis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {swotFields.map((f) => (
                    <div key={f.key} className={`rounded-xl border-2 p-4 ${colorMap[f.color].split(' ').slice(0, 2).join(' ')}`}>
                      <label className={`flex items-center gap-2 text-sm font-bold mb-2 ${colorMap[f.color].split(' ')[2]}`}>
                        {f.icon} {f.label}
                      </label>
                      <textarea
                        value={(form as any)[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                        className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 bg-white ${colorMap[f.color].split(' ').slice(0, 1).join(' ')} ${colorMap[f.color].split(' ')[3]}`}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </form>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-800 to-indigo-700 hover:from-indigo-900 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold px-6 py-2.5 rounded-lg shadow-md transition-all text-sm"
          >
            <Zap size={16} /> {existing ? 'Update Report' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
