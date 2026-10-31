'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast-context';
import { useLanguage } from '@/context/language-context';

interface EmergencyStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStopped?: () => void;
}

export function EmergencyStopModal({ isOpen, onClose, onStopped }: EmergencyStopModalProps) {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirmStop = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/compliance/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: true, reason: 'Operator Emergency Stop via laptop/mobile top-bar' }),
      });
      if (!res.ok) throw new Error('Failed to pause system');
      success(t('safety.paused_toast', 'Emergency Stop Activated: All sending and background crawls halted.'));
      onStopped?.();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to activate emergency stop');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-surface-container-high border-2 border-error p-6 shadow-2xl flex flex-col gap-4 text-on-surface animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-error/20 text-error flex items-center justify-center shrink-0 border border-error/40">
            <span className="material-symbols-outlined text-[28px]">emergency_home</span>
          </div>
          <div>
            <h2 id="emergency-dialog-title" className="text-lg font-bold text-on-surface">
              {t('safety.emergency_stop_title', 'Emergency Stop Everything?')}
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              {t(
                'safety.emergency_stop_desc',
                'This immediately freezes the entire system: pauses all background email dispatches, cancels queued tasks, and halts scrapers. No emails will leave until you manually resume.'
              )}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-xs text-error font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] shrink-0">shield</span>
          <span>Zero risk. Your verified data and saved leads remain completely safe.</span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:text-on-surface font-semibold text-sm transition-colors min-h-[44px]"
          >
            {t('action.cancel', 'Cancel, Keep Running')}
          </button>
          <button
            type="button"
            onClick={handleConfirmStop}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-error text-white font-bold text-sm shadow-lg shadow-error/30 hover:bg-error/90 active:scale-95 transition-all flex items-center gap-2 min-h-[44px]"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                <span>{t('action.stop_now', 'Yes, Stop Everything')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

