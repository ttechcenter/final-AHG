import React, { useRef, useState } from 'react';
import { X, Download, CheckCircle2, XCircle, Lightbulb, Target, AlertTriangle, ShieldCheck, Edit2, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';
import { MonthlyReport } from '../../types';
import { getMonthLabel } from '../../lib/dateUtils';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MonthlyReport;
  employeeName: string;
  department: string;
  onEdit?: () => void;
}

export default function MonthlyReportModal({
  isOpen,
  onClose,
  report,
  employeeName,
  department,
  onEdit,
}: MonthlyReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const monthLabel = getMonthLabel(report.year, report.month);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(reportRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Monthly_Report_${employeeName.replace(/\s+/g, '_')}_${report.year}_${report.month}.png`;
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
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Monthly Performance Report</h2>
            <p className="text-indigo-300 text-xs flex items-center gap-1">
              <Calendar size={12} /> {monthLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 text-indigo-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-600 hover:border-indigo-400 transition-colors"
              >
                <Edit2 size={12} /> Edit Report
              </button>
            )}
            <button onClick={onClose} className="text-indigo-300 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div ref={reportRef} className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 text-white px-8 py-8">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-indigo-300 text-xs uppercase tracking-widest mb-1">Monthly Report</p>
                  <h1 className="text-2xl font-bold tracking-wide">{monthLabel}</h1>
                </div>
                <div className="text-right">
                  <p className="text-indigo-300 text-xs">Employee</p>
                  <p className="font-bold">{employeeName}</p>
                  {department && <p className="text-indigo-200 text-sm">{department}</p>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="border-b border-slate-200">
              <div className="grid grid-cols-4 divide-x divide-slate-200">
                <div className="p-5 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Completion Rate</p>
                  <div className="relative inline-block">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke={report.completion_rate >= 80 ? '#10b981' : report.completion_rate >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${(report.completion_rate || 0) * 1.76} 176`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800">
                      {Math.round(report.completion_rate || 0)}%
                    </span>
                  </div>
                </div>
                <div className="p-5 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tasks</p>
                  <div className="text-3xl font-bold text-slate-800">
                    {report.completed_tasks}
                    <span className="text-slate-400 font-normal">/{report.total_tasks}</span>
                  </div>
                </div>
                <div className="p-5 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Financial Total</p>
                  <div className="text-2xl font-bold text-green-700">
                    {report.total_financial > 0 ? `${report.total_financial.toLocaleString()} ETB` : '—'}
                  </div>
                </div>
                <div className="p-5 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Working Days</p>
                  <div className="text-2xl font-bold text-slate-800">~22</div>
                </div>
              </div>
            </div>

            {/* Achievements & Challenges */}
            {(report.achievements || report.challenges || report.goals_next_month) && (
              <div className="border-b border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {report.achievements && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-xs font-bold text-green-700 mb-1">Key Achievements</p>
                    <p className="text-xs text-slate-700">{report.achievements}</p>
                  </div>
                )}
                {report.challenges && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <p className="text-xs font-bold text-red-700 mb-1">Challenges</p>
                    <p className="text-xs text-slate-700">{report.challenges}</p>
                  </div>
                )}
                {report.goals_next_month && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 mb-1">Goals for Next Month</p>
                    <p className="text-xs text-slate-700">{report.goals_next_month}</p>
                  </div>
                )}
              </div>
            )}

            {/* SWOT */}
            <div className="p-6">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">SWOT Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                    <ShieldCheck size={12} /> Strengths
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.strengths || '—'}</p>
                </div>
                <div className="border-l-4 border-rose-500 bg-rose-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-rose-700 uppercase mb-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> Weaknesses
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.weaknesses || '—'}</p>
                </div>
                <div className="border-l-4 border-sky-500 bg-sky-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-sky-700 uppercase mb-1 flex items-center gap-1">
                    <Lightbulb size={12} /> Opportunities
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.opportunities || '—'}</p>
                </div>
                <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-lg p-3">
                  <h4 className="text-xs font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
                    <Target size={12} /> Threats
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{report.threats || '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-900 text-indigo-300 text-center text-xs py-3 px-4">
              Generated by African Holding Groups — Monthly Planning System
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
            className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 text-white font-semibold px-5 py-2 rounded-lg shadow text-sm"
          >
            <Download size={15} /> {isExporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
