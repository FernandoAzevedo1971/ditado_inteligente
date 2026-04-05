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
      const barWidth = 4; // Slimmer bars
      const barSpacing = 3;
      const totalBarWidth = barWidth + barSpacing;
      const centerY = canvas.height / 2;
      const maxBarHeight = (centerY - 4) * 0.4; // Reduzindo para 40% da altura original para ser sutil

      // Create glowing gradient for bars
      const barGradient = ctx.createLinearGradient(0, centerY - maxBarHeight, 0, centerY + maxBarHeight);
      barGradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
      barGradient.addColorStop(0.5, "rgba(99, 102, 241, 1)");
      barGradient.addColorStop(1, "rgba(99, 102, 241, 0.2)");

      ctx.fillStyle = barGradient;

      barsRef.current.forEach((value, i) => {
        const x = (i * totalBarWidth) - (scrollOffsetRef.current % (totalBarWidth * barsRef.current.length));

        if (x + barWidth > 0 && x < canvas.width) {
          const barHeight = Math.max(2, value * maxBarHeight); // Garantindo altura mínima sutil

          // Draw top bar
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, 2);
          ctx.fill();

          // Draw bottom bar (mirror)
          ctx.beginPath();
          ctx.roundRect(x, centerY, barWidth, barHeight, 2);
          ctx.fill();
        }
      });

      // Draw subtle glow line
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(99, 102, 241, 0.5)";
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

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
    <div className="flex items-center justify-center gap-3 py-6 w-full animate-in fade-in duration-700">
      <div className="flex-1 max-w-md h-20 glass-card overflow-hidden relative group">
        <div className="absolute inset-0 premium-gradient opacity-50 transition-opacity group-hover:opacity-70" />
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className="w-full h-full relative z-10"
          style={{ display: "block" }}
        />
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center text-indigo-300/40 text-sm font-medium tracking-widest uppercase">
            Aguardando áudio...
          </div>
        )}
      </div>
    </div>
  );
}
