import { useState, useEffect } from "react";
import { useAudioRecorder, MAX_RECORDING_SECONDS } from "@/hooks/useAudioRecorder";
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
      <div className="w-full max-w-lg glass-card p-8 sm:p-12 relative overflow-hidden text-center">
        {/* Subtle Ambient Light */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

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
          <div className="mb-10 sm:mb-14">
            <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground tracking-tighter text-glow-primary font-display">
              {isRecording
                ? "Ditando..."
                : audioBlob
                  ? "Sintonizando..."
                  : "Ditado Inteligente"}
            </h1>
            <p className="text-[14px] text-indigo-200/40 font-medium tracking-wide">
              {isRecording
                ? "Convertendo audio em texto..."
                : isProcessing
                  ? "Refinando texto..."
                  : "Converte seu ditado em texto"}
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
            <div className="mb-6 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-2">
              <div className={`text-3xl sm:text-4xl font-mono font-medium tracking-tighter transition-colors duration-500 ${
                recordingTime >= MAX_RECORDING_SECONDS - 10 
                  ? "text-red-500 animate-pulse" 
                  : recordingTime >= MAX_RECORDING_SECONDS - 30 
                    ? "text-amber-400" 
                    : "text-indigo-400/80"
              }`}>
                {formatTime(recordingTime)}
              </div>
              
              {/* Progress Bar (Visual indicator of remaining time) */}
              <div className="w-full max-w-[200px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear ${
                    recordingTime >= MAX_RECORDING_SECONDS - 10 
                      ? "bg-red-500" 
                      : recordingTime >= MAX_RECORDING_SECONDS - 30 
                        ? "bg-amber-400" 
                        : "bg-indigo-500"
                  }`}
                  style={{ width: `${Math.min(100, (recordingTime / MAX_RECORDING_SECONDS) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Recording Button */}
          <div className="flex justify-center mb-6 relative items-center">
            {!isRecording && !audioBlob ? (
              <button
                onClick={startRecording}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Mic className="w-[70px] h-[70px] sm:w-[98px] sm:h-[98px]" />
                <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-pulse" />
              </button>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="w-[90px] h-[90px] sm:w-[115px] sm:h-[115px] rounded-full bg-gradient-to-br from-red-500/80 to-rose-700/80 text-white animate-pulse-glow flex items-center justify-center relative z-10 active:scale-95 border-4 border-white/20"
              >
                <Square className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
              </button>
            ) : isSubmitting || isProcessing ? (
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full glass-dark flex items-center justify-center border-2 border-indigo-500/30">
                <Loader2 className="w-16 h-16 sm:w-22 sm:h-22 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <button
                onClick={handleManualSubmit}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
              >
                <Mic className="w-[70px] h-[70px] sm:w-[98px] sm:h-[98px]" />
              </button>
            )}
          </div>

          {/* Instructions and Status Text */}
          <div className="max-w-xs mx-auto mt-4">
            <p className="text-sm font-medium text-indigo-200/50 tracking-[0.2em] uppercase">
              {isRecording
                ? recordingTime >= MAX_RECORDING_SECONDS - 30 
                    ? "Limite próximo..." 
                    : "Gravando"
                : audioBlob && !isRecording && !isSubmitting
                  ? "✓ Pronto"
                  : isSubmitting
                    ? "⏳ Transcrevendo"
                    : "Até 3 min por gravação"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
