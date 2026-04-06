import { useState } from "react";
import {
  Check,
  Copy,
  X,
  Mic,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import VoiceEditPanel from "./VoiceEditPanel";

interface ComparisonViewProps {
  originalText: string;
  correctedText: string;
  language?: string;
  onClose: () => void;
}

export function ComparisonView({
  originalText,
  correctedText,
  language = "auto",
  onClose,
}: ComparisonViewProps) {
  const [copied, setCopied] = useState(false);
  const [currentCorrected, setCurrentCorrected] = useState(correctedText);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [showVoiceEdit, setShowVoiceEdit] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCorrected);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(currentCorrected);
      const encoded = encodeURIComponent(currentCorrected);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    } catch (err) {
      console.error("Failed to share via WhatsApp", err);
    }
  };

  const handleVoiceTextUpdated = (finalText: string) => {
    setCurrentCorrected(finalText);
  };

  const getDiff = (original: string, corrected: string) => {
    return <span className="whitespace-pre-wrap font-normal">{corrected}</span>;
  };

  return (
    <>
      <div className="w-full h-full max-w-4xl mx-auto px-2 pt-4 sm:pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col">
        <div className="space-y-1.5 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between pb-0 shrink-0">
            <h2 className="text-base sm:text-lg font-black text-foreground tracking-tighter text-glow-primary">
              Texto corrigido
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground glass-dark rounded-full transition-all hover:rotate-90 duration-500 border border-white/10"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="glass-dark p-1 sm:p-1.5 rounded-lg border border-white/10 relative overflow-hidden shrink-0">
            <div
              onClick={() => setShowOriginalText(!showOriginalText)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-black tracking-[0.2em] border border-white/5">
                  Texto original
                </span>
              </div>
              <button className="p-0.5 hover:bg-white/10 rounded transition-colors flex-shrink-0">
                {showOriginalText ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            </div>
            {showOriginalText && (
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium italic select-none mt-2 max-h-20 overflow-y-auto">
                "{originalText}"
              </p>
            )}
          </div>

          <div className="glass-card justify-start p-2 sm:p-3 rounded-lg border-l-4 border-indigo-500 relative shadow-[0_0_50px_rgba(79,70,229,0.1)] flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="absolute top-0 right-0 p-2 opacity-10 shrink-0">
              <Check className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2 mb-1.5 shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black tracking-[0.2em] border border-indigo-500/30">
                Transcrição corrigida
              </span>
            </div>
            <div className="text-lg sm:text-xl text-foreground leading-relaxed font-normal tracking-tight overflow-y-auto flex-1 pb-1">
              {getDiff(originalText, currentCorrected)}
            </div>
          </div>

          <div className="pt-2 pb-1 grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
            <button
              onClick={handleWhatsApp}
              className="col-span-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-black rounded-xl transition-all duration-300 bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.35)] border border-emerald-300/30"
            >
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </button>

            <button
              onClick={handleCopy}
              className="col-span-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-black rounded-xl transition-all duration-300 bg-white text-black hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-emerald-600" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" /> Copiar Texto
                </>
              )}
            </button>

            <button
              onClick={() => setShowVoiceEdit(true)}
              className="col-span-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 glass-card text-white hover:bg-white/10 hover:scale-[1.02] active:scale-95 border border-white/20"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-400" /> Editar com Voz
            </button>

            <button
              onClick={onClose}
              className="col-span-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 glass-dark text-muted-foreground hover:text-foreground hover:bg-white/10 hover:scale-[1.02] active:scale-95 border border-white/10"
            >
              Nova Gravação
            </button>
          </div>
        </div>
      </div>

      {showVoiceEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
            <VoiceEditPanel
              correctedText={currentCorrected}
              language={language}
              onTextUpdated={handleVoiceTextUpdated}
              onClose={() => setShowVoiceEdit(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
