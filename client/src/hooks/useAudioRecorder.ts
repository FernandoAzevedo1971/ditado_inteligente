import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const MAX_RECORDING_SECONDS = 180;

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  recordingTime: number;
  amplitude: number;
  error: string | null;
  mediaStream: MediaStream | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch (e) {
      console.warn("Wake lock não disponível:", e);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {
        console.warn("Erro ao liberar wake lock:", e);
      }
      wakeLockRef.current = null;
    }
  };

  // Re-adquire o wake lock ao retornar para a página (o browser libera automaticamente ao esconder)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isRecording) {
        await acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Seu navegador não suporta gravação de áudio";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Impede a tela de apagar enquanto o ditado estiver ativo
      await acquireWakeLock();

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Check supported MIME types
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/mp4";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/wav";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "";
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 32000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        setAudioBlob(blob);
        chunksRef.current = [];

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.onerror = (event) => {
        const errorMsg = `Erro ao gravar: ${(event as any).error || "Desconhecido"}`;
        setError(errorMsg);
        toast.error(errorMsg);
        setIsRecording(false);
        releaseWakeLock();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Setup audio context for amplitude visualization
      try {
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          analyserRef.current = analyser;

          // Start amplitude visualization
          const updateAmplitude = () => {
            if (!analyserRef.current) return;

            const dataArray = new Uint8Array(
              analyserRef.current.frequencyBinCount
            );
            analyserRef.current.getByteFrequencyData(dataArray);

            const average =
              dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAmplitude(average / 255);

            animationRef.current = requestAnimationFrame(updateAmplitude);
          };

          updateAmplitude();
        }
      } catch (audioError) {
        console.warn("Audio context not available for visualization:", audioError);
      }

      // Start recording timer with auto-stop
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const nextTime = prev + 1;
          if (nextTime >= MAX_RECORDING_SECONDS) {
            // Must use ref instead of state action since state may be stale inside the interval without proper deps
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
              toast.info("Limite de 3 minutos atingido. Gravação finalizada automaticamente.");
            }
          }
          return nextTime;
        });
      }, 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao acessar o microfone";

      if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission denied")) {
        setError("Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.");
        toast.error("Permissão de microfone negada");
      } else if (errorMsg.includes("NotFoundError")) {
        setError("Nenhum microfone encontrado no dispositivo");
        toast.error("Microfone não encontrado");
      } else {
        setError(errorMsg);
        toast.error(`Erro: ${errorMsg}`);
      }

      console.error("Error accessing microphone:", err);
      setIsRecording(false);
      releaseWakeLock();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn("Error closing audio context:", e);
        }
        audioContextRef.current = null;
      }
    }

    // Libera o wake lock ao parar o ditado
    releaseWakeLock();
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setAmplitude(0);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.warn("Error closing audio context on cleanup:", e);
        }
      }
      releaseWakeLock();
    };
  }, []);

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    recordingTime,
    amplitude,
    error,
    mediaStream: streamRef.current,
  };
}
