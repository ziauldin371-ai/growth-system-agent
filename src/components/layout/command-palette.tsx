'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEmergencyStop?: () => void;
  onOpenShortcuts?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenEmergencyStop,
  onOpenShortcuts,
}: CommandPaletteProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ACTIONS = [
    {
      id: 'action-find',
      category: 'Actions',
      title: 'Find Businesses Now',
      subtitle: 'Open search launcher to discover new local leads',
      icon: 'bolt',
      action: () => {
        router.push('/run-and-schedule');
        onClose();
      },
    },
    {
      id: 'action-emergency',
      category: 'Actions',
      title: 'Emergency Stop All Outreach',
      subtitle: 'Freeze all sending and scrapers immediately',
      icon: 'emergency_home',
      danger: true,
      action: () => {
        onClose();
        onOpenEmergencyStop?.();
      },
    },
    {
      id: 'action-test-email',
      category: 'Actions',
      title: 'Send Test Email to Myself',
      subtitle: 'Send a verified verification ping to ziauldin371@gmail.com',
      icon: 'send',
      action: () => {
        router.push('/safety');
        onClose();
      },
    },
    {
      id: 'page-home',
      category: 'Pages',
      title: 'Home / Today at a Glance',
      subtitle: 'Overview of verified finds, dispatches & pipeline',
      icon: 'today',
      action: () => {
        router.push('/');
        onClose();
      },
    },
    {
      id: 'page-businesses',
      category: 'Pages',
      title: 'Businesses Found',
      subtitle: 'No website, broken sites & hot leads',
      icon: 'storefront',
      action: () => {
        router.push('/businesses');
        onClose();
      },
    },
    {
      id: 'page-emails',
      category: 'Pages',
      title: 'Emails Sent & Queue',
      subtitle: 'Delivered Gmail dispatches and waiting safe queue',
      icon: 'outgoing_mail',
      action: () => {
        router.push('/emails');
        onClose();
      },
    },
    {
      id: 'page-manual',
      category: 'Pages',
      title: 'Contact Manually (Calls & Social)',
      subtitle: 'Phone scripts and direct channel pitches',
      icon: 'call',
      action: () => {
        router.push('/contact-manually');
        onClose();
      },
    },
    {
      id: 'page-safety',
      category: 'Pages',
      title: 'Safety & Deliverability Rules',
      subtitle: 'Speed limits, random spacing & suppression lists',
      icon: 'shield',
      action: () => {
        router.push('/safety');
        onClose();
      },
    },
    {
      id: 'page-setup',
      category: 'Pages',
      title: 'Setup & Integrations',
      subtitle: 'Gmail, Google Places & Supabase connection test',
      icon: 'tune',
      action: () => {
        router.push('/setup');
        onClose();
      },
    },
    {
      id: 'action-shortcuts',
      category: 'Help',
      title: 'Keyboard Shortcuts Cheat Sheet',
      subtitle: 'View all fast navigation keys',
      icon: 'keyboard',
      action: () => {
        onClose();
        onOpenShortcuts?.();
      },
    },
  ];

  const filtered = ACTIONS.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-surface-container-high border border-outline-variant/40 shadow-2xl overflow-hidden flex flex-col text-on-surface animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-outline-variant/30 gap-3">
          <span className="material-symbols-outlined text-[20px] text-primary">terminal</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, page name, or action (e.g. 'find', 'safety')..."
            className="flex-1 bg-transparent border-none text-on-surface placeholder:text-outline text-sm sm:text-base focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-surface-container-lowest text-[11px] font-mono text-on-surface-variant border border-outline-variant/30">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              No matching pages or actions found. Try searching for &ldquo;find&rdquo;, &ldquo;leads&rdquo;, or &ldquo;safety&rdquo;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors min-h-[44px] ${
                    isSelected
                      ? item.danger
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isSelected
                          ? item.danger
                            ? 'text-error'
                            : 'text-on-primary-container'
                          : item.danger
                          ? 'text-error'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-semibold truncate leading-tight">
                        {item.title}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isSelected ? 'opacity-85' : 'text-on-surface-variant'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0 ${
                      isSelected
                        ? 'bg-black/15'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 border-t border-outline-variant/30 bg-surface-container-lowest/50 text-[11px] text-on-surface-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span>•</span>
            <span>
              <kbd className="font-mono">↵</kbd> select
            </span>
          </div>
          <span>Power Search</span>
        </div>
      </div>
    </div>
  );
}
