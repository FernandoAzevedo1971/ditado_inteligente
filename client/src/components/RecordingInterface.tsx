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
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    recordingTime,
    amplitude,
    error,
    mediaStream,
  } = useAudioRecorder();
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
    <div className="w-full flex flex-col items-center justify-center px-4 py-2 animate-in fade-in zoom-in duration-1000">
      <div className="w-full max-w-lg glass-card p-4 sm:p-6 relative overflow-hidden">
        {/* Background Decorative Glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 glass-dark border-red-500/20 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200/80">{error}</p>
          </div>
        )}

        {/* Main Interface Content */}
        <div className="flex flex-col items-center relative z-10 text-center">
          {/* Recording Status */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black mb-2 text-foreground tracking-tighter text-glow-primary">
              {isRecording
                ? "Transcrevendo..."
                : audioBlob
                  ? "Sintonizando..."
                  : "Ditado Inteligente"}
            </h1>
            <p className="text-[15px] sm:text-lg text-indigo-200/50 font-medium tracking-wide">
              {isRecording
                ? "Capturando sua voz..."
                : isProcessing
                  ? "Refinando texto..."
                  : "Toque para iniciar a magia"}
            </p>
          </div>

          {/* Audio Waveform Visualization - Full height background style */}
          {isRecording && mediaStream && (
            <div className="w-full mb-6 h-16 flex items-center justify-center">
              <AudioWaveform
                isRecording={isRecording}
                audioStream={mediaStream}
              />
            </div>
          )}

          {/* Recording Time */}
          {isRecording && (
            <div className="mb-6">
              <div className="text-3xl sm:text-4xl font-mono font-black text-indigo-400/80 tracking-tighter transition-all">
                {formatTime(recordingTime)}
              </div>
            </div>
          )}

          {/* Main Recording Button */}
          <div className="flex justify-center mb-4 relative items-center">
            {!isRecording && !audioBlob ? (
              <button
                onClick={startRecording}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Mic className="w-10 h-10 sm:w-14 sm:h-14" />
                <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-pulse" />
              </button>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-red-500/80 to-rose-700/80 text-white animate-pulse-glow flex items-center justify-center relative z-10 active:scale-95 border-4 border-white/20"
              >
                <Square className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
              </button>
            ) : isSubmitting || isProcessing ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full glass-dark flex items-center justify-center border-2 border-indigo-500/30">
                <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <button
                onClick={handleManualSubmit}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
              >
                <Mic className="w-10 h-10 sm:w-14 sm:h-14" />
              </button>
            )}
          </div>

          {/* Instructions and Status Text */}
          <div className="max-w-xs mx-auto">
            <p className="text-sm sm:text-base font-bold text-indigo-200/70 mb-2 tracking-[0.2em]">
              {isRecording
                ? "Gravando"
                : audioBlob && !isRecording && !isSubmitting
                  ? "✓ Pronto"
                  : isSubmitting
                    ? "⏳ Transcrevendo"
                    : "Pressione para ditar"}
            </p>
            {!isRecording && !audioBlob && (
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                Sua voz será convertida em texto profissional instantaneamente.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
