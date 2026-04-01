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
        {/* Main Interface Content (No Card/Frame) */}
        <div className="p-5 flex flex-col items-center">
          {/* Recording Status */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold mb-3 text-foreground tracking-tight">
              {isRecording ? "Gravando..." : audioBlob ? "Processando..." : "Ditado Inteligente"}
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              {isRecording ? "Fale claramente" : isProcessing ? "Aguarde..." : "Toque no ícone para começar"}
            </p>
          </div>

          {/* Recording Time */}
          {isRecording && (
            <div className="text-center mb-8">
              <div className="text-6xl font-mono font-black text-blue-500 animate-pulse">
                {formatTime(recordingTime)}
              </div>
            </div>
          )}

          {/* Audio Waveform Visualization */}
          {isRecording && mediaStream && (
            <div className="w-full max-w-xs mb-8 opacity-80">
              <AudioWaveform isRecording={isRecording} audioStream={mediaStream} />
            </div>
          )}

          {/* Main Recording Button - Larger with Volume Indicator */}
          <div className="flex justify-center mb-10 relative h-48 items-center">
            {/* Volume Indicator Rings */}
            {isRecording && (
              <>
                {/* Outer ring */}
                <div
                  className={`absolute rounded-full border-4 ${getVolumeColor()} transition-all duration-100 animate-ping`}
                  style={{
                    width: `${getVolumeSize() + 60}px`,
                    height: `${getVolumeSize() + 60}px`,
                    opacity: 0.15,
                  }}
                />
                {/* Middle ring */}
                <div
                  className={`absolute rounded-full border-2 ${getVolumeColor()} transition-all duration-100 opacity-40`}
                  style={{
                    width: `${getVolumeSize() + 30}px`,
                    height: `${getVolumeSize() + 30}px`,
                  }}
                />
              </>
            )}

            {!isRecording && !audioBlob ? (
              <button
                onClick={startRecording}
                className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_rgba(59,130,246,0.8)] transition-all transform hover:scale-105 flex items-center justify-center relative z-10 active:scale-95"
              >
                <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-pulse -z-10" />
                <Mic className="w-20 h-20" />
              </button>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="w-36 h-36 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:shadow-[0_0_60px_rgba(239,68,68,0.8)] transition-all transform hover:scale-105 flex items-center justify-center relative z-10 active:scale-95"
              >
                <Square className="w-16 h-16 fill-current" />
              </button>
            ) : audioBlob && !isSubmitting ? (
              <button
                onClick={handleManualSubmit}
                className="w-36 h-36 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:shadow-[0_0_60px_rgba(34,197,94,0.8)] transition-all transform hover:scale-105 flex items-center justify-center relative z-10 active:scale-95"
              >
                <Mic className="w-20 h-20" />
              </button>
            ) : (
              <div className="w-36 h-36 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center relative z-10">
                <Loader2 className="w-20 h-20 animate-spin" />
              </div>
            )}
          </div>

          {/* Instructions and Status Text */}
          <div className="text-center">
            <p className="text-lg font-bold text-foreground mb-1">
              {isRecording
                ? "🎤 Gravando Áudio"
                : audioBlob && !isRecording && !isSubmitting
                  ? "✓ Processando..."
                  : isSubmitting
                    ? "⏳ Quase pronto..."
                    : "Pressione para falar"}
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              {!isRecording && !audioBlob && "Inicie um novo ditado inteligente agora"}
              {isRecording && `Nível de captação: ${amplitude < 0.3 ? "Baixo" : amplitude < 0.6 ? "Médio" : "Excelente"}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
