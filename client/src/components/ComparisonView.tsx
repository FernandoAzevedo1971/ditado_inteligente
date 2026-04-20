import { useState, useMemo, useEffect, useRef } from "react";
import {
  Check,
  Copy,
  X,
  Mic,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import VoiceEditPanel from "./VoiceEditPanel";

interface ComparisonViewProps {
  originalText: string;
  correctedText: string;
  outOfContextWords?: string[];
  language?: string;
  onClose: () => void;
}

export function ComparisonView({
  originalText,
  correctedText,
  outOfContextWords = [],
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

  const tokens = useMemo(() => {
    // Regex divides by anything that is punctuation or space, keeping the matched split token.
    return currentCorrected.split(/([\s.,:;!?\n]+)/);
  }, [currentCorrected]);

  const isOutOfContext = (word: string) => {
    if (!outOfContextWords || outOfContextWords.length === 0) return false;
    return outOfContextWords.some((w) => w.toLowerCase() === word.toLowerCase());
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [currentCorrected]);

  const getDiff = () => {
    return (
      <div className="relative w-full min-h-full cursor-text">
        {/* Underlay */}
        <div 
          className="absolute top-0 left-0 w-full h-full pointer-events-none whitespace-pre-wrap break-words text-transparent z-0 m-0 p-0"
        >
          {tokens.map((token, index) => {
            const isWord = !/^[\s.,:;!?\n]+$/.test(token) && token.length > 0;
            const isHighlighted = isWord && isOutOfContext(token);
            if (isHighlighted) {
              return (
                <span
                  key={index}
                  className="bg-emerald-500/20 border border-emerald-600/50 rounded-[4px] transition-colors px-0.5"
                >
                  {token}
                </span>
              );
            }
            return <span key={index}>{token}</span>;
          })}
        </div>
        
        {/* Editable textarea on top */}
        <textarea
          ref={textareaRef}
          className="relative block w-full bg-transparent text-foreground outline-none resize-none z-10 whitespace-pre-wrap break-words overflow-hidden m-0 p-0 font-inherit"
          value={currentCorrected}
          onChange={(e) => setCurrentCorrected(e.target.value)}
          spellCheck={false}
          placeholder="Digite ou edite o texto aqui..."
        />
      </div>
    );
  };

  return (
    <>
      <div className="w-full h-full max-w-4xl mx-auto px-2 pt-4 sm:pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col">
        <div className="space-y-1.5 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between pb-0 shrink-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tighter text-glow-primary">
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
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-semibold tracking-[0.2em] border border-white/5">
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
                {originalText}
              </p>
            )}
          </div>

          <div className="glass-card flex-1 p-6 sm:p-8 relative shadow-[0_0_50px_rgba(99,102,241,0.05)] flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-medium tracking-[0.2em] uppercase border border-indigo-500/20">
                Transcrição corrigida
              </span>
            </div>
            <div className="text-xl sm:text-2xl text-foreground leading-relaxed font-medium tracking-tight overflow-y-auto flex-1 pb-2">
              {getDiff()}
            </div>
          </div>

          <div className="pt-4 pb-1 grid grid-cols-2 gap-3 shrink-0">
            {/* Row 1, Col 1: WhatsApp (Green) */}
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium rounded-xl transition-all duration-300 bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <MessageCircle className="w-4 h-4" /> 
              <span>WhatsApp</span>
            </button>

            {/* Row 1, Col 2: Copiar (Light Blue) */}
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium rounded-xl transition-all duration-300 bg-sky-600 text-white hover:bg-sky-500 active:scale-95 shadow-lg shadow-sky-600/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar
                </>
              )}
            </button>

            {/* Row 2, Col 1: Editar por voz (Light Purple/Lilac) */}
            <button
              onClick={() => setShowVoiceEdit(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium rounded-xl transition-all duration-300 bg-violet-400 text-violet-950 hover:bg-violet-300 active:scale-95 shadow-lg shadow-violet-400/20"
            >
              <Mic className="w-4 h-4" /> Editar por voz
            </button>

            {/* Row 2, Col 2: Nova gravação (White) */}
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium rounded-xl transition-all duration-300 bg-white text-slate-900 hover:bg-slate-50 active:scale-95 shadow-lg shadow-white/20"
            >
              <RotateCcw className="w-4 h-4" /> 
              <span>Nova Gravação</span>
            </button>
          </div>
        </div>
      </div>

      {showVoiceEdit && (
        <VoiceEditPanel
          correctedText={currentCorrected}
          language={language}
          onTextUpdated={handleVoiceTextUpdated}
          onClose={() => setShowVoiceEdit(false)}
        />
      )}
    </>
  );
}
