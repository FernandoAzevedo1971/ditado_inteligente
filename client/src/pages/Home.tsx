import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { RecordingInterface } from "@/components/RecordingInterface";
import { ComparisonView } from "@/components/ComparisonView";
import { HistoryPanel } from "@/components/HistoryPanel";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranscriptionHistory } from "@/hooks/useTranscriptionHistory";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { History, LogOut, Loader2 } from "lucide-react";

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

  // Mutations
  const transcribeMutation = trpc.audio.transcribe.useMutation();
  const correctMutation = trpc.text.correct.useMutation();

  const handleTranscriptionStart = async (audioBlob: Blob) => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("transcribing");
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        try {
          // Transcribe audio (sem idioma especificado - detecção automática)
          const transcriptionResult = await transcribeMutation.mutateAsync({
            audioData: base64Audio,
            language: "auto",
          });

          const originalText = transcriptionResult.text;
          
          // Move to correction step
          setProcessingStep("correcting");

          // Correct text with AI (sem idioma especificado - detecção automática)
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
        } catch (error) {
          setProcessingStep("idle");
          setIsProcessing(false);
          console.error("Error processing audio:", error);
          toast.error("Erro ao processar áudio. Tente novamente.");
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      setProcessingStep("idle");
      setIsProcessing(false);
      console.error("Error reading audio:", error);
      toast.error("Erro ao ler áudio. Tente novamente.");
    }
  };

  const handleReset = () => {
    setProcessingState(null);
    setIsProcessing(false);
    setProcessingStep("idle");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        <div className="text-center mb-8">
           <h1 className="text-4xl font-bold mb-2 text-slate-900">Ditado Inteligente</h1>
          <p className="text-slate-600">
            Transcreva e corrija seus textos com IA
          </p>
        </div>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg"
        >
          Entrar com Manus
        </Button>
      </div>
    );
  }

  return (
     <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50">
      {/* Header */}
       <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
         <h1 className="text-xl font-bold text-slate-900">Ditado Inteligente</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg transition-colors hover:bg-slate-100"
          >
            <History className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-lg transition-colors hover:bg-slate-100"
          >
            <LogOut className="w-5 h-5 text-slate-600" />
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
             <div className="rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 bg-white">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <div className="text-center">
                  {processingStep === "transcribing" ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2 text-slate-900">
                        Transcrevendo com IA
                      </h2>
                      <p className="text-slate-600">
                        Convertendo seu áudio em texto...
                      </p>
                    </>
                  ) : processingStep === "correcting" ? (
                    <>
                      <h2 className="text-2xl font-bold mb-2 text-slate-900">
                        Corrigindo com IA
                      </h2>
                      <p className="text-slate-600">
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
