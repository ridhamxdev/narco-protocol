"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { MotionConfig, AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export default function Providers({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((text, kind = "ok") => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ToastCtx.Provider value={push}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-line bg-panel px-4 py-2.5 shadow-[0_8px_24px_rgb(28_25_18/0.14)]"
                role={t.kind === "err" ? "alert" : "status"}
              >
                {t.kind === "err" ? (
                  <AlertTriangle className="size-4 shrink-0 text-blood" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0 text-goldhi" aria-hidden />
                )}
                <span className="mono-data text-[12.5px] text-cream">{t.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ToastCtx.Provider>
    </MotionConfig>
  );
}
