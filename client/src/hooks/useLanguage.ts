import { useState, useEffect } from "react";

export type Language = "pt" | "en" | "es";

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
}

const LANGUAGE_STORAGE_KEY = "voice_text_corrector_language";

export const SUPPORTED_LANGUAGES: Record<Language, LanguageConfig> = {
  pt: {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
  },
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
  },
};

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>("pt");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && (stored === "pt" || stored === "en" || stored === "es")) {
        setLanguageState(stored as Language);
      }
    } catch (error) {
      console.error("Error loading language from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save language to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch (error) {
        console.error("Error saving language to localStorage:", error);
      }
    }
  }, [language, isLoaded]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const getLanguageConfig = () => SUPPORTED_LANGUAGES[language];

  return {
    language,
    setLanguage,
    getLanguageConfig,
    isLoaded,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
