import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Undo2, X } from 'lucide-react';

interface PendingDelete {
  id: string;
  collection: string;
  timeoutId: NodeJS.Timeout;
  onConfirm: () => void;
  title: string;
}

interface UndoContextType {
  requestDelete: (id: string, collection: string, title: string, onConfirm: () => void) => void;
  isPending: (id: string) => boolean;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);

  const requestDelete = (id: string, collection: string, title: string, onConfirm: () => void) => {
    const timeoutId = setTimeout(() => {
      onConfirm();
      setPendingDeletes(prev => prev.filter(p => p.id !== id));
    }, 5000);

    setPendingDeletes(prev => [...prev, { id, collection, timeoutId, onConfirm, title }]);
  };

  const undoDelete = (id: string) => {
    const pending = pendingDeletes.find(p => p.id === id);
    if (pending) {
      clearTimeout(pending.timeoutId);
      setPendingDeletes(prev => prev.filter(p => p.id !== id));
    }
  };

  const isPending = (id: string) => pendingDeletes.some(p => p.id === id);

  return (
    <UndoContext.Provider value={{ requestDelete, isPending }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {pendingDeletes.map((pending) => (
            <UndoToast 
              key={pending.id} 
              pending={pending} 
              onUndo={() => undoDelete(pending.id)} 
            />
          ))}
        </AnimatePresence>
      </div>
    </UndoContext.Provider>
  );
}

function UndoToast({ pending, onUndo }: { pending: PendingDelete; onUndo: () => void; key?: string }) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-4 min-w-[300px]"
    >
      <div className="flex-1">
        <p className="text-sm font-medium">Excluindo "{pending.title}"</p>
        <p className="text-[10px] text-zinc-400">Será removido em {timeLeft}s</p>
      </div>
      
      <button 
        onClick={onUndo}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors text-emerald-400"
      >
        <Undo2 size={14} />
        Desfazer
      </button>
    </motion.div>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) throw new Error('useUndo must be used within UndoProvider');
  return context;
}
