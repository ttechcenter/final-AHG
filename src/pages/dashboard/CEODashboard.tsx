import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, DailySale, SalesCategory, UserRole, ROLE_LABELS } from '../../types';
import PlanViewer from '../../components/dashboard/PlanViewer';
import ITAdminDashboard from './ITAdminDashboard';
import {
  BarChart3, Users, Calendar, ChevronLeft, ChevronRight, UserCog, ShoppingCart, DollarSign, TrendingUp, FileBarChart, Settings, Plus, Trash2, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { getWeekStartsInMonth, getMonthLabel, addMonths, getCurrentYearMonth, formatWeekLabel } from '../../lib/dateUtils';

interface CEODashboardProps {
  profile: Profile;
}

interface SalesSummary {
  date: string;
  total: number;
  count: number;
  byCategory: Record<string, number>;
}

type Tab = 'plans' | 'performance' | 'users' | 'sales' | 'sales_categories';

export default function CEODashboard({ profile }: CEODashboardProps) {
  const [tab, setTab] = useState<Tab>('plans');
  const [perfMonth, setPerfMonth] = useState(getCurrentYearMonth());
  const [loading, setLoading] = useState(false);

  // Sales data
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [monthlySalesTotal, setMonthlySalesTotal] = useState(0);

  // Sales categories
  const [salesCategories, setSalesCategories] = useState<SalesCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Users for performance view
  const [users, setUsers] = useState<Profile[]>([]);
  const [userPerformance, setUserPerformance] = useState<Record<string, { tasks: number; completed: number; rate: number }>>({});

  const loadSalesData = async () => {
    setLoading(true);

    // Load daily sales for selected date
    const { data: daySales } = await supabase.from('daily_sales').select('*, profiles(full_name, department)').eq('sale_date', salesDate);
    setDailySales((daySales as DailySale[]) ?? []);

    // Calculate summary
    if (daySales && daySales.length > 0) {
      const summary: SalesSummary = {
        date: salesDate,
        total: daySales.reduce((sum, s) => sum + (s.amount || 0), 0),
        count: daySales.length,
        byCategory: {},
      };
      daySales.forEach((s) => {
        const cat = s.category_name || 'Other';
        summary.byCategory[cat] = (summary.byCategory[cat] || 0) + (s.amount || 0);
      });
      setSalesSummary(summary);
    } else {
      setSalesSummary(null);
    }

    // Load monthly total
    const monthStart = new Date(perfMonth.year, perfMonth.month - 1, 1).toISOString().split('T')[0];
    const monthEnd = new Date(perfMonth.year, perfMonth.month, 0).toISOString().split('T')[0];
    const { data: monthSales } = await supabase.from('daily_sales').select('amount').gte('sale_date', monthStart).lte('sale_date', monthEnd);
    if (monthSales) {
      setMonthlySalesTotal(monthSales.reduce((sum, s) => sum + (s.amount || 0), 0));
    }

    setLoading(false);
  };

  const loadSalesCategories = async () => {
    const { data } = await supabase.from('sales_categories').select('*').order('name');
    if (data) setSalesCategories(data as SalesCategory[]);
  };

  const loadPerformanceData = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name');
    setUsers(profiles as Profile[] ?? []);

    if (profiles && profiles.length > 0) {
      const weeks = getWeekStartsInMonth(perfMonth.year, perfMonth.month);

      // Get plans for the month
      const { data: plans } = await supabase.from('weekly_plans').select('id, user_id').in('week_start_date', weeks);
      const planIds = (plans ?? []).map(p => p.id);

      if (planIds.length > 0) {
        const { data: items } = await supabase.from('plan_items').select('plan_id, is_completed').in('plan_id', planIds);
        const perfMap: Record<string, { tasks: number; completed: number; rate: number }> = {};

        profiles.forEach(p => {
          perfMap[p.id] = { tasks: 0, completed: 0, rate: 0 };
        });

        (plans ?? []).forEach(plan => {
          const planItems = (items ?? []).filter(i => i.plan_id === plan.id);
          if (perfMap[plan.user_id]) {
            perfMap[plan.user_id].tasks += planItems.length;
            perfMap[plan.user_id].completed += planItems.filter(i => i.is_completed).length;
          }
        });

        Object.keys(perfMap).forEach(userId => {
          const p = perfMap[userId];
          p.rate = p.tasks > 0 ? Math.round((p.completed / p.tasks) * 100) : 0;
        });

        setUserPerformance(perfMap);
      }
    }

    setLoading(false);
  };

  const addSalesCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCategoryLoading(true);
    const { error } = await supabase.from('sales_categories').insert({
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim(),
      created_by: profile.id,
    });
    if (error) {
      alert(error.message);
    } else {
      setNewCategoryName('');
      setNewCategoryDesc('');
      loadSalesCategories();
    }
    setCategoryLoading(false);
  };

  const toggleCategoryActive = async (id: string, isActive: boolean) => {
    await supabase.from('sales_categories').update({ is_active: !isActive }).eq('id', id);
    loadSalesCategories();
  };

  const deleteSalesCategory = async (id: string) => {
    if (!confirm('Delete this sales category?')) return;
    await supabase.from('sales_categories').delete().eq('id', id);
    loadSalesCategories();
  };

  useEffect(() => {
    loadSalesCategories();
  }, []);

  useEffect(() => {
    if (tab === 'sales') loadSalesData();
    if (tab === 'performance') loadPerformanceData();
  }, [tab, salesDate, perfMonth]);

  const monthLabel = getMonthLabel(perfMonth.year, perfMonth.month);
  const prevDay = () => {
    const d = new Date(salesDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSalesDate(d.toISOString().split('T')[0]);
  };
  const nextDay = () => {
    const d = new Date(salesDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSalesDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'plans', label: 'Employee Plans', icon: <Users size={15} /> },
          { key: 'performance', label: 'Monthly Performance', icon: <BarChart3 size={15} /> },
          { key: 'sales', label: 'Daily Sales', icon: <ShoppingCart size={15} /> },
          { key: 'sales_categories', label: 'Sales Categories', icon: <DollarSign size={15} /> },
          { key: 'users', label: 'Manage Users', icon: <UserCog size={15} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && <PlanViewer viewerProfile={profile} viewerRole={profile.role} />}

      {tab === 'users' && <ITAdminDashboard profile={profile} />}

      {tab === 'sales_categories' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Category name (e.g., Product Sales, Service Fees)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={addSalesCategory}
                disabled={categoryLoading || !newCategoryName.trim()}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm shadow"
              >
                {categoryLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
              </button>
            </div>
            <textarea
              placeholder="Description (optional)..."
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {salesCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No sales categories yet. Add one above.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">{c.description || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleCategoryActive(c.id, c.is_active)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-xs"
                          >
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => deleteSalesCategory(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div className="space-y-6">
          {/* Date Navigator */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={17} className="text-purple-700" />
              <span className="font-semibold text-gray-700 text-sm">Daily Sales Report:</span>
              <span className="text-gray-900 font-medium">
                {new Date(salesDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setSalesDate(new Date().toISOString().split('T')[0])} className="text-xs font-medium text-purple-700 hover:text-purple-900 px-2 py-1 rounded-lg hover:bg-purple-50">
                Today
              </button>
              <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-purple-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Day Total</p>
              <p className="text-2xl font-bold text-purple-700 mt-0.5">{salesSummary?.total.toLocaleString() ?? 0} ETB</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transactions</p>
              <p className="text-2xl font-bold text-blue-700 mt-0.5">{salesSummary?.count ?? 0}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Total</p>
              <p className="text-2xl font-bold text-green-700 mt-0.5">{monthlySalesTotal.toLocaleString()} ETB</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Month</p>
              <p className="text-lg font-bold text-orange-700 mt-0.5">{monthLabel}</p>
            </div>
          </div>

          {/* Category Breakdown */}
          {salesSummary?.byCategory && Object.keys(salesSummary.byCategory).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">Sales by Category</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(salesSummary.byCategory).map(([cat, amount]) => (
                  <div key={cat} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">{cat}</p>
                    <p className="text-sm font-bold text-gray-800">{amount.toLocaleString()} ETB</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShoppingCart size={17} className="text-purple-700" />
              <h3 className="font-semibold text-gray-800">Sales Transactions — {salesDate}</h3>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-purple-600" />
              </div>
            ) : dailySales.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No sales recorded for this date.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dailySales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{(sale as any).profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{(sale as any).profiles?.department || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{sale.category_name}</td>
                      <td className="px-4 py-3 text-gray-500">{sale.description || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{sale.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-700">Total:</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 text-lg">
                      {salesSummary?.total.toLocaleString() ?? 0} ETB
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-6">
          {/* Month Navigator */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={17} className="text-green-700" />
              <span className="font-semibold text-gray-700 text-sm">Monthly Performance:</span>
              <span className="text-gray-900 font-medium">{monthLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPerfMonth(addMonths(perfMonth.year, perfMonth.month, -1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setPerfMonth(getCurrentYearMonth())} className="text-xs font-medium text-green-700 hover:text-green-900 px-2 py-1 rounded-lg hover:bg-green-50">
                Current Month
              </button>
              <button
                onClick={() => setPerfMonth(addMonths(perfMonth.year, perfMonth.month, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Performance Table */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-green-600" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <BarChart3 size={17} className="text-green-700" />
                <h3 className="font-semibold text-gray-800">Staff Performance — {monthLabel}</h3>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Tasks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => {
                    const perf = userPerformance[u.id] || { tasks: 0, completed: 0, rate: 0 };
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800">{u.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.department || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{perf.completed}/{perf.tasks}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 justify-center">
                            <div className="flex-1 max-w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${perf.rate}%`,
                                  backgroundColor: perf.rate >= 80 ? '#10b981' : perf.rate >= 50 ? '#f59e0b' : '#ef4444'
                                }}
                              />
                            </div>
                            <span className={`text-xs font-bold w-10 ${perf.rate >= 80 ? 'text-emerald-600' : perf.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {perf.rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
