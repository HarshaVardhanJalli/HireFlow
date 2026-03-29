import React from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const iconMap = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
};

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type}`}
          onClick={() => removeToast(t.id)}
        >
          {iconMap[t.type] || iconMap.info}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
