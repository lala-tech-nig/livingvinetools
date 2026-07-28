'use client';
import { useEffect, useState } from 'react';

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 220);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return (
    <div className={`toast toast-${toast.type} ${exiting ? 'exiting' : ''}`}>
      <span className="toast-icon">{icons[toast.type] || 'ℹ️'}</span>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 220); }}
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'16px', padding:'0 0 0 8px' }}
      >×</button>
    </div>
  );
}
