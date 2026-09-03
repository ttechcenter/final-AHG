import React, { useRef, useState, useCallback } from 'react';
import { PlanItem } from '../../types';
import { CheckCircle2, Circle, ClipboardPaste, X, AlertCircle, Check } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HEADERS = [
  { key: 'a_epie',       label: 'A/EPIE'        },
  { key: 'preparation',  label: 'Preparation'   },
  { key: 'principle',    label: 'Principle'     },
  { key: 'plan_col',     label: 'Plan'          },
  { key: 'perform',      label: 'Perform'       },
  { key: 'productivity', label: 'Productivity'  },
  { key: 'profit_impl',  label: 'Profit (Impl)' },
  { key: 'pragmatism',   label: 'Pragmatism'    },
  { key: 'persistence',  label: 'Persistence'   },
  { key: 'profit_eval',  label: 'Profit (Eval)' },
] as const;

type HeaderKey = typeof HEADERS[number]['key'];

interface WeeklyPlanTableProps {
  items: PlanItem[];
  weekStart: string;
  employeeName: string;
  department: string;
  readOnly: boolean;
  onItemChange?: (id: string, field: keyof PlanItem, value: string | boolean) => void;
  onToggleComplete?: (id: string, value: boolean) => void;
  onPasteRows?: (day: string, rows: Partial<Record<HeaderKey, string>>[]) => void;
  currentPage?: number;
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

export function formatPlanAsText(items: PlanItem[], weekStart: string, name: string, dept: string): string {
  const lines: string[] = [
    '='.repeat(60),
    `AFRICAN HOLDING GROUPS - WEEKLY PLAN`,
    `Employee: ${name}   Department: ${dept}`,
    `Week: ${formatWeekRange(weekStart)}`,
    '='.repeat(60),
  ];
  for (const day of DAYS) {
    const dayItems = items.filter((i) => i.day_of_week === day);
    if (dayItems.length === 0) continue;
    lines.push(`\n${day.toUpperCase()}`);
    lines.push('-'.repeat(40));
    for (const item of dayItems) {
      lines.push(`  [${item.is_completed ? 'X' : ' '}] ${item.a_epie || '(empty)'}`);
      if (item.plan_col) lines.push(`      Plan: ${item.plan_col}`);
      if (item.perform) lines.push(`      Perform: ${item.perform}`);
    }
  }
  return lines.join('\n');
}

// Auto-growing textarea cell
function AutoTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Resize on render
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => { onChange(e.target.value); resize(); }}
      onFocus={resize}
      onInput={resize}
      className="w-full min-w-[6rem] px-2 py-1.5 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-400 text-gray-800 text-xs resize-none overflow-hidden leading-relaxed"
      style={{ minHeight: '2rem' }}
    />
  );
}

// ─── Paste preview modal ──────────────────────────────────────────────────────
interface PastePreviewProps {
  day: string;
  rows: Partial<Record<HeaderKey, string>>[];
  onConfirm: () => void;
  onCancel: () => void;
}

