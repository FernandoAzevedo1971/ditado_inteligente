import { useState } from "react";
import { Check, Copy, X, Mic, MessageCircle, RotateCcw } from "lucide-react";
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
      // Abre o WhatsApp com o texto pré-preenchido
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    } catch (err) {
      console.error("Failed to share via WhatsApp", err);
    }
  };
  const handleVoiceTextUpdated = (finalText: string) => {
    setCurrentCorrected(finalText);
  };

  const getDiff = (original: string, corrected: string) => {
    const originalWords = original.split(/\s+/);
    const correctedWords = corrected.split(/\s+/);
    
    return correctedWords.map((word, i) => {
      const isNew = !originalWords.includes(word);
      if (isNew) {
        return (
          <span key={i} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block font-bold">
            {word}
          </span>
        );
      }
      return <span key={i}>{word} </span>;
    });
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="space-y-10">
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tighter text-glow-primary">
                REFINAMENTO IA
              </h2>
              <p className="text-sm sm:text-lg text-indigo-200/50 font-medium mt-1 uppercase tracking-widest">
                Sua voz, cristalizada com perfeição
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-muted-foreground hover:text-foreground glass-dark rounded-full transition-all hover:rotate-90 duration-500 border border-white/10"
            >
              <X className="w-6 h-6 sm:w-10 sm:h-10" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-dark p-6 sm:p-8 rounded-2xl border-l-4 border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Mic className="w-12 h-12" />
              </div>
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border border-white/5">
                  Original
                </span>
              </div>
              <p className="text-slate-400 text-lg sm:text-xl leading-relaxed font-medium italic select-none">
                "{originalText}"
              </p>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-2xl border-l-4 border-indigo-500 relative shadow-[0_0_50px_rgba(79,70,229,0.1)]">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Check className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/30">
                  Transcrição Corrigida
                </span>
              </div>
              <div className="text-xl sm:text-3xl text-foreground leading-[1.3] font-bold tracking-tight">
                {getDiff(originalText, currentCorrected)}
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <button
                onClick={handleCopy}
                className="flex items-center gap-3 px-8 py-4 text-base font-black rounded-2xl transition-all duration-300 bg-white text-black hover:bg-indigo-50 hover:scale-105 active:scale-95 shadow-xl"
              >
                {copied ? <><Check className="w-5 h-5" /> COPIADO</> : <><Copy className="w-5 h-5" /> COPIAR TEXTO</>}
              </button>

              <button
                onClick={() => setShowVoiceEdit(true)}
                className="flex items-center gap-3 px-8 py-4 text-base font-black rounded-2xl transition-all duration-300 glass-card text-white hover:bg-white/10 hover:scale-105 active:scale-95 border border-white/20"
              >
                <RotateCcw className="w-5 h-5 text-indigo-400" /> REFINAR POR VOZ
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-3 px-8 py-4 text-base font-black rounded-2xl transition-all duration-300 bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <MessageCircle className="w-5 h-5" /> ENVIAR WHATSAPP
              </button>

              <button
                onClick={onClose}
                className="px-6 py-4 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
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
