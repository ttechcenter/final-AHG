import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, WeeklyPlan, PlanItem, WeeklyReport, MonthlyReport, SalesCategory, DailySale } from '../../types';
import SWOTModal from '../../components/modals/SWOTModal';
import MonthlySWOTModal from '../../components/modals/MonthlySWOTModal';
import ReportModal from '../../components/modals/ReportModal';
import MonthlyReportModal from '../../components/modals/MonthlyReportModal';
import WeeklyPlanTable, { formatPlanAsText, formatWeekRange } from '../../components/dashboard/WeeklyPlanTable';
import {
  ChevronLeft, ChevronRight, PlusCircle, Trash2, Loader2, CheckCircle2,
  Calendar, Save, CloudOff, Cloud, Send, BellRing, FileBarChart, MessageSquare,
  ShoppingCart, DollarSign, BarChart3, FileText, Eye, EyeOff, Plus, X,
} from 'lucide-react';
import { getMondayOfWeek, addWeeks, formatWeekLabel, getMonthLabel, addMonths, getCurrentYearMonth, getWeekStartsInMonth } from '../../lib/dateUtils';
import { useToast } from '../../components/ToastProvider';

interface EmployeeDashboardProps {
  profile: Profile;
}

const WEEK_DAYS_CONFIG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => ({ day: d, s_no: 1 }));

