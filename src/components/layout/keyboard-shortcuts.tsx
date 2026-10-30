'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface KeyboardShortcutsProps {
  onOpenCommandPalette: () => void;
  onOpenShortcuts: () => void;
  onCloseAll: () => void;
}

export function KeyboardShortcuts({
  onOpenCommandPalette,
  onOpenShortcuts,
  onCloseAll,
}: KeyboardShortcutsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing inside form fields, unless it's Escape or Ctrl+K
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Escape always closes open overlays
      if (e.key === 'Escape') {
        onCloseAll();
        return;
      }

      // Ctrl+K / Cmd+K opens Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }

      if (isInput) return;

      // '/' focuses search bar
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('header input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // '?' opens shortcuts help
      if (e.key === '?') {
        e.preventDefault();
        onOpenShortcuts();
        return;
      }

      // 2-key sequences: 'g' followed by another key within 800ms
      const now = Date.now();
      if (e.key === 'g' || e.key === 'G') {
        lastKeyRef.current = { key: 'g', time: now };
        return;
      }

      if (lastKeyRef.current.key === 'g' && now - lastKeyRef.current.time < 800) {
        lastKeyRef.current = { key: '', time: 0 };
        const lower = e.key.toLowerCase();
        if (lower === 'h') {
          e.preventDefault();
          router.push('/');
        } else if (lower === 'b') {
          e.preventDefault();
          router.push('/businesses');
        } else if (lower === 'e') {
          e.preventDefault();
          router.push('/emails');
        } else if (lower === 'm') {
          e.preventDefault();
          router.push('/contact-manually');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname, onOpenCommandPalette, onOpenShortcuts, onCloseAll]);

  return null;
}

