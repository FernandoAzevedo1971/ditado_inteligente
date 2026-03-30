import { useState, useEffect } from "react";

export interface TranscriptionRecord {
  id: string;
  originalText: string;
  correctedText: string;
  language: string;
  timestamp: number;
}

const STORAGE_KEY = "voice_text_corrector_history";
const MAX_HISTORY = 10;

export function useTranscriptionHistory() {
  const [history, setHistory] = useState<TranscriptionRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TranscriptionRecord[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error("Error loading history from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error("Error saving history to localStorage:", error);
      }
    }
  }, [history, isLoaded]);

  const addRecord = (originalText: string, correctedText: string, language: string) => {
    const newRecord: TranscriptionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalText,
      correctedText,
      language,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [newRecord, ...prev];
      // Keep only the last MAX_HISTORY records
      return updated.slice(0, MAX_HISTORY);
    });

    return newRecord;
  };

  const deleteRecord = (id: string) => {
    setHistory((prev) => prev.filter((record) => record.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    isLoaded,
    addRecord,
    deleteRecord,
    clearHistory,
  };
}
