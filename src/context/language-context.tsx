'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallbackEn?: string) => string;
}

const DICTIONARY: Record<string, { en: string; ur: string }> = {
  // Navigation
  'nav.home': { en: 'Home', ur: 'Home' },
  'nav.home_sub': { en: 'Today at a glance', ur: 'Aaj ka mukammal jaiza' },
  'nav.businesses': { en: 'Businesses Found', ur: 'Miley Huay Karobaar' },
  'nav.businesses_sub': { en: 'Browse discovered companies', ur: 'Talaash shuda companiyan dekhein' },
  'nav.emails': { en: 'Emails', ur: 'Emails' },
  'nav.emails_sub': { en: 'Sent, waiting & blocked', ur: 'Bheji gayi, tayyar aur ruki hui emails' },
  'nav.manual': { en: 'Direct Leads (Social & Calls)', ur: 'WhatsApp & Social Leads' },
  'nav.manual_sub': { en: 'AI-found: WhatsApp, LinkedIn & Phone', ur: 'AI ke daryaft karda WhatsApp, LinkedIn aur Phone' },
  'nav.schedule': { en: 'Run & Schedule', ur: 'Chalaayein Aur Waqt' },
  'nav.schedule_sub': { en: 'Find leads now & auto runs', ur: 'Abhi talaash karein aur automatic schedule' },
  'nav.safety': { en: 'Safety', ur: 'Hifazat Aur Qawaneen' },
  'nav.safety_sub': { en: 'Limits, stop button & compliance', ur: 'Hudoor, rukaawat aur qanooni hifazat' },
  'nav.setup': { en: 'Setup', ur: 'Tanzim Aur Connection' },
  'nav.setup_sub': { en: 'Connect Gmail, keys & database', ur: 'Gmail, API keys aur database jorein' },

  // Statuses & Banners
  'banner.test_mode': {
    en: 'Test mode: not everything is connected yet. Finish setup to send live emails.',
    ur: 'Test mode: abhi sab kuch jura nahi hai. Asal emails bhejne ke liye setup mukammal karein.'
  },
  'banner.running': {
    en: 'Everything is running smoothly on autonomous schedule.',
    ur: 'Sab kuch behtareen tareeqay se khud-kaar chal raha hai.'
  },
  'banner.paused': {
    en: 'Sending is paused via Emergency Stop.',
    ur: 'Emergency Stop ki wajah se emails rok di gayi hain.'
  },

  // KPI Metrics
  'metric.found': { en: 'Businesses found', ur: 'Miley huay karobaar' },
  'metric.ready': { en: 'Ready to contact', ur: 'Raabtay ke liye tayyar' },
  'metric.sent': { en: 'Emails sent (Gmail)', ur: 'Bheji gayi emails (Gmail)' },
  'metric.replies': { en: 'Replies received', ur: 'Miley huay jawabaat' },
  'metric.manual': { en: 'Contact manually', ur: 'Bina email: khud raabta' },
  'metric.blocked': { en: 'Blocked emails', ur: 'Ruki hui emails' },
  'metric.next_run': { en: 'Next automatic run', ur: 'Agla automatic run' },

  // Actions
  'action.find_now': { en: 'Find Businesses Now', ur: 'Abhi Naye Karobaar Dhoondein' },
  'action.view_details': { en: 'View details', ur: 'Tafseelat Dekhein' },
  'action.connect_gmail': { en: 'Connect Gmail', ur: 'Gmail Connect Karein' },
  'action.add_key': { en: 'Add API Key', ur: 'API Key Darj Karein' },
  'action.test_email': { en: 'Send test email to myself', ur: 'Apne aap ko test email bhejein' },
  'action.sync_gmail': { en: 'Sync with Gmail', ur: 'Gmail ke sath sync karein' },
  'action.copy_pitch': { en: 'Copy Pitch', ur: 'Paigham Copy Karein' },
  'action.open_profile': { en: 'Open Profile', ur: 'Profile Kholein' },
  'action.sign_out': { en: 'Sign Out', ur: 'Sign Out' },

  // Sections
  'section.next_steps': { en: 'What should I do next?', ur: 'Mujhe ab agay kya karna chahiye?' },
  'section.today_timeline': { en: 'What the system did today', ur: 'System ne aaj kya kya kiya' },
  'section.top_opportunities': { en: 'Best opportunities right now', ur: 'Is waqt ke behtareen karobaar' },
  'section.funnel': { en: 'Client Journey', ur: 'Grahak Banane Ka Safar' },

  // Wording replacements
  'word.no_website': { en: 'No website found', ur: 'Website mojood nahi hai' },
  'word.website_problems': { en: 'Website has problems', ur: 'Website kharab ya tooti hui hai' },
  'word.needs_ai': { en: 'Needs AI / software', ur: 'AI ya software ki zaroorat hai' },
  'word.match_excellent': { en: 'Excellent Match', ur: 'Zabardast Mauqa' },
  'word.match_good': { en: 'Good Match', ur: 'Acha Mauqa' },
  'word.match_weak': { en: 'Weak Match', ur: 'Kamzor Mauqa' },
  'word.demo_data': { en: 'DEMO', ur: 'DEMO' },
  'word.sent_confirmed': { en: 'Sent (confirmed)', ur: 'Bheji gayi (Tasdeeq shuda)' },
  'word.blocked': { en: 'Blocked', ur: 'Rok di gayi' },
  'word.waiting': { en: 'Waiting to Send', ur: 'Bhejne ke intezaar mein' },

  // Stitch Friendly Wording
  'stitch.good_morning': { en: 'Good morning, Zia! 👋', ur: 'Subah Bakhair, Zia! 👋' },
  'stitch.all_calm': { en: 'All systems calm', ur: 'Tamam systems pursukoon hain' },
  'stitch.needs_eyes': { en: 'Needs Your Eyes Today', ur: 'Aaj Aap Ki Tawajjah Chahiye' },
  'stitch.todays_pipeline': { en: "Today's Pipeline", ur: 'Aaj Ki Pipeline' },
  'stitch.find_businesses_now': { en: 'Find Businesses Now', ur: 'Abhi Karobaar Dhoondein' },
  'stitch.call_hot_lead': { en: 'Call Hot Lead', ur: 'Aham Grahak Ko Call Karein' },
  'stitch.emergency_stop': { en: 'Emergency Stop Everything', ur: 'Emergency Stop: Sab Rok Dein' },
  'stitch.tap_to_call': { en: 'Tap to Call', ur: 'Call Karne Ke Liye Dabayein' },
  'stitch.sent_and_queue': { en: 'Sent & Queue', ur: 'Bheji Gayi Aur Queue' },
  'stitch.calls_and_social': { en: 'Calls & Social', ur: 'Calls Aur Social Media' },
  'stitch.safety_rules': { en: 'Safety & Rules', ur: 'Hifazat Aur Qawaneen' },
  'stitch.demo_banner': {
    en: 'Demo data is shown; these are not real businesses',
    ur: 'Demo data dikhaya ja raha hai; yeh asal karobaar nahi hain'
  },
  'stitch.queue_safe': { en: 'Queue safe emails for these leads', ur: 'In karobaar ke liye mehfooz emails queue karein' },
  'stitch.copy_script': { en: 'Copy Script to Clipboard', ur: 'Script Clipboard Par Copy Karein' },
  'stitch.pause_now': { en: 'Pause Now', ur: 'Abhi Rokein' },
  'stitch.resume': { en: 'Resume', ur: 'Dobara Shuru Karein' },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallbackEn?: string) => fallbackEn || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('growth_agent_lang') as Language | null;
      if (saved === 'en' || saved === 'ur') {
        setLanguageState(saved);
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('growth_agent_lang', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const next = language === 'en' ? 'ur' : 'en';
    setLanguage(next);
  };

  const t = (key: string, fallbackEn?: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return fallbackEn || key;
    return language === 'ur' ? entry.ur : entry.en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
