import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: string; message: string; type?: 'info' | 'success' | 'error' };

type ToastContextValue = {
  show: (message: string, type?: Toast['type']) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((t) => [{ id, message, type }, ...t]);
    // auto dismiss
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const success = useCallback((m: string) => show(m, 'success'), [show]);
  const error = useCallback((m: string) => show(m, 'error'), [show]);

  const value = useMemo(() => ({ show, success, error }), [show, success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-6 z-50 flex flex-col items-end gap-3">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-xs w-full px-4 py-2 rounded-lg shadow-lg text-sm text-white flex items-center gap-3 ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>
            <div className="flex-1">{t.message}</div>
            <button onClick={() => remove(t.id)} className="opacity-80 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
