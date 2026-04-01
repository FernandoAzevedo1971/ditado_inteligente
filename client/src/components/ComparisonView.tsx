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

  return (
    <>
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-8">
          {/* Header - Transparent and minimal */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Análise do Ditado
              </h2>
              <p className="text-muted-foreground font-medium mt-1">Veja como a IA aprimorou seu texto</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-all hover:rotate-90 duration-300"
            >
              <X className="w-8 h-8" />
            </button>
          </div>

          {/* Content - Wide open layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Original */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-zinc-800/50 text-zinc-400 text-xs font-bold uppercase tracking-widest border border-white/5">
                  Original
                </div>
              </div>
              <div className="p-2 border-l-2 border-zinc-800">
                <p className="text-muted-foreground text-lg leading-relaxed font-medium whitespace-pre-wrap italic">
                  "{originalText}"
                </p>
              </div>
            </div>

            {/* Corrected */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-500/20">
                  Corrigido
                </div>
              </div>
              <div className="p-2 border-l-2 border-blue-500/50">
                <p className="text-foreground text-2xl leading-snug font-bold whitespace-pre-wrap">
                  {currentCorrected}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons - Horizontal list of pill buttons */}
          <div className="pt-10 border-t border-white/5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {/* Copiar Texto */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-3 px-6 py-4 text-base font-bold rounded-2xl transition-all duration-300 bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-lg shadow-white/5"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" /> Copiar Texto
                  </>
                )}
              </button>

              {/* Editar por Voz */}
              <button
                onClick={() => setShowVoiceEdit(true)}
                className="flex items-center gap-3 px-6 py-4 text-base font-bold rounded-2xl transition-all duration-300 bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95 border border-white/5"
              >
                <Mic className="w-5 h-5 text-purple-400" /> Editar com IA
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-3 px-6 py-4 text-base font-bold rounded-2xl transition-all duration-300 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600/20 active:scale-95"
              >
                <MessageCircle className="w-5 h-5" /> Compartilhar
              </button>

              {/* Nova Gravação */}
              <button
                onClick={onClose}
                className="flex items-center gap-3 px-6 py-4 text-base font-bold rounded-2xl transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-white/5 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" /> Novo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Edit Modal */}
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
