import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";

interface AudioWaveformProps {
  isRecording: boolean;
  audioStream?: MediaStream;
}

export function AudioWaveform({ isRecording, audioStream }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const barsRef = useRef<number[]>(Array(40).fill(0));
  const scrollOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (!isRecording || !audioStream || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Setup Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      // Get average frequency for current frame
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;

      // Shift bars and add new value
      barsRef.current.shift();
      barsRef.current.push(average);

      // Increment scroll offset extremamente lentamente
      scrollOffsetRef.current += 0.02;

      // Clear canvas
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.05)");
      gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.1)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.05)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw vertical bars
      const barWidth = 6;
      const barSpacing = 2;
      const totalBarWidth = barWidth + barSpacing;
      const centerY = canvas.height / 2;
      const maxBarHeight = centerY - 4;

      ctx.fillStyle = "rgb(59, 130, 246)";
      ctx.lineCap = "round";

      barsRef.current.forEach((value, i) => {
        // Calculate x position with scroll offset
        const x = (i * totalBarWidth) - (scrollOffsetRef.current % (totalBarWidth * barsRef.current.length));

        // Only draw bars that are visible
        if (x + barWidth > 0 && x < canvas.width) {
          const barHeight = value * maxBarHeight;

          // Draw top bar (above center)
          ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);

          // Draw bottom bar (below center - mirror)
          ctx.fillRect(x, centerY, barWidth, barHeight);
        }
      });

      // Draw center line
      ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [isRecording, audioStream]);

  return (
    <div className="flex items-center justify-center gap-3 py-4 w-full">
      <Volume2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
      <div className="flex-1 max-w-md h-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-blue-200 shadow-sm">
        <canvas
          ref={canvasRef}
          width={320}
          height={64}
          className="w-full h-full"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}
