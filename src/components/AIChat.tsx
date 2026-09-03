import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

type Message = { from: 'user' | 'assistant'; text: string };

export default function AIChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const endpoint = import.meta.env.VITE_AI_ENDPOINT || '';

  const send = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages((m) => [...m, { from: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      let assistantText = '';
      if (endpoint) {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userText }) });
        const data = await res.json();
        assistantText = data?.reply ?? 'No reply from AI endpoint.';
      } else {
        // Local fallback: simple echo + suggestion
        assistantText = `Echo: ${userText}\n\nTry: summarize your weekly plan, or ask for suggestions.`;
      }
      setMessages((m) => [...m, { from: 'assistant', text: assistantText }]);
    } catch (e) {
      setMessages((m) => [...m, { from: 'assistant', text: 'AI request failed. Configure `VITE_AI_ENDPOINT` to enable.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 bg-green-800 text-white flex items-center justify-between">
          <div className="font-semibold">AI Assistant</div>
          <button onClick={onClose}><X size={18} className="text-white" /></button>
        </div>
        <div className="p-4 overflow-auto flex-1 space-y-3">
          {messages.length === 0 && <div className="text-xs text-gray-400">Ask the assistant for help: summarise plans, suggest improvements, or generate templates.</div>}
          {messages.map((m, i) => (
            <div key={i} className={`text-sm ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block px-3 py-2 rounded-lg ${m.from === 'user' ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-900'}`}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ask something..." onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
          <button onClick={send} disabled={loading} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg">
            <Send size={14} /> {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
