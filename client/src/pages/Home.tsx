import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RecordingInterface } from "@/components/RecordingInterface";
import { ComparisonView } from "@/components/ComparisonView";
import { HistoryPanel } from "@/components/HistoryPanel";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranscriptionHistory } from "@/hooks/useTranscriptionHistory";
import { History, LogOut, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { AudioLines, Sparkles } from "lucide-react";

interface ProcessingState {
  transcription: string;
  corrected: string;
}

type ProcessingStep = "idle" | "transcribing" | "correcting";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { addRecord } = useTranscriptionHistory();
  // Remover tema escuro - manter apenas fundo claro
  const [processingState, setProcessingState] =
    useState<ProcessingState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [showHistory, setShowHistory] = useState(false);

  // Mutations
  const correctMutation = trpc.text.correct.useMutation();

  const handleTranscriptionStart = async (audioBlob: Blob) => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("transcribing");

    try {
      // 1. Verificação de tamanho (Vercel Payload Limit: 4.5MB)
      // Como usamos FormData agora, o limite é o binário puro.
      // 6MB é seguro para 3-5 minutos de áudio.
      const MAX_BLOB_SIZE = 6 * 1024 * 1024; // 6MB
      if (audioBlob.size > MAX_BLOB_SIZE) {
        setIsProcessing(false);
        setProcessingStep("idle");
        toast.error("Áudio muito longo (> 6MB). Grave arquivos mais curtos.");
        return;
      }

      // 2. Envio via FormData para evitar overhead de Base64
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("provider", "groq");
      formData.append("language", "pt");

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

      const originalText = responseData.text;

      // Move to correction step
      setProcessingStep("correcting");

      // Correct text with AI
      const correctionResult = await correctMutation.mutateAsync({
        text: originalText,
        language: "auto",
      });

      const correctedText = correctionResult.correctedText;

      // Save to history
      addRecord(originalText, correctedText, "auto");

      setProcessingState({
        transcription: originalText,
        corrected: correctedText,
      });

      setProcessingStep("idle");
      setIsProcessing(false);
      toast.success("Transcrição e correção concluídas!");
    } catch (error: any) {
      setProcessingStep("idle");
      setIsProcessing(false);
      console.error("Error processing audio:", error);

      const errorMsg = error.message || "Erro desconhecido";
      if (errorMsg.includes("413") || errorMsg.includes("large")) {
        toast.error(
          "Áudio muito grande para o servidor. Tente gravar menos de 3 minutos."
        );
      } else if (
        errorMsg.includes("timeout") ||
        errorMsg.includes("deadline")
      ) {
        toast.error("Tempo limite excedido. Tente uma frase mais curta.");
      } else {
        toast.error(`Erro: ${errorMsg}`);
      }
    }
  };

  const handleReset = () => {
    setProcessingState(null);
    setIsProcessing(false);
    setProcessingStep("idle");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <div className="text-center mb-8">
          <h1 className="text-[43px] font-bold mb-2 text-foreground">
            Ditado Inteligente
          </h1>
          <p className="text-muted-foreground">
            Transcreva e corrija seus textos com IA
          </p>
        </div>
        <Button
          onClick={async () => {
            if (!auth) {
              toast.error(
                "Firebase não configurado. Verifique as variáveis de ambiente."
              );
              return;
            }
            try {
              const provider = new GoogleAuthProvider();
              await signInWithPopup(auth, provider);
              toast.success("Login com sucesso!");
            } catch (err: any) {
              toast.error("Erro no login: " + err.message);
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg"
        >
          Entrar com Google
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-x-hidden relative">
      {/* Ambient Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Header - Glassmorphism & Minimal */}
      <header className="absolute top-0 left-0 right-0 z-20 px-4 pt-2 pb-1 sm:px-6 sm:pt-3 bg-transparent">
        <div className="flex items-center justify-between">
          {/* Logo + Title na mesma linha */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <AudioLines className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-black text-foreground tracking-tighter whitespace-nowrap">
              Ditado <span className="text-indigo-500">inteligente</span>
            </h1>
          </div>

          {/* Ícones alinhados à direita */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2.5 rounded-xl transition-all border border-white/5 ${
                showHistory
                  ? "bg-indigo-500/20 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                  : "glass-dark hover:bg-white/10 text-muted-foreground hover:text-indigo-400"
              }`}
              title="Histórico"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={logout}
              className="p-2.5 rounded-xl transition-all glass-dark hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border border-white/5"
              title="Sair"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Subtitle badge abaixo */}
        <div className="mt-0.5 ml-11 sm:ml-12">
          <span className="text-[10px] font-bold tracking-widest text-indigo-200/40 uppercase">
            Groq Ultra-Fast Whisper
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`relative z-10 flex-1 flex flex-col items-center ${
          processingState 
            ? "justify-start pt-24 sm:pt-32" 
            : showHistory 
              ? "justify-start pt-2" 
              : "justify-center"
        } w-full`}
      >
        {showHistory ? (
          <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-black text-foreground tracking-tighter">
                Anteriores
              </h2>
              <Button
                variant="ghost"
                onClick={() => setShowHistory(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Voltar ao Gravador
              </Button>
            </div>
            <HistoryPanel />
          </div>
        ) : processingState ? (
          <ComparisonView
            originalText={processingState.transcription}
            correctedText={processingState.corrected}
            language="auto"
            onClose={handleReset}
          />
        ) : (
          <div className="w-full max-w-4xl mx-auto flex items-center justify-center">
            <RecordingInterface
              onTranscriptionStart={handleTranscriptionStart}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Processing Overlay - Premium Blur */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-500">
            <div className="glass-card p-12 max-w-md w-full mx-4 border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
              <div className="flex flex-col items-center gap-8">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-indigo-500" />
                  <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
                </div>

                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-black tracking-tighter text-glow-primary">
                    Transcrevendo
                  </h2>
                  <p className="text-sm text-indigo-200/50 font-medium tracking-wide">
                    acrescentando pontuação, parágrafos e corrigindo contexto
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
