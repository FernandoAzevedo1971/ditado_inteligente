import { useState, useEffect } from "react";
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

  const transcribeMutation = trpc.audio.transcribe.useMutation();
  const applyCorrectionsM = trpc.text.applyVoiceCorrections.useMutation();

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
      // Gravação parou e temos um audioBlob
      handleTranscribeAndApply(audioBlob);
      setWasRecording(false);
    }
  }, [isRecording, audioBlob, wasRecording]);

  const handleStopRecording = async () => {
    stopRecording();
  };

  const handleTranscribeAndApply = async (audio: Blob) => {
    if (!audio) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const audioData = e.target?.result as string;
        const base64Audio = audioData.split(",")[1];

        // Transcrever as correções
        const transcriptionResult = await transcribeMutation.mutateAsync({
          audioData: base64Audio,
          language: (language as "pt" | "en" | "es") || "pt",
        });

        const voiceCorrections = transcriptionResult.text;

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
      };
      reader.readAsDataURL(audio);
    } catch (err) {
      console.error("Erro ao processar correções:", err);
      toast.error("Erro ao aplicar correções. Tente novamente.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Editar com Voz
        </h2>

        <p className="text-sm text-slate-600 mb-6">
          {isRecording
            ? "Gravando... Dite as correções necessárias"
            : "Processando suas correções..."}
        </p>

        {/* Audio Waveform Visualization */}
        {isRecording && mediaStream && (
          <AudioWaveform isRecording={isRecording} audioStream={mediaStream} />
        )}

        {/* Recording Status */}
        <div className="flex justify-center mb-6">
          {isRecording ? (
            <button
              onClick={handleStopRecording}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg animate-pulse transition-colors cursor-pointer"
              title="Clique para parar a gravação"
            >
              <Square className="w-8 h-8 text-white" />
            </button>
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Status Messages */}
        {recordingError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{recordingError}</p>
          </div>
        )}

        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-700">Processando correções...</p>
          </div>
        )}

        {/* Stop Recording Button */}
        {isRecording && (
          <button
            onClick={handleStopRecording}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-4"
          >
            Parar Gravação
          </button>
        )}

        {/* Close Button */}
        {!isRecording && !isProcessing && (
          <button
            onClick={onClose}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}
