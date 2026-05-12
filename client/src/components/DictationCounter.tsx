import { Crown } from "lucide-react";
import { FREE_DICTATION_LIMIT } from "@shared/const";

interface DictationCounterProps {
  dictationCount: number;
  isPremium: boolean;
  onClick?: () => void;
}

export function DictationCounter({ dictationCount, isPremium, onClick }: DictationCounterProps) {
  if (isPremium) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-dark border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide"
        title="Assinatura Premium ativa"
      >
        <Crown className="w-3.5 h-3.5" />
        <span>Premium</span>
      </button>
    );
  }

  const remaining = Math.max(0, FREE_DICTATION_LIMIT - dictationCount);
  const percentage = (dictationCount / FREE_DICTATION_LIMIT) * 100;

  const getColor = () => {
    if (percentage >= 90) return "text-red-400 border-red-500/20";
    if (percentage >= 70) return "text-amber-400 border-amber-500/20";
    return "text-indigo-300/60 border-white/5";
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-dark border text-xs font-semibold tracking-wide transition-all hover:scale-105 ${getColor()}`}
      title={`${remaining} ditados restantes`}
    >
      <div className="relative w-3.5 h-3.5">
        <svg viewBox="0 0 20 20" className="w-full h-full -rotate-90">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <circle
            cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
            strokeDasharray={`${percentage * 0.5} 50`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span>{remaining}/{FREE_DICTATION_LIMIT}</span>
    </button>
  );
}
