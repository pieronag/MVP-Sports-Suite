"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type Locale = "es" | "en";

interface Messages {
  [key: string]: string | Messages;
}

const MESSAGES: Record<Locale, Messages> = {
  es: {} as Messages,
  en: {} as Messages,
};

async function loadMessages(locale: Locale): Promise<Messages> {
  if (Object.keys(MESSAGES[locale]).length > 0) return MESSAGES[locale];
  const data = await import(`@/messages/${locale}.json`);
  MESSAGES[locale] = data.default || data;
  return MESSAGES[locale];
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "es",
  setLocale: () => {},
  t: (key: string) => key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");
  const [messages, setMessages] = useState<Messages>({});

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && ["es", "en"].includes(saved)) {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("locale", locale);
    loadMessages(locale).then(setMessages);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: unknown = messages;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === "string" ? value : key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
