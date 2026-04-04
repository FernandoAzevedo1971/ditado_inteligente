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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [showHistory, setShowHistory] = useState(false);
  const [provider, setProvider] = useState<"groq" | "mistral">("groq");

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
      formData.append("provider", provider);
      formData.append("language", "pt");

      const response = await fetch("/api/audio/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha na transcrição");
      }

      const transcriptionResult = await response.json();
      const originalText = transcriptionResult.text;
      
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
        toast.error("Áudio muito grande para o servidor. Tente gravar menos de 3 minutos.");
      } else if (errorMsg.includes("timeout") || errorMsg.includes("deadline")) {
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
           <h1 className="text-4xl font-bold mb-2 text-foreground">Ditado Inteligente</h1>
          <p className="text-muted-foreground">
            Transcreva e corrija seus textos com IA
          </p>
        </div>
        <Button
          onClick={async () => {
            if (!auth) {
              toast.error("Firebase não configurado. Verifique as variáveis de ambiente.");
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
     <div className="min-h-screen bg-background">
      {/* Header - Minimal and Transparent */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 bg-transparent">
        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tighter shrink-0">
          Ditado Inteligente
        </h1>
        <div className="flex items-center gap-1.5 sm:gap-4">
          <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
            <SelectTrigger className="w-[115px] sm:w-[180px] bg-white/5 border-none h-9 sm:h-10 px-2 sm:px-3 transition-all hover:bg-white/10 text-xs sm:text-sm">
              <SelectValue placeholder="IA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="groq" className="flex items-center gap-2">
                <AudioLines className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                <span className="text-xs sm:text-sm">Groq (Whisper)</span>
              </SelectItem>
              <SelectItem value="mistral" className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                <span className="text-xs sm:text-sm">Mistral (Voxtral)</span>
              </SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 sm:p-3 rounded-full transition-all hover:bg-white/5 text-muted-foreground hover:text-foreground"
          >
            <History className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={logout}
            className="p-2 sm:p-3 rounded-full transition-all hover:bg-white/5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Recording or Results */}
        {processingState ? (
          <ComparisonView
            originalText={processingState.transcription}
            correctedText={processingState.corrected}
            language="auto"
            onClose={handleReset}
          />
        ) : (
          <RecordingInterface
            onTranscriptionStart={handleTranscriptionStart}
            isProcessing={isProcessing}
          />
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
             <div className="rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 bg-card text-card-foreground">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="text-center">
                  {processingStep === "transcribing" ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2">
                        Transcrevendo com IA
                      </h2>
                      <p className="text-muted-foreground">
                        Convertendo seu áudio em texto...
                      </p>
                    </>
                  ) : processingStep === "correcting" ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2">
                        Corrigindo com IA
                      </h2>
                      <p className="text-muted-foreground">
                        Aplicando pontuação, gramática e parágrafos...
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <HistoryPanel />
        )}
      </div>
    </div>
  );
}
