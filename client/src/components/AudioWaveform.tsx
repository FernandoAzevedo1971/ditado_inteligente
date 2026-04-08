import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  isRecording: boolean;
  audioStream?: MediaStream;
}

export function AudioWaveform({ isRecording, audioStream }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const barsRef = useRef<number[]>([]);
  const scrollOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (!isRecording || !audioStream || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate how many bars fill the canvas at full width
    const barWidth = 4;
    const barSpacing = 3;
    const totalBarWidth = barWidth + barSpacing;
    const numBars = Math.ceil(canvas.width / totalBarWidth) + 2;
    barsRef.current = Array(numBars).fill(0);

    // Setup Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      // Get average of lower frequencies (voices and speech)
      const slice = dataArray.slice(0, bufferLength / 2);
      const average = slice.reduce((a, b) => a + b, 0) / slice.length / 255;

      // Shift left and add new bar value
      barsRef.current.shift();
      barsRef.current.push(average);

      // Scroll speed: 0.01 (100% slower than original 0.02)
      scrollOffsetRef.current += 0.01;

      // === DEEP SPACE BACKGROUND ===
      ctx.fillStyle = "#0b1326";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerY = canvas.height / 2;
      // High amplitude: 90% of available half-height
      const maxBarHeight = (centerY - 4) * 0.9;

      // Indigo/violet gradient for the bars
      const barGradient = ctx.createLinearGradient(0, centerY - maxBarHeight, 0, centerY + maxBarHeight);
      barGradient.addColorStop(0, "rgba(129, 140, 248, 0.3)");
      barGradient.addColorStop(0.4, "rgba(99, 102, 241, 0.9)");
      barGradient.addColorStop(0.5, "rgba(139, 92, 246, 1)");
      barGradient.addColorStop(0.6, "rgba(99, 102, 241, 0.9)");
      barGradient.addColorStop(1, "rgba(129, 140, 248, 0.3)");

      ctx.fillStyle = barGradient;

      barsRef.current.forEach((value, i) => {
        // Bars scan across full canvas width
        const x = (i * totalBarWidth) - (scrollOffsetRef.current % totalBarWidth);

        if (x + barWidth > 0 && x < canvas.width) {
          const barHeight = Math.max(3, value * maxBarHeight);

          // Top bar (upward from center)
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, 2);
          ctx.fill();

          // Bottom bar (mirror downward)
          ctx.beginPath();
          ctx.roundRect(x, centerY, barWidth, barHeight, 2);
          ctx.fill();
        }
      });

      // Center glow line
      ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(139, 92, 246, 0.6)";
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();
      ctx.shadowBlur = 0;

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
    <div className="flex items-center justify-center py-2 w-full animate-in fade-in duration-700">
      <div
        className="flex-1 h-20 overflow-hidden relative rounded-xl border border-indigo-500/10"
        style={{ background: "#0b1326" }}
      >
        <canvas
          ref={canvasRef}
          width={600}
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