function buildEmptyItem(planId: string, day: string, sNo: number, pageNum: number): Omit<PlanItem, 'id'> {
  return {
    plan_id: planId,
    s_no: sNo,
    day_of_week: day,
    page_num: pageNum,
    a_epie: '',
    preparation: '',
    principle: '',
    plan_col: '',
    perform: '',
    productivity: '',
    profit_impl: '',
    pragmatism: '',
    persistence: '',
    profit_eval: '',
    is_completed: false,
    created_at: new Date().toISOString(),
  };
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type PlanType = 'personal' | 'departmental';
type Tab = 'weekly' | 'monthly' | 'sales';

function getReminderUrgency(weekStart: string): null | 'medium' | 'high' {
  const today = new Date();
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  if (today < start || today > end) return null;
  const dow = today.getDay();
  if (dow === 4) return 'medium';
  if (dow === 5 || dow === 6) return 'high';
  return null;
}

export default function EmployeeDashboard({ profile }: EmployeeDashboardProps) {
  const today = new Date();
  const [currentTab, setCurrentTab] = useState<Tab>('weekly');
  const [currentWeek, setCurrentWeek] = useState(getMondayOfWeek(today));
  const [currentMonth, setCurrentMonth] = useState(getCurrentYearMonth());
  const [planType, setPlanType] = useState<PlanType>('personal');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [showSWOTModal, setShowSWOTModal] = useState(false);
  const [showMonthlySWOTModal, setShowMonthlySWOTModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [existingReport, setExistingReport] = useState<WeeklyReport | null>(null);
  const [existingMonthlyReport, setExistingMonthlyReport] = useState<MonthlyReport | null>(null);
  const [ceoComment, setCEOComment] = useState('');
  const [managerComment, setManagerComment] = useState('');
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sales
  const [salesCategories, setSalesCategories] = useState<SalesCategory[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [selectedSaleDate, setSelectedSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleCategoryId, setSaleCategoryId] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleDescription, setSaleDescription] = useState('');
  const [saleSubmitting, setSaleSubmitting] = useState(false);

  // For managers + departmental plan
  const canCreateDepartmentalPlan = profile.role === 'manager' || profile.role === 'ceo_office_head' || profile.role === 'hr';

  const saveItemToDb = useCallback(async (item: PlanItem) => {
    setSaveState('saving');
    const { error: err } = await supabase
      .from('plan_items')
      .update({
        a_epie: item.a_epie,
        preparation: item.preparation,
        principle: item.principle,
        plan_col: item.plan_col,
        perform: item.perform,
        productivity: item.productivity,
        profit_impl: item.profit_impl,
        pragmatism: item.pragmatism,
        persistence: item.persistence,
        profit_eval: item.profit_eval,
        is_completed: item.is_completed,
      })
      .eq('id', item.id);
    setSaveState(err ? 'error' : 'saved');
    if (!err) setTimeout(() => setSaveState('idle'), 2000);
  }, []);

  // show toast feedback on save state changes
  const toast = useToast();
  React.useEffect(() => {
    if (saveState === 'saved') toast.success('All changes saved');
    if (saveState === 'error') toast.error('Save failed — please try again');
  }, [saveState, toast]);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError('');
    setPlan(null);
    setItems([]);
    setExistingReport(null);
    setCEOComment('');
    setManagerComment('');

    const { data: planData } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', profile.id)
      .eq('week_start_date', currentWeek)
      .eq('plan_type', planType)
      .maybeSingle();

    if (planData) {
      setCEOComment((planData as any).ceo_comment ?? '');
      setManagerComment((planData as any).manager_comment ?? '');
      setPlan(planData as WeeklyPlan);
      const { data: itemData } = await supabase.from('plan_items').select('*').eq('plan_id', planData.id).order('page_num').order('s_no');
      setItems(itemData ?? []);
    }

    const { data: report } = await supabase.from('weekly_reports').select('*').eq('user_id', profile.id).eq('week_start_date', currentWeek).maybeSingle();
    if (report) setExistingReport(report as WeeklyReport);

    setLoading(false);
  }, [profile.id, currentWeek, planType]);

  const loadMonthlyReport = useCallback(async () => {
    const { data } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('user_id', profile.id)
      .eq('year', currentMonth.year)
      .eq('month', currentMonth.month)
      .maybeSingle();
    if (data) setExistingMonthlyReport(data as MonthlyReport);
    else setExistingMonthlyReport(null);
  }, [profile.id, currentMonth]);

  const loadSalesCategories = useCallback(async () => {
    const { data } = await supabase.from('sales_categories').select('*').eq('is_active', true).order('name');
    if (data) setSalesCategories(data as SalesCategory[]);
  }, []);

  const loadDailySales = useCallback(async () => {
    const { data } = await supabase.from('daily_sales').select('*').eq('user_id', profile.id).order('sale_date', { ascending: false }).limit(30);
    if (data) setDailySales(data as DailySale[]);
  }, [profile.id]);

  useEffect(() => {
    loadPlan();
    setCurrentPage(1);
    setReminderDismissed(false);
  }, [loadPlan]);

  useEffect(() => {
    loadMonthlyReport();
  }, [loadMonthlyReport]);

  useEffect(() => {
    loadSalesCategories();
    loadDailySales();
  }, [loadSalesCategories, loadDailySales]);

  const createPlan = async () => {
    setCreating(true);
    const { data: newPlan, error: createErr } = await supabase
      .from('weekly_plans')
      .insert({
        user_id: profile.id,
        week_start_date: currentWeek,
        plan_type: planType,
        department_id: planType === 'departmental' ? profile.department_id : null,
      })
      .select()
      .single();

    if (createErr || !newPlan) {
      setError('Could not create plan.');
      setCreating(false);
      return;
    }

    const { data: insertedItems } = await supabase
      .from('plan_items')
      .insert(WEEK_DAYS_CONFIG.map((cfg) => buildEmptyItem(newPlan.id, cfg.day, cfg.s_no, 1)))
      .select();

    setPlan(newPlan as WeeklyPlan);
    setItems(insertedItems ?? []);
    setCreating(false);
  };

  const handleItemChange = (id: string, field: keyof PlanItem, value: string | boolean) => {
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, [field]: value } : item));
      const updatedItem = updated.find((i) => i.id === id);
      if (updatedItem) {
        const existing = debounceTimers.current.get(id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          saveItemToDb(updatedItem);
          debounceTimers.current.delete(id);
        }, 800);
        debounceTimers.current.set(id, timer);
      }
      return updated;
    });
  };

  const handleToggleComplete = async (id: string, value: boolean) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_completed: value } : item)));
    setSaveState('saving');
    const { error: err } = await supabase.from('plan_items').update({ is_completed: value }).eq('id', id);
    setSaveState(err ? 'error' : 'saved');
    if (!err) setTimeout(() => setSaveState('idle'), 1500);
  };

  const saveAllNow = async () => {
    if (!plan || items.length === 0) return;
    setSaveState('saving');
    debounceTimers.current.forEach((t) => clearTimeout(t));
    debounceTimers.current.clear();
    const results = await Promise.all(
      items.map((item) =>
        supabase
          .from('plan_items')
          .update({
            a_epie: item.a_epie,
            preparation: item.preparation,
            principle: item.principle,
            plan_col: item.plan_col,
            perform: item.perform,
            productivity: item.productivity,
            profit_impl: item.profit_impl,
            pragmatism: item.pragmatism,
            persistence: item.persistence,
            profit_eval: item.profit_eval,
            is_completed: item.is_completed,
          })
          .eq('id', item.id)
      )
    );
    setSaveState(results.some((r) => r.error) ? 'error' : 'saved');
    setTimeout(() => setSaveState('idle'), 2500);
  };

  const addRowForDay = async (day: string) => {
    if (!plan) return;
    const dayItems = items.filter((i) => i.day_of_week === day && i.page_num === currentPage);
    const nextSNo = dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.s_no)) + 1 : 1;
    const { data, error: err } = await supabase.from('plan_items').insert(buildEmptyItem(plan.id, day, nextSNo, currentPage)).select().single();
    if (!err && data) setItems((prev) => [...prev, data]);
  };

  const removeRowForDay = async (day: string) => {
    if (!plan) return;
    const dayItems = items.filter((i) => i.day_of_week === day && i.page_num === currentPage);
    if (dayItems.length === 0) return;
    const last = dayItems.reduce((a, b) => (b.s_no > a.s_no ? b : a));
    const { error } = await supabase.from('plan_items').delete().eq('id', last.id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== last.id));
  };

  const addPage = async () => {
    if (!plan) return;
    const nextPage = Math.max(...items.map((i) => i.page_num), 0) + 1;
    const { data, error: err } = await supabase
      .from('plan_items')
      .insert(WEEK_DAYS_CONFIG.map((cfg) => buildEmptyItem(plan.id, cfg.day, 1, nextPage)))
      .select();
    if (!err && data) {
      setItems((prev) => [...prev, ...data]);
      setCurrentPage(nextPage);
    }
  };

  const removePage = async (page: number) => {
    const ids = items.filter((i) => i.page_num === page).map((i) => i.id);
    if (ids.length === 0) return;
    await supabase.from('plan_items').delete().in('id', ids);
    const remaining = items.filter((i) => i.page_num !== page);
    setItems(remaining);
    const remPages = Array.from(new Set(remaining.map((i) => i.page_num))).sort((a, b) => a - b);
    setCurrentPage(remPages[remPages.length - 1] ?? 1);
  };

  const handlePasteRows = async (day: string, rows: Partial<Record<string, string>>[]) => {
    if (!plan) return;
    const dayItems = items.filter((i) => i.day_of_week === day && i.page_num === currentPage);
    let nextSNo = dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.s_no)) + 1 : 1;

    const toInsert = rows.map((row) => ({
      ...buildEmptyItem(plan.id, day, nextSNo++, currentPage),
      a_epie: row.a_epie ?? '',
      preparation: row.preparation ?? '',
      principle: row.principle ?? '',
      plan_col: row.plan_col ?? '',
      perform: row.perform ?? '',
      productivity: row.productivity ?? '',
      profit_impl: row.profit_impl ?? '',
      pragmatism: row.pragmatism ?? '',
      persistence: row.persistence ?? '',
      profit_eval: row.profit_eval ?? '',
    }));

    const { data, error: err } = await supabase.from('plan_items').insert(toInsert).select();
    if (!err && data) setItems((prev) => [...prev, ...data]);
  };

  const handleSWOTSubmit = async (data: any) => {
    const reportData = { user_id: profile.id, week_start_date: currentWeek, ...data, updated_at: new Date().toISOString() };
    const { data: saved, error } = await supabase.from('weekly_reports').upsert(reportData, { onConflict: 'user_id,week_start_date' }).select().single();
    if (!error && saved) {
      setExistingReport(saved as WeeklyReport);
      setShowSWOTModal(false);
      setShowReportModal(true);
      toast.success('Weekly report saved');
    }
  };

  const handleMonthlySWOTSubmit = async (data: any) => {
    const reportData = {
      user_id: profile.id,
      year: currentMonth.year,
      month: currentMonth.month,
      ...data,
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error } = await supabase
      .from('monthly_reports')
      .upsert(reportData, { onConflict: 'user_id,year,month' })
      .select()
      .single();
    if (!error && saved) {
      setExistingMonthlyReport(saved as MonthlyReport);
      setShowMonthlySWOTModal(false);
      setShowMonthlyReportModal(true);
      toast.success('Monthly report saved');
    }
  };

  const handleReportClick = async () => {
    await saveAllNow();
    if (existingReport) setShowReportModal(true);
    else setShowSWOTModal(true);
  };

  const handleMonthlyReportClick = () => {
    if (existingMonthlyReport) setShowMonthlyReportModal(true);
    else setShowMonthlySWOTModal(true);
  };

  const handleDownload = () => {
    const text = formatPlanAsText(items, currentWeek, profile.full_name, profile.department ?? '');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Weekly-Plan-${formatWeekRange(currentWeek)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendToTelegram = async () => {
    await saveAllNow();
    const text = formatPlanAsText(items, currentWeek, profile.full_name, profile.department ?? '');
    window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, '_blank');
  };

  const submitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleCategoryId || !saleAmount) return;

    setSaleSubmitting(true);
    const category = salesCategories.find((c) => c.id === saleCategoryId);

    const { error } = await supabase.from('daily_sales').insert({
      user_id: profile.id,
      sale_date: selectedSaleDate,
      category_id: saleCategoryId,
      category_name: category?.name ?? '',
      amount: parseFloat(saleAmount),
      description: saleDescription,
    });

    if (!error) {
      setShowSalesForm(false);
      setSaleCategoryId('');
      setSaleAmount('');
      setSaleDescription('');
      loadDailySales();
    }
    setSaleSubmitting(false);
  };

  const deleteSale = async (id: string) => {
    if (!confirm('Delete this sale entry?')) return;
    await supabase.from('daily_sales').delete().eq('id', id);
    loadDailySales();
  };

  const pages = Array.from(new Set(items.map((i) => i.page_num))).sort((a, b) => a - b);
  const isCurrentWeek = currentWeek === getMondayOfWeek(today);
  const reminderUrgency = isCurrentWeek ? getReminderUrgency(currentWeek) : null;
  const pendingItems = items.filter((i) => !i.is_completed);
  const showReminder = reminderUrgency && pendingItems.length > 0 && !reminderDismissed && !!plan;

  const dayStats = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
    const dayItems = items.filter((i) => i.day_of_week === day);
    const total = dayItems.length;
    const completed = dayItems.filter((i) => i.is_completed).length;
    return { day, total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  // Calculate monthly stats
  const monthlyStats = {
    totalTasks: items.length,
    completedTasks: items.filter((i) => i.is_completed).length,
    completionRate: items.length > 0 ? Math.round((items.filter((i) => i.is_completed).length / items.length) * 100) : 0,
  };

  const SaveIndicator = () => {
    if (saveState === 'idle') return null;
    return (
      <span className={`flex items-center gap-1.5 text-xs font-medium ${saveState === 'saving' ? 'text-orange-600' : saveState === 'saved' ? 'text-green-600' : 'text-red-600'}`}>
        {saveState === 'saving' ? (
          <>
            <Loader2 size={12} className="animate-spin" /> Saving…
          </>
        ) : saveState === 'saved' ? (
          <>
            <Cloud size={12} /> Saved
          </>
        ) : (
          <>
            <CloudOff size={12} /> Failed
          </>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'weekly', label: 'Weekly Plan', icon: <Calendar size={15} /> },
          { key: 'monthly', label: 'Monthly Report', icon: <FileBarChart size={15} /> },
          { key: 'sales', label: 'Daily Sales', icon: <ShoppingCart size={15} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setCurrentTab(t.key as Tab)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              currentTab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {currentTab === 'sales' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={18} className="text-purple-600" /> My Sales Submissions
              </h3>
              <button
                onClick={() => setShowSalesForm(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                <Plus size={14} /> Submit Sale
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount (ETB)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dailySales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                        No sales submitted yet.
                      </td>
                    </tr>
                  ) : (
                    dailySales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{sale.sale_date}</td>
                        <td className="px-4 py-3 text-gray-600">{sale.category_name}</td>
                        <td className="px-4 py-3 text-gray-500">{sale.description || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{sale.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteSale(sale.id)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <p className="text-sm text-gray-500">
                Total:{' '}
                <span className="font-bold text-green-700">{dailySales.reduce((sum, s) => sum + s.amount, 0).toLocaleString()} ETB</span>
              </p>
            </div>
          </div>

          {/* Sales Form Modal */}
          {showSalesForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-purple-700 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <ShoppingCart size={18} /> Submit Daily Sale
                  </h3>
                  <button onClick={() => setShowSalesForm(false)} className="text-purple-200 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={submitSale} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Sale Date</label>
                    <input
                      type="date"
                      required
                      value={selectedSaleDate}
                      onChange={(e) => setSelectedSaleDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Category</label>
                    <select
                      required
                      value={saleCategoryId}
                      onChange={(e) => setSaleCategoryId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="">Select category...</option>
                      {salesCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Amount (ETB)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">Description (optional)</label>
                    <textarea
                      value={saleDescription}
                      onChange={(e) => setSaleDescription(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSalesForm(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saleSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm"
                    >
                      {saleSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Report Tab */}
      {currentTab === 'monthly' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={17} className="text-indigo-700" />
              <span className="font-semibold text-gray-700 text-sm">Monthly Report:</span>
              <span className="text-gray-900 font-medium">{getMonthLabel(currentMonth.year, currentMonth.month)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth.year, currentMonth.month, -1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentMonth(getCurrentYearMonth())}
                className="text-xs font-medium text-indigo-700 hover:text-indigo-900 px-2 py-1 rounded-lg hover:bg-indigo-50"
              >
                Current Month
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth.year, currentMonth.month, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-800 mt-0.5">{monthlyStats.totalTasks}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-green-700 mt-0.5">{monthlyStats.completedTasks}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completion Rate</p>
              <p className="text-2xl font-bold text-orange-700 mt-0.5">{monthlyStats.completionRate}%</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-5 border border-white shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sales</p>
              <p className="text-2xl font-bold text-purple-700 mt-0.5">{dailySales.reduce((sum, s) => sum + s.amount, 0).toLocaleString()} ETB</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            {existingMonthlyReport ? (
              <div>
                <p className="text-gray-600 mb-4">You have already generated your monthly report for {getMonthLabel(currentMonth.year, currentMonth.month)}.</p>
                <button
                  onClick={() => setShowMonthlyReportModal(true)}
                  className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow"
                >
                  <Eye size={16} /> View Report
                </button>
              </div>
            ) : (
              <div>
                <BarChart3 size={40} className="text-indigo-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Generate your monthly performance report for {getMonthLabel(currentMonth.year, currentMonth.month)}.</p>
                <button
                  onClick={handleMonthlyReportClick}
                  className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow"
                >
                  <FileBarChart size={16} /> Generate Monthly Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Plan Tab */}
      {currentTab === 'weekly' && (
        <>
          {/* Reminder */}
          {showReminder && (
            <div
              className={`rounded-xl border-l-4 p-4 flex items-start justify-between gap-3 shadow-sm ${
                reminderUrgency === 'high' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <BellRing size={20} className={`shrink-0 mt-0.5 ${reminderUrgency === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  <p className={`font-bold text-sm ${reminderUrgency === 'high' ? 'text-red-700' : 'text-amber-700'}`}>
                    {reminderUrgency === 'high' ? 'Urgent: Week Ending Soon!' : 'Reminder: Week Nearing End'}
                  </p>
                  <p className={`text-xs mt-0.5 ${reminderUrgency === 'high' ? 'text-red-600' : 'text-amber-600'}`}>
                    You have <span className="font-bold">{pendingItems.length}</span> uncompleted task{pendingItems.length > 1 ? 's' : ''} this week.
                  </p>
                </div>
              </div>
              <button onClick={() => setReminderDismissed(true)} className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none">
                ×
              </button>
            </div>
          )}

          {/* Feedback banners */}
          {ceoComment && (
            <div className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-4 shadow">
              <h3 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                <MessageSquare size={14} /> CEO Feedback
              </h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{ceoComment}</p>
            </div>
          )}
          {managerComment && (
            <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 shadow">
              <h3 className="text-sm font-bold text-orange-800 mb-1 flex items-center gap-2">
                <MessageSquare size={14} /> Manager Feedback
              </h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{managerComment}</p>
            </div>
          )}

          {/* Week navigator */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-800 to-green-700 px-4 py-2 flex items-center justify-between">
              <span className="text-green-200 text-xs font-medium uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={13} /> Week Navigation
              </span>
              {isCurrentWeek && <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">CURRENT WEEK</span>}
            </div>
            <div className="flex items-stretch">
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
                className="flex flex-col items-center justify-center h-20 w-16 bg-green-50 hover:bg-green-100 border-r border-gray-100 text-green-700 transition-colors group shrink-0"
              >
                <ChevronLeft size={28} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs text-green-600 font-medium">Prev</span>
              </button>
              <div className="flex-1 text-center px-4 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-gray-800">{formatWeekLabel(currentWeek)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Monday – Friday (Tasks) · Saturday (Reporting)</p>
              </div>
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="flex flex-col items-center justify-center h-20 w-16 bg-green-50 hover:bg-green-100 border-l border-gray-100 text-green-700 transition-colors group shrink-0"
              >
                <ChevronRight size={28} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs text-green-600 font-medium">Next</span>
              </button>
            </div>
            {!isCurrentWeek && (
              <div className="px-4 py-2 border-t border-gray-100 flex justify-center">
                <button onClick={() => setCurrentWeek(getMondayOfWeek(today))} className="text-xs font-semibold text-orange-600 hover:text-orange-800">
                  Jump to Current Week
                </button>
              </div>
            )}
          </div>

          {/* Plan type selector for managers */}
          {canCreateDepartmentalPlan && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Plan Type:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPlanType('personal')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    planType === 'personal' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Personal Plan
                </button>
                <button
                  onClick={() => setPlanType('departmental')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    planType === 'departmental' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Departmental Plan
                </button>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-green-600" />
            </div>
          )}

          {!loading && !plan && (
            <div className="bg-white rounded-2xl shadow-sm border border-dashed border-green-300 p-14 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-5">
                <Calendar size={28} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Plan for This Week</h3>
              <p className="text-gray-500 text-sm mb-7">
                Create your {planType} weekly schedule for <span className="font-semibold text-gray-700">{formatWeekLabel(currentWeek)}</span>.
              </p>
              <button
                onClick={createPlan}
                disabled={creating}
                className="inline-flex items-center gap-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-lg text-sm"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                {creating ? 'Creating…' : 'Create Weekly Plan'}
              </button>
            </div>
          )}

          {!loading && plan && (
            <>
              {/* Page navigation */}
              {pages.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const idx = pages.indexOf(currentPage);
                        if (idx > 0) setCurrentPage(pages[idx - 1]);
                      }}
                      disabled={pages.indexOf(currentPage) === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold disabled:opacity-40 border border-green-200"
                    >
                      <ChevronLeft size={16} /> Previous Page
                    </button>
                    <div className="flex items-center gap-1 mx-2">
                      {pages.map((p) => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            p === currentPage ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const idx = pages.indexOf(currentPage);
                        if (idx < pages.length - 1) setCurrentPage(pages[idx + 1]);
                      }}
                      disabled={pages.indexOf(currentPage) === pages.length - 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold disabled:opacity-40 border border-green-200"
                    >
                      Next Page <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={addPage} className="text-xs font-medium text-green-700 hover:text-green-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-green-50">
                      <PlusCircle size={13} /> Add Page
                    </button>
                    {pages.length > 1 && (
                      <button onClick={() => removePage(currentPage)} className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50">
                        <Trash2 size={13} /> Remove Page
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <WeeklyPlanTable
                  items={items}
                  weekStart={currentWeek}
                  employeeName={profile.full_name}
                  department={profile.department ?? ''}
                  readOnly={false}
                  onItemChange={handleItemChange}
                  onToggleComplete={handleToggleComplete}
                  onPasteRows={handlePasteRows}
                  currentPage={currentPage}
                />

                {/* Row controls */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-2">Adjust rows per day:</p>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS_CONFIG.map(({ day }) => (
                      <div key={day} className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                          onClick={() => removeRowForDay(day)}
                          className="text-xs font-medium px-2.5 py-1.5 border-r border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        >
                          -
                        </button>
                        <button
                          onClick={() => addRowForDay(day)}
                          className={`text-xs font-medium px-3 py-1.5 transition-colors ${
                            day === 'Saturday' ? 'bg-green-50 text-green-800 hover:bg-green-100' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                          }`}
                        >
                          + {day.slice(0, 3)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action bar */}
                <div className="px-4 py-3 bg-green-50 border-t border-green-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <CheckCircle2 size={13} />
                    <span>Auto-saved as you type</span>
                    <SaveIndicator />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveAllNow}
                      disabled={saveState === 'saving'}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow ${
                        saveState === 'saved'
                          ? 'bg-green-500 text-white'
                          : saveState === 'saving'
                          ? 'bg-green-400 text-white cursor-wait'
                          : 'bg-green-700 hover:bg-green-800 text-white'
                      }`}
                    >
                      {saveState === 'saving' ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Saving…
                        </>
                      ) : saveState === 'saved' ? (
                        <>
                          <CheckCircle2 size={14} /> Saved!
                        </>
                      ) : (
                        <>
                          <Save size={14} /> Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-blue-500 hover:bg-blue-600 text-white transition-all shadow"
                    >
                      Download
                    </button>
                    <button
                      onClick={handleReportClick}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-700 hover:bg-slate-800 text-white transition-all shadow"
                    >
                      <FileBarChart size={14} /> {existingReport ? 'View Report' : 'Report'}
                    </button>
                    <button
                      onClick={handleSendToTelegram}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-sky-500 hover:bg-sky-600 text-white transition-all shadow"
                    >
                      <Send size={14} /> Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <SWOTModal
        isOpen={showSWOTModal}
        onClose={() => setShowSWOTModal(false)}
        onSubmit={handleSWOTSubmit}
        employeeName={profile.full_name}
        weekLabel={formatWeekLabel(currentWeek)}
        weekStart={currentWeek}
        userId={profile.id}
        existing={existingReport}
      />

      {existingReport && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          report={existingReport}
          employeeName={profile.full_name}
          department={profile.department ?? ''}
          weekLabel={formatWeekLabel(currentWeek)}
          weekStart={currentWeek}
          dayStats={dayStats}
          totalTasks={items.length}
          completedTasks={items.filter((i) => i.is_completed).length}
          onEdit={() => {
            setShowReportModal(false);
            setShowSWOTModal(true);
          }}
        />
      )}

      <MonthlySWOTModal
        isOpen={showMonthlySWOTModal}
        onClose={() => setShowMonthlySWOTModal(false)}
        onSubmit={handleMonthlySWOTSubmit}
        employeeName={profile.full_name}
        monthLabel={getMonthLabel(currentMonth.year, currentMonth.month)}
        year={currentMonth.year}
        month={currentMonth.month}
        userId={profile.id}
        existing={existingMonthlyReport}
      />

      {existingMonthlyReport && (
        <MonthlyReportModal
          isOpen={showMonthlyReportModal}
          onClose={() => setShowMonthlyReportModal(false)}
          report={existingMonthlyReport}
          employeeName={profile.full_name}
          department={profile.department ?? ''}
          onEdit={() => {
            setShowMonthlyReportModal(false);
            setShowMonthlySWOTModal(true);
          }}
        />
      )}
    </div>
  );
}
