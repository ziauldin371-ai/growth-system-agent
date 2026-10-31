'use client';

import React from 'react';
import { useLanguage } from '@/context/language-context';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const SHORTCUTS = [
    { keys: ['g', 'h'], label: 'Go to Home (Today at a glance)' },
    { keys: ['g', 'b'], label: 'Go to Businesses Found' },
    { keys: ['g', 'e'], label: 'Go to Emails Sent & Queue' },
    { keys: ['g', 'm'], label: 'Go to Contact Manually' },
    { keys: ['Ctrl / ⌘', 'K'], label: 'Open Command Palette (Quick search & actions)' },
    { keys: ['/'], label: 'Focus global search input' },
    { keys: ['↑', '↓'], label: 'Navigate leads list & tables' },
    { keys: ['Enter'], label: 'Open details drawer for highlighted lead' },
    { keys: ['Esc'], label: 'Close open drawer, modal, or search palette' },
    { keys: ['?'], label: 'Open this shortcuts help sheet' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface-container-high border border-outline-variant/40 p-6 shadow-2xl flex flex-col gap-5 text-on-surface animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-container/20 text-primary border border-primary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">keyboard</span>
            </div>
            <div>
              <h2 id="shortcuts-dialog-title" className="text-base font-bold text-on-surface">
                {t('shortcuts.title', 'Keyboard Shortcuts')}
              </h2>
              <p className="text-xs text-on-surface-variant">Power control center navigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts help"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest/60 transition-colors border border-outline-variant/20"
            >
              <span className="text-xs font-medium text-on-surface-variant">{sc.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {sc.keys.map((k, ki) => (
                  <kbd
                    key={ki}
                    className="px-2 py-1 rounded-md bg-surface-container-lowest text-on-surface border border-outline-variant/40 font-mono text-[11px] font-bold shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-semibold text-xs shadow-md shadow-primary-container/20 hover:opacity-95 transition-opacity min-h-[44px]"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

