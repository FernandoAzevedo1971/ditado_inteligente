import { useState, useEffect, useCallback } from "react";
import { Square, Loader2, AlertCircle, Check } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { AudioWaveform } from "@/components/AudioWaveform";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface VoiceEditPanelProps {
  correctedText: string;
  language: string;
  onTextUpdated: (finalText: string) => void;
  onClose: () => void;
}

export default function VoiceEditPanel({
  correctedText,
  language,
  onTextUpdated,
  onClose,
}: VoiceEditPanelProps) {
  const { isRecording, startRecording, stopRecording, audioBlob, error: recordingError, mediaStream } =
    useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [wasRecording, setWasRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const applyCorrectionsM = trpc.text.applyVoiceCorrections.useMutation();

  // useCallback garante que o effect sempre use a versão mais recente de correctedText
  // (evita stale closure ao capturar correctedText dentro do useEffect)
  const handleTranscribeAndApply = useCallback(async (audio: Blob) => {
    if (!audio) return;

    setIsProcessing(true);
    try {
      // Usando o endpoint REST com FormData em vez do TRPC para evitar limite de payload
      const formData = new FormData();
      formData.append("file", audio, "audio.webm");
      formData.append("provider", "groq");
      formData.append("language", language);

      const response = await fetch("/api/audio/transcribe", {
        method: "POST",
        body: formData,
      });

      let responseData;
      let errorText = "";
      try {
        errorText = await response.text();
        responseData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`Erro no servidor: ${errorText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(responseData?.error || "Falha na transcrição");
      }

      const voiceCorrections = responseData.text;

      if (!voiceCorrections.trim()) {
        toast.error("Nenhuma correção foi detectada. Tente novamente.");
        setIsProcessing(false);
        return;
      }

      // Aplicar as correções ao texto corrigido
      const result = await applyCorrectionsM.mutateAsync({
        correctedText,
        voiceCorrections,
        language: (language as "pt" | "en" | "es") || "pt",
      });

      onTextUpdated(result.finalText);
      toast.success("Correções aplicadas com sucesso!");
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      console.error("Erro ao processar correções:", err);
      toast.error(err?.message || "Erro ao aplicar correções. Tente novamente.");
      setIsProcessing(false);
    }
  }, [correctedText, language, applyCorrectionsM, onTextUpdated, onClose]);

  // Iniciar gravação automaticamente quando o painel abre
  useEffect(() => {
    if (!hasStarted) {
      startRecording();
      setHasStarted(true);
      setWasRecording(true);
    }
  }, [hasStarted, startRecording]);

  // Monitorar quando a gravação para e o audioBlob está disponível
  useEffect(() => {
    if (!isRecording && wasRecording && audioBlob) {
      // Gravação parou e temos um audioBlob — marca como não-gravando antes de processar
      setWasRecording(false);
      handleTranscribeAndApply(audioBlob);
    }
  }, [isRecording, audioBlob, wasRecording, handleTranscribeAndApply]);

  const handleStopRecording = async () => {
    stopRecording();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-500">
      <div className="glass-card max-w-md w-full p-8 sm:p-12 border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full" />
        
        <div className="relative z-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-foreground tracking-tighter text-glow-primary">
            Refine por Voz
          </h2>
          <p className="text-sm sm:text-base text-indigo-200/40 font-medium tracking-wide mb-8">
            {isRecording
              ? "Diga o que você deseja alterar..."
              : "Sintonizando correções..."}
          </p>

          {/* Audio Waveform Visualization */}
          <div className="w-full mb-10 h-24 flex items-center justify-center">
            {isRecording && mediaStream ? (
              <AudioWaveform isRecording={isRecording} audioStream={mediaStream} />
            ) : (
                <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    <span className="text-indigo-200/40 font-medium uppercase tracking-[0.3em] text-[10px]">Analisando</span>
                </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center mb-10">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-xl shadow-rose-500/20 flex items-center justify-center animate-pulse-glow border-4 border-white/10 active:scale-95 transition-all"
                title="Parar Gravação"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <div className="w-24 h-24 rounded-full glass-dark flex items-center justify-center border-2 border-indigo-500/30">
                <Check className="w-12 h-12 text-indigo-400" />
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {recordingError && (
            <div className="glass-dark border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200/80">{recordingError}</p>
            </div>
          )}

          {isProcessing && !isRecording && (
            <div className="space-y-4">
               <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-progress-loading" />
               </div>
               <p className="text-xs font-semibold text-indigo-400 uppercase tracking-[0.2em] animate-pulse">
                Sincronizando com a IA...
               </p>
            </div>
          )}

          {/* Close Button */}
          {!isProcessing && (
            <button
              onClick={onClose}
              className="mt-4 px-6 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
