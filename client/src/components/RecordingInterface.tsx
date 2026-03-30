import { useState, useEffect } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { AudioWaveform } from "@/components/AudioWaveform";
import { Loader2, Mic, Square, AlertCircle } from "lucide-react";

interface RecordingInterfaceProps {
  onTranscriptionStart: (audioBlob: Blob) => Promise<void>;
  isProcessing?: boolean;
}

export function RecordingInterface({
  onTranscriptionStart,
  isProcessing = false,
}: RecordingInterfaceProps) {
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording, recordingTime, amplitude, error, mediaStream } =
    useAudioRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-submit when audio blob is ready
  useEffect(() => {
    if (audioBlob && !isRecording && !isSubmitting && !isProcessing) {
      handleAutoSubmit();
    }
  }, [audioBlob, isRecording, isSubmitting, isProcessing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Determinar cor do indicador de volume
  const getVolumeColor = () => {
    if (amplitude < 0.3) return "border-green-500 text-green-500";
    if (amplitude < 0.6) return "border-yellow-500 text-yellow-500";
    return "border-red-500 text-red-500";
  };

  // Determinar tamanho do indicador de volume
  const getVolumeSize = () => {
    return Math.min(amplitude * 200 + 40, 120);
  };

  const handleAutoSubmit = async () => {
    if (!audioBlob) return;

    setIsSubmitting(true);
    try {
      await onTranscriptionStart(audioBlob);
      resetRecording();
    } catch (error) {
      console.error("Error processing audio:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    await handleAutoSubmit();
  };

  return (
    <div className="w-full flex flex-col items-center justify-center px-3 py-4">
      <div className="w-full max-w-md">
        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Main Card */}
        <Card className="p-5 shadow-lg border-0 rounded-xl bg-white">
          {/* Recording Status */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold mb-1 text-slate-900">
              {isRecording ? "Gravando..." : audioBlob ? "Processando..." : "Ditado Inteligente"}
            </h1>
            <p className="text-base text-slate-600">
              {isRecording ? "Fale claramente" : isProcessing ? "Aguarde..." : "Toque para começar"}
            </p>
          </div>

          {/* Recording Time */}
          {isRecording && (
            <div className="text-center mb-4">
              <div className="text-5xl font-mono font-bold text-blue-600">
                {formatTime(recordingTime)}
              </div>
            </div>
          )}

          {/* Audio Waveform Visualization */}
          {isRecording && mediaStream && (
            <AudioWaveform isRecording={isRecording} audioStream={mediaStream} />
          )}

          {/* Main Recording Button - Larger with Volume Indicator */}
          <div className="flex justify-center mb-6 relative h-40 flex items-center">
            {/* Volume Indicator Rings */}
            {isRecording && (
              <>
                {/* Outer ring */}
                <div
                  className={`absolute rounded-full border-4 ${getVolumeColor()} transition-all duration-100`}
                  style={{
                    width: `${getVolumeSize() + 40}px`,
                    height: `${getVolumeSize() + 40}px`,
                    opacity: 0.3,
                  }}
                />
                {/* Middle ring */}
                <div
                  className={`absolute rounded-full border-2 ${getVolumeColor()} transition-all duration-100`}
                  style={{
                    width: `${getVolumeSize() + 20}px`,
                    height: `${getVolumeSize() + 20}px`,
                    opacity: 0.5,
                  }}
                />
              </>
            )}

            {!isRecording && !audioBlob ? (
              <button
                onClick={startRecording}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-2xl hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center relative z-10 active:scale-95"
              >
                <Mic className="w-16 h-16" />
              </button>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-2xl hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center relative z-10 active:scale-95 animate-pulse"
              >
                <Square className="w-16 h-16 fill-current" />
              </button>
            ) : audioBlob && !isSubmitting ? (
              <button
                onClick={handleManualSubmit}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-2xl hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center relative z-10 active:scale-95"
              >
                <Mic className="w-16 h-16" />
              </button>
            ) : (
              <button
                disabled
                className="w-32 h-32 rounded-full bg-gray-400 text-white shadow-2xl flex items-center justify-center cursor-not-allowed relative z-10"
              >
                <Loader2 className="w-16 h-16 animate-spin" />
              </button>
            )}
          </div>

          {/* Instructions and Status Text */}
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              {isRecording
                ? "🎤 Solte para enviar"
                : audioBlob && !isRecording && !isSubmitting
                  ? "✓ Pronto para transcrever"
                  : isSubmitting
                    ? "⏳ Processando..."
                    : "Pressione e fale"}
            </p>
            <p className="text-xs text-slate-500">
              {isRecording &&
                `Volume: ${amplitude < 0.3 ? "Baixo" : amplitude < 0.6 ? "Médio" : "Alto"}`}
              {!isRecording && audioBlob && !isSubmitting &&
                "Clique para enviar ou grave novamente"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
