import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, WeeklyPlan, PlanItem, WeeklyReport, MonthlyReport, UserRole, DailySale } from '../../types';
import WeeklyPlanTable from '../dashboard/WeeklyPlanTable';
import {
  Users, ChevronRight, ArrowLeft, Calendar, Loader2, ChevronLeft,
  Building2, TrendingUp, ClipboardList, MessageSquare, Send, CheckCircle2,
  Search, BarChart3, DollarSign, ChevronDown, ShoppingCart, Briefcase,
  FileBarChart, PieChart,
} from 'lucide-react';
import { getMondayOfWeek, addWeeks, formatWeekLabel, getMonthLabel, addMonths, getCurrentYearMonth, getWeekStartsInMonth } from '../../lib/dateUtils';

interface PlanViewerProps {
  viewerProfile: Profile;
  viewerRole: UserRole;
  filterDepartment?: string;
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-5 border border-white shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

type ViewState =
  | { type: 'list' }
  | { type: 'employee'; employee: Profile }
  | { type: 'plan'; employee: Profile; plan: WeeklyPlan; items: PlanItem[]; report: WeeklyReport | null };

export default function PlanViewer({ viewerProfile, viewerRole, filterDepartment }: PlanViewerProps) {
  const today = new Date();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [view, setView] = useState<ViewState>({ type: 'list' });
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getMondayOfWeek(today));
  const [employeePlans, setEmployeePlans] = useState<Record<string, WeeklyPlan | null>>({});
  const [stats, setStats] = useState({ total: 0, plansThisWeek: 0 });
  const [comment, setComment] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterDept, setFilterDept] = useState(filterDepartment ?? '');
  const [viewMode, setViewMode] = useState<'plans' | 'resource' | 'sales'>('plans');

  // Resource mobilization summary
  const [resourceData, setResourceData] = useState<Array<{ name: string; dept: string; financial: number; week: string }>>([]);

  // Sales data
  const [salesData, setSalesData] = useState<DailySale[]>([]);
  const [totalWeekSales, setTotalWeekSales] = useState(0);

  const canComment = viewerRole === 'ceo' || viewerRole === 'manager' || viewerRole === 'ceo_office_head' || viewerRole === 'hr' || viewerRole === 'strategic_advisor';

  // Determine which users to show based on role
  const getTargetRoles = useCallback(() => {
    // CEO can see everyone
    if (viewerRole === 'ceo') return ['employee', 'manager', 'hr', 'ceo_office_head', 'strategic_advisor'];
    // Manager sees their department employees
    if (viewerRole === 'manager') return ['employee'];
    // HR and others see employees
    return ['employee'];
  }, [viewerRole]);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('full_name');

    const targetRoles = getTargetRoles();
    query = query.in('role', targetRoles);

    if (filterDepartment) {
      query = query.eq('department', filterDepartment);
    }

    const { data } = await query;
    const emps = data ?? [];
    setEmployees(emps);
    const depts = Array.from(new Set(emps.map((e) => e.department).filter(Boolean)));
    setDepartments(depts);
    setLoading(false);
    return emps;
  }, [filterDepartment, getTargetRoles]);

  const loadWeekStats = useCallback(async (emps: Profile[]) => {
    if (emps.length === 0) return;
    const { data: plans } = await supabase.from('weekly_plans').select('user_id').eq('week_start_date', selectedWeek).eq('plan_type', 'personal');
    const planMap: Record<string, WeeklyPlan | null> = {};
    emps.forEach((e) => { planMap[e.id] = null; });
    plans?.forEach((p) => { if (planMap[p.user_id] !== undefined) planMap[p.user_id] = p as WeeklyPlan; });
    setEmployeePlans(planMap);
    setStats({ total: emps.length, plansThisWeek: plans?.filter(p => emps.find(e => e.id === p.user_id))?.length ?? 0 });
  }, [selectedWeek]);

  const loadResourceData = useCallback(async (emps: Profile[]) => {
    const { data } = await supabase.from('weekly_reports').select('user_id, week_start_date, resource_financial').order('week_start_date', { ascending: false });
    if (!data) return;
    const rows = data.map((r) => {
      const emp = emps.find((e) => e.id === r.user_id);
      return { name: emp?.full_name ?? '?', dept: emp?.department ?? '?', financial: r.resource_financial ?? 0, week: r.week_start_date };
    });
    setResourceData(rows);
  }, []);

  const loadSalesData = useCallback(async (emps: Profile[]) => {
    const weekEnd = new Date(selectedWeek + 'T00:00:00');
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_sales')
      .select('*')
      .gte('sale_date', selectedWeek)
      .lte('sale_date', weekEndStr)
      .order('sale_date', { ascending: false });

    if (data) {
      setSalesData(data as DailySale[]);
      const total = data.reduce((sum, s) => sum + (s.amount || 0), 0);
      setTotalWeekSales(total);
    }
  }, [selectedWeek]);

  useEffect(() => {
    loadEmployees().then((emps) => {
      loadWeekStats(emps);
      loadResourceData(emps);
      loadSalesData(emps);
    });
  }, [loadEmployees, loadWeekStats, loadResourceData, loadSalesData]);

  useEffect(() => {
    loadWeekStats(employees);
    loadSalesData(employees);
  }, [selectedWeek, employees, loadWeekStats, loadSalesData]);

  const openEmployeePlan = async (employee: Profile) => {
    setLoading(true);
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', employee.id)
      .eq('week_start_date', selectedWeek)
      .eq('plan_type', 'personal')
      .maybeSingle();

    if (!plan) {
      setView({ type: 'employee', employee });
      setLoading(false);
      return;
    }

    const { data: items } = await supabase.from('plan_items').select('*').eq('plan_id', plan.id).order('s_no');
    const { data: report } = await supabase.from('weekly_reports').select('*').eq('user_id', employee.id).eq('week_start_date', selectedWeek).maybeSingle();

    const existingComment = viewerRole === 'manager' ? (plan as any).manager_comment ?? '' : (plan as any).ceo_comment ?? '';
    setComment(existingComment);
    setCommentSaved(false);
    setView({ type: 'plan', employee, plan: plan as WeeklyPlan, items: items ?? [], report: report ?? null });
    setLoading(false);
  };

  const saveComment = async () => {
    if (view.type !== 'plan') return;
    setCommentSaving(true);
    const ts = new Date().toISOString();
    const field = viewerRole === 'manager'
      ? { manager_comment: comment, manager_comment_at: ts, manager_id: viewerProfile.id }
      : { ceo_comment: comment, ceo_comment_at: ts };
    const { error } = await supabase.from('weekly_plans').update(field).eq('id', view.plan.id);
    if (!error) {
      setCommentSaved(true);
      setTimeout(() => setCommentSaved(false), 4000);
    }
    setCommentSaving(false);
  };

  const completionRate = stats.total > 0 ? Math.round((stats.plansThisWeek / stats.total) * 100) : 0;

  const filteredEmployees = employees.filter((e) => {
    const matchName = !searchName || e.full_name.toLowerCase().includes(searchName.toLowerCase());
    const matchDept = !filterDept || e.department === filterDept;
    return matchName && matchDept;
  });

  const totalFinancial = resourceData.filter((r) => r.week === selectedWeek).reduce((sum, r) => sum + r.financial, 0);

  // Plan view
  if (view.type === 'plan') {
    return (
      <div className="space-y-6">
        <button onClick={() => setView({ type: 'list' })} className="flex items-center gap-1.5 text-green-700 hover:text-green-900 font-medium text-sm transition-colors">
          <ArrowLeft size={16} /> Back to Employees
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-lg overflow-hidden">
                {view.employee.avatar_url ? (
                  <img src={view.employee.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  view.employee.full_name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{view.employee.full_name}</h3>
                <p className="text-sm text-gray-500">{view.employee.department}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Week</p>
              <p className="font-semibold text-gray-700">{formatWeekLabel(view.plan.week_start_date)}</p>
            </div>
          </div>
        </div>

        {/* Completion stats */}
        {(() => {
          const total = view.items.length;
          const done = view.items.filter((i) => i.is_completed).length;
          const rate = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={<ClipboardList size={20} className="text-blue-600" />} label="Total Tasks" value={total} bg="bg-blue-50" />
              <StatCard icon={<CheckCircle2 size={20} className="text-green-600" />} label="Completed" value={done} bg="bg-green-50" />
              <StatCard icon={<TrendingUp size={20} className="text-orange-600" />} label="Completion Rate" value={`${rate}%`} bg="bg-orange-50" />
            </div>
          );
        })()}

        {/* Weekly Report */}
        {view.report && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <BarChart3 size={16} className="text-green-600" /> Weekly Report
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                  <DollarSign size={11} /> Financial Mobilized
                </p>
                <p className="text-xl font-bold text-green-800">
                  {view.report.resource_financial > 0 ? `${view.report.resource_financial.toLocaleString()} ETB` : '—'}
                </p>
                {view.report.resource_financial_comment && <p className="text-xs text-gray-500 mt-1">{view.report.resource_financial_comment}</p>}
              </div>
              {view.report.departmental_work && (
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <p className="text-xs font-bold text-orange-700 mb-1">Departmental Work</p>
                  <p className="text-xs text-gray-700">{view.report.departmental_work}</p>
                </div>
              )}
              {view.report.additional_work && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs font-bold text-purple-700 mb-1">Additional Work</p>
                  <p className="text-xs text-gray-700">{view.report.additional_work}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <WeeklyPlanTable
            items={view.items}
            weekStart={view.plan.week_start_date}
            employeeName={view.employee.full_name}
            department={view.employee.department ?? ''}
            readOnly
            currentPage={1}
          />
        </div>

        {canComment && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600" />
              {viewerRole === 'manager' ? 'Manager Feedback' : 'Feedback'}
            </h4>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add feedback for this employee's weekly plan..."
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={saveComment}
                disabled={commentSaving || !comment.trim()}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow ${
                  commentSaved ? 'bg-green-600 text-white' : commentSaving ? 'bg-amber-500 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-300'
                }`}
              >
                {commentSaving ? <Loader2 size={15} className="animate-spin" /> : commentSaved ? <CheckCircle2 size={15} /> : <Send size={15} />}
                {commentSaved ? 'Saved!' : commentSaving ? 'Saving...' : 'Send Comment'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Employee no plan view
  if (view.type === 'employee') {
    return (
      <div className="space-y-6">
        <button onClick={() => setView({ type: 'list' })} className="flex items-center gap-1.5 text-green-700 hover:text-green-900 font-medium text-sm">
          <ArrowLeft size={16} /> Back to Employees
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <Building2 size={28} className="text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-800 text-lg mb-1">{view.employee.full_name}</h3>
          <p className="text-gray-500 text-sm">
            No plan submitted for <span className="font-medium text-gray-700">{formatWeekLabel(selectedWeek)}</span>.
          </p>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <StatCard icon={<Users size={22} className="text-green-600" />} label="Total Staff" value={stats.total} bg="bg-green-50" />
        <StatCard icon={<ClipboardList size={22} className="text-orange-600" />} label="Plans This Week" value={stats.plansThisWeek} bg="bg-orange-50" />
        <StatCard icon={<TrendingUp size={22} className="text-blue-600" />} label="Submission Rate" value={`${completionRate}%`} bg="bg-blue-50" />
        <StatCard icon={<DollarSign size={22} className="text-emerald-600" />} label="Financial Mobilized" value={`${totalFinancial.toLocaleString()} ETB`} bg="bg-emerald-50" />
        <StatCard icon={<ShoppingCart size={22} className="text-purple-600" />} label="Week Sales" value={`${totalWeekSales.toLocaleString()} ETB`} bg="bg-purple-50" />
      </div>

      {/* Week Nav */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={17} className="text-green-700" />
          <span className="font-semibold text-gray-700 text-sm">Week:</span>
          <span className="text-gray-900 font-medium text-sm">{formatWeekLabel(selectedWeek)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedWeek(addWeeks(selectedWeek, -1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setSelectedWeek(getMondayOfWeek(today))} className="text-xs font-medium text-green-700 hover:text-green-900 px-2 py-1 rounded-lg hover:bg-green-50">
            Current Week
          </button>
          <button onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* View mode + Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('plans')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'plans' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ClipboardList size={14} className="inline mr-1" /> Weekly Plans
            </button>
            <button
              onClick={() => setViewMode('resource')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'resource' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <DollarSign size={14} className="inline mr-1" /> Resource Mobilization
            </button>
            <button
              onClick={() => setViewMode('sales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'sales' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ShoppingCart size={14} className="inline mr-1" /> Daily Sales
            </button>
          </div>
          <span className="text-xs text-gray-400">{filteredEmployees.length} showing</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          {!filterDepartment && (
            <div className="relative">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {viewMode === 'sales' ? (
        <DailySalesTable sales={salesData} weekLabel={formatWeekLabel(selectedWeek)} total={totalWeekSales} />
      ) : viewMode === 'resource' ? (
        <ResourceMobilizationTable data={resourceData} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={17} className="text-green-700" />
            <h3 className="font-semibold text-gray-800">{filterDepartment ? `${filterDepartment} Department Staff` : 'All Staff'}</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-green-600" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No staff members found.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filteredEmployees.map((emp) => {
                const hasPlan = !!employeePlans[emp.id];
                return (
                  <li key={emp.id}>
                    <button
                      onClick={() => openEmployeePlan(emp)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            emp.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{emp.full_name}</p>
                          <p className="text-xs text-gray-500">{emp.department || 'No department'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hasPlan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {hasPlan ? 'Plan Submitted' : 'No Plan'}
                        </span>
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceMobilizationTable({ data }: { data: Array<{ name: string; dept: string; financial: number; week: string }> }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <DollarSign size={17} className="text-green-700" />
        <h3 className="font-semibold text-gray-800">Resource Mobilization Summary</h3>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Week</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Financial (ETB)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                No resource data yet.
              </td>
            </tr>
          ) : (
            data.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.dept}</td>
                <td className="px-4 py-3 text-gray-500">{formatWeekLabel(r.week)}</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{r.financial > 0 ? r.financial.toLocaleString() : '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DailySalesTable({ sales, weekLabel, total }: { sales: DailySale[]; weekLabel: string; total: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={17} className="text-purple-700" />
          <h3 className="font-semibold text-gray-800">Daily Sales Report — {weekLabel}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-green-700">{total.toLocaleString()} ETB</p>
        </div>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount (ETB)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sales.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                No sales reported this week.
              </td>
            </tr>
          ) : (
            sales.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-800">{s.sale_date}</td>
                <td className="px-4 py-3 text-gray-500">{s.category_name}</td>
                <td className="px-4 py-3 text-gray-500">{s.description || '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{s.amount.toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
