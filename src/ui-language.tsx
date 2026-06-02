import { ChevronDown, Languages } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Language } from './types';
import { languageFlags, languageNames, tr } from './i18n';

export const languages: Language[] = ['ar', 'fr', 'en'];

export function LanguageMenu({
  language,
  onLanguageChange,
  variant = 'inline'
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  variant?: 'inline' | 'corner';
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeFromOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeFromOutside);
    document.addEventListener('touchstart', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);

    return () => {
      document.removeEventListener('mousedown', closeFromOutside);
      document.removeEventListener('touchstart', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [open]);

  return (
    <div className={`language-menu ${variant}`} ref={menuRef}>
      <button
        className={`language-trigger ${variant}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={tr(language, 'chooseLanguage')}
        onClick={() => setOpen((previous) => !previous)}
      >
        <Languages size={variant === 'corner' ? 18 : 16} aria-hidden="true" />
        {variant === 'inline' && (
          <>
            <span className="language-flag" aria-hidden="true">{languageFlags[language]}</span>
            <span>{languageNames[language]}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </>
        )}
      </button>
      {open && (
        <div className="language-options" role="menu">
          {languages.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={language === option}
              className={language === option ? 'active' : ''}
              onClick={() => {
                onLanguageChange(option);
                setOpen(false);
              }}
            >
              <span className="language-flag" aria-hidden="true">{languageFlags[option]}</span>
              <span>{languageNames[option]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
