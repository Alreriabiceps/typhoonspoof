import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = CheckCircle2;
          let iconColor = 'text-emerald-400';

          if (toast.type === 'info') {
            Icon = Info;
            iconColor = 'text-zinc-400';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          } else if (toast.type === 'error') {
            Icon = XCircle;
            iconColor = 'text-red-400';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-auto p-3.5 rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg flex items-start gap-3"
            >
              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-zinc-100">{toast.title}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{toast.message}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