function PastePreview({ day, rows, onConfirm, onCancel }: PastePreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="bg-green-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <ClipboardPaste size={18} /> Paste Preview — {day}
            </h3>
            <p className="text-green-300 text-xs mt-0.5">{rows.length} row{rows.length !== 1 ? 's' : ''} detected from clipboard</p>
          </div>
          <button onClick={onCancel} className="text-green-300 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-500" />
            Review the data below. Columns are matched left-to-right to the plan table headers. Confirm to add these rows.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">#</th>
                  {HEADERS.map((h) => (
                    <th key={h.key} className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 font-medium">{i + 1}</td>
                    {HEADERS.map((h) => (
                      <td key={h.key} className="px-3 py-2 text-gray-700 whitespace-pre-wrap break-words max-w-[10rem]">
                        {row[h.key] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-6 py-4 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={onConfirm}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg shadow text-sm transition-colors">
            <Check size={15} /> Insert {rows.length} Row{rows.length !== 1 ? 's' : ''} into {day}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Parse TSV/CSV clipboard text ─────────────────────────────────────────────
function parseClipboardToRows(text: string): Partial<Record<HeaderKey, string>>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  const keys = HEADERS.map((h) => h.key);

  return lines.map((line) => {
    // Excel copies as tab-separated; fall back to comma if no tabs
    const cells = line.includes('\t') ? line.split('\t') : line.split(',');
    const row: Partial<Record<HeaderKey, string>> = {};
    keys.forEach((k, i) => {
      row[k] = cells[i]?.trim() ?? '';
    });
    return row;
  });
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function WeeklyPlanTable({
  items,
  readOnly,
  onItemChange,
  onToggleComplete,
  onPasteRows,
  currentPage = 1,
}: WeeklyPlanTableProps) {
  const pageItems = items.filter((i) => i.page_num === currentPage);

  // Paste state
  const [pasteDay, setPasteDay] = useState<string | null>(null);
  const [pasteRows, setPasteRows] = useState<Partial<Record<HeaderKey, string>>[]>([]);
  const [pasteError, setPasteError] = useState('');

  const handlePasteButton = async (day: string) => {
    setPasteError('');
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { setPasteError('Clipboard is empty.'); return; }
      const rows = parseClipboardToRows(text);
      if (rows.length === 0) { setPasteError('Could not parse clipboard data.'); return; }
      setPasteDay(day);
      setPasteRows(rows);
    } catch {
      setPasteError('Clipboard access denied. Please paste manually using Ctrl+V in a cell.');
    }
  };

  const handleCellPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, itemId: string, fieldKey: HeaderKey) => {
    const text = e.clipboardData.getData('text');
    // If pasted text contains tabs (multi-column) or newlines (multi-row) treat as table paste
    if (!text.includes('\t') && !text.includes('\n')) return; // normal single-value paste, let browser handle
    e.preventDefault();

    const rows = parseClipboardToRows(text);
    if (rows.length === 0) return;

    // Single row, single cell paste — fill just this field
    if (rows.length === 1) {
      const keys = HEADERS.map((h) => h.key);
      const startIdx = keys.indexOf(fieldKey);
      Object.entries(rows[0]).forEach(([k, v]) => {
        const idx = keys.indexOf(k as HeaderKey);
        if (idx >= startIdx) {
          onItemChange?.(itemId, k as keyof PlanItem, v ?? '');
        }
      });
      return;
    }

    // Multi-row — find which day this item belongs to and trigger paste preview
    const item = items.find((i) => i.id === itemId);
    if (item) {
      setPasteDay(item.day_of_week);
      setPasteRows(rows);
    }
  };

  const confirmPaste = () => {
    if (!pasteDay || pasteRows.length === 0) return;
    onPasteRows?.(pasteDay, pasteRows);
    setPasteDay(null);
    setPasteRows([]);
  };

  return (
    <>
      {pasteDay && (
        <PastePreview
          day={pasteDay}
          rows={pasteRows}
          onConfirm={confirmPaste}
          onCancel={() => { setPasteDay(null); setPasteRows([]); }}
        />
      )}

      <div className="overflow-x-auto">
        {pasteError && (
          <div className="mx-4 mt-3 mb-1 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> {pasteError}
          </div>
        )}

        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-green-800 text-white">
              <th className="px-3 py-2 text-left font-semibold border border-green-700 w-8 whitespace-nowrap">S/N</th>
              <th className="px-3 py-2 text-left font-semibold border border-green-700 w-28 whitespace-nowrap">Day</th>
              {HEADERS.map((h) => (
                <th key={h.key} className="px-3 py-2 text-left font-semibold border border-green-700 min-w-[6rem] whitespace-nowrap">
                  {h.label}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold border border-green-700 w-16 whitespace-nowrap">Done</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => {
              const dayItems = pageItems.filter((i) => i.day_of_week === day);
              if (dayItems.length === 0) return null;

              return dayItems.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`${
                    item.is_completed ? 'bg-green-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-green-50/60 transition-colors`}
                >
                  <td className="px-3 py-1.5 border border-gray-200 text-gray-500 align-top whitespace-nowrap">{item.s_no}</td>

                  {idx === 0 ? (
                    <td
                      className="px-3 py-2 border border-gray-200 font-semibold text-green-800 bg-green-50 align-top"
                      rowSpan={dayItems.length}
                    >
                      <div className="whitespace-nowrap">{day}</div>
                      {!readOnly && onPasteRows && (
                        <button
                          onClick={() => handlePasteButton(day)}
                          title={`Paste rows into ${day} from Excel/clipboard`}
                          className="mt-2 flex items-center gap-1 text-[10px] font-medium text-green-700 hover:text-green-900 bg-green-100 hover:bg-green-200 px-1.5 py-0.5 rounded transition-colors whitespace-nowrap"
                        >
                          <ClipboardPaste size={10} /> Paste
                        </button>
                      )}
                    </td>
                  ) : null}

                  {HEADERS.map((h) => (
                    <td key={h.key} className="border border-gray-200 p-0 align-top">
                      {readOnly ? (
                        <div className="px-2 py-1.5 text-gray-700 whitespace-pre-wrap break-words leading-relaxed min-w-[6rem]">
                          {(item as any)[h.key]}
                        </div>
                      ) : (
                        <AutoTextarea
                          value={(item as any)[h.key]}
                          onChange={(v) => onItemChange?.(item.id, h.key as keyof PlanItem, v)}
                        />
                      )}
                    </td>
                  ))}

                  <td className="border border-gray-200 px-3 py-1.5 text-center align-top">
                    {readOnly ? (
                      item.is_completed ? (
                        <CheckCircle2 size={16} className="text-green-600 mx-auto mt-1" />
                      ) : (
                        <Circle size={16} className="text-gray-300 mx-auto mt-1" />
                      )
                    ) : (
                      <button
                        onClick={() => onToggleComplete?.(item.id, !item.is_completed)}
                        className="mx-auto block mt-1"
                      >
                        {item.is_completed ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <Circle size={16} className="text-gray-400 hover:text-green-500 transition-colors" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
