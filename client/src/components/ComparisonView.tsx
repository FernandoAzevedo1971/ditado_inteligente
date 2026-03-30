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
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-semibold text-slate-800">
              Resultado da Correção
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Original */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Texto Original (Áudio)
                </h3>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                {originalText}
              </p>
            </div>

            {/* Corrected */}
            <div className="p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <h3 className="text-sm font-medium text-blue-700 uppercase tracking-wider">
                  Texto Corrigido (IA)
                </h3>
              </div>
              <p className="text-slate-900 leading-relaxed font-semibold text-lg whitespace-pre-wrap">
                {currentCorrected}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Copiar Texto */}
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar
                  </>
                )}
              </button>

              {/* Editar por Voz */}
              <button
                onClick={() => setShowVoiceEdit(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 bg-purple-50 text-purple-700 hover:bg-purple-100 active:scale-95"
              >
                <Mic className="w-4 h-4" /> Editar por Voz
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 bg-green-50 text-green-700 hover:bg-green-100 active:scale-95"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>

              {/* Nova Gravação */}
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" /> Nova Gravação
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
