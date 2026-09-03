import React, { useRef, useState } from 'react';
import { X, Download, CheckCircle2, XCircle, DollarSign, Users, Briefcase, PlusCircle, Edit2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { WeeklyReport } from '../../types';

interface DayStats {
  day: string;
  total: number;
  completed: number;
  percentage: number;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: WeeklyReport;
  employeeName: string;
  department: string;
  weekLabel: string;
  weekStart: string;
  dayStats: DayStats[];
  totalTasks: number;
  completedTasks: number;
  onEdit?: () => void;
}

export default function ReportModal({
  isOpen,
  onClose,
  report,
  employeeName,
  department,
  weekLabel,
  weekStart,
  dayStats,
  totalTasks,
  completedTasks,
  onEdit,
}: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const bestDay = dayStats.length > 0 ? dayStats.reduce((a, b) => (a.percentage > b.percentage ? a : b), dayStats[0]) : null;
  const worstDay = dayStats.length > 0 ? dayStats.reduce((a, b) => (a.percentage < b.percentage ? a : b), dayStats[0]) : null;

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(reportRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Weekly_Report_${employeeName.replace(/\s+/g, '_')}_${weekStart}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Weekly Performance Report</h2>
            <p className="text-slate-400 text-xs">Generated analysis — {weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors"
              >
                <Edit2 size={12} /> Edit Report
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div ref={reportRef} className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-8 py-8">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Weekly Report</p>
                  <h1 className="text-2xl font-bold tracking-wide">{weekLabel}</h1>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs">Employee</p>
                  <p className="font-bold">{employeeName}</p>
                  {department && <p className="text-slate-300 text-sm">{department}</p>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="border-b border-slate-200">
              <div className="grid grid-cols-3 divide-x divide-slate-200">
                <div className="p-6 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Completion Rate</p>
                  <div className="relative inline-block">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="35" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke={completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${completionRate * 2.2} 220`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-800">
                      {completionRate}%
                    </span>
                  </div>
                </div>
                <div className="p-6 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tasks</p>
                  <div className="text-4xl font-bold text-slate-800">
                    {completedTasks}
                    <span className="text-slate-400 font-normal">/{totalTasks}</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%',
                        backgroundColor: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
                <div className="p-6 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Financial Mobilized</p>
                  <div className="text-3xl font-bold text-green-700">
                    {report.resource_financial > 0 ? `${report.resource_financial.toLocaleString()} ETB` : '—'}
                  </div>
                  {report.resource_financial_comment && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{report.resource_financial_comment}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Resource Mobilization Details */}
            {(report.resource_social || report.departmental_work || report.additional_work) && (
              <div className="border-b border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {report.resource_social && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 flex items-center gap-1 mb-1">
                      <Users size={12} /> Social Mobilization
                    </p>
                    <p className="text-xs text-slate-700">{report.resource_social}</p>
                  </div>
                )}
                {report.departmental_work && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <p className="text-xs font-bold text-orange-700 flex items-center gap-1 mb-1">
                      <Briefcase size={12} /> Departmental Work
                    </p>
                    <p className="text-xs text-slate-700">{report.departmental_work}</p>
                  </div>
                )}
                {report.additional_work && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <p className="text-xs font-bold text-purple-700 flex items-center gap-1 mb-1">
                      <PlusCircle size={12} /> Additional Work
                    </p>
                    <p className="text-xs text-slate-700">{report.additional_work}</p>
                  </div>
                )}
              </div>
            )}

            {/* Daily Chart */}
            <div className="border-b border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">Daily Progress</h3>
              <div className="flex items-end justify-between gap-2 h-32 px-2">
                {dayStats.map((d, idx) => {
                  const height = d.total > 0 ? Math.max((d.percentage / 100) * 100, 8) : 8;
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div className="relative w-full h-28 flex items-end justify-center pb-2">
                        <div
                          className="w-full max-w-10 rounded-t-lg transition-all"
                          style={{
                            height: `${height}%`,
                            backgroundColor: d.percentage >= 80 ? '#10b981' : d.percentage >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 mt-1">{d.day.slice(0, 3).toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
              {bestDay && worstDay && bestDay.day !== worstDay.day && (
                <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Best: {bestDay.day} ({bestDay.percentage}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Focus: {worstDay.day} ({worstDay.percentage}%)
                  </span>
                </div>
              )}
            </div>

            {/* SWOT */}
            <div className="p-6">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">SWOT Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Strengths
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.strengths || '—'}</p>
                </div>
                <div className="border-l-4 border-rose-500 bg-rose-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-rose-700 uppercase mb-1 flex items-center gap-1">
                    <XCircle size={12} /> Weaknesses
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.weaknesses || '—'}</p>
                </div>
                <div className="border-l-4 border-sky-500 bg-sky-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-sky-700 uppercase mb-1">Opportunities</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.opportunities || '—'}</p>
                </div>
                <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-amber-700 uppercase mb-1">Threats</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.threats || '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-400 text-center text-xs py-3 px-4">
              Generated by African Holding Groups — Weekly Planning System
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold px-5 py-2 rounded-lg shadow text-sm"
          >
            <Download size={15} /> {isExporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
