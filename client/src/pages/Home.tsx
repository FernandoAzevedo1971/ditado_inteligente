import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RecordingInterface } from "@/components/RecordingInterface";
import { ComparisonView } from "@/components/ComparisonView";
import { HistoryPanel } from "@/components/HistoryPanel";
import { PaywallModal } from "@/components/PaywallModal";
import { DictationCounter } from "@/components/DictationCounter";
import { RegistrationModal } from "@/components/RegistrationModal";
import { AdminPanel } from "@/components/AdminPanel";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranscriptionHistory } from "@/hooks/useTranscriptionHistory";
import { useSubscription } from "@/hooks/useSubscription";
import { History, LogOut, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { AudioLines } from "lucide-react";
import { PAYMENT_REQUIRED_ERR_MSG, REGISTRATION_GRACE_LIMIT } from "@shared/const";

interface ProcessingState {
  transcription: string;
  corrected: string;
  outOfContextWords: string[];
  translatedTo?: string;
}

type ProcessingStep = "idle" | "transcribing" | "correcting";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { addRecord } = useTranscriptionHistory();
  const { info, canDictate, isPurchasing, recordDictation, purchaseSubscription } = useSubscription();
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [showHistory, setShowHistory] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [forceShowRegistration, setForceShowRegistration] = useState(false);

  const correctMutation = trpc.text.correct.useMutation();

  // Fetch user profile from MySQL (role, freeAccess, registrationComplete)
  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const isAdmin = profileQuery.data?.role === "admin";
  const needsRegistration =
    isAuthenticated &&
    profileQuery.data !== undefined &&
    !profileQuery.data.registrationComplete &&
    !isAdmin;
  const showRegistrationModal =
    needsRegistration &&
    (info.dictationCount >= REGISTRATION_GRACE_LIMIT || forceShowRegistration);

  const handleTranscriptionStart = async (audioBlob: Blob) => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    // Block if registration is required
    if (needsRegistration && info.dictationCount >= REGISTRATION_GRACE_LIMIT) {
      setForceShowRegistration(true);
      return;
    }

    // Check if user can still dictate
    if (!canDictate) {
      setShowPaywall(true);
      return;
    }

    setIsProcessing(true);
    setProcessingStep("transcribing");

    try {
      const MAX_BLOB_SIZE = 4.5 * 1024 * 1024;
      if (audioBlob.size > MAX_BLOB_SIZE) {
        setIsProcessing(false);
        setProcessingStep("idle");
        toast.error("Áudio muito longo (> 4.5MB). Vercel não suporta esse tamanho. Tente gravar menos tempo.");
        return;
      }

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

      if (!response.ok) throw new Error(responseData?.error || "Falha na transcrição");

      const originalText = responseData.text;
      setProcessingStep("correcting");

      const correctionResult = await correctMutation.mutateAsync({
        text: originalText,
        language: "auto",
      });

      // Record the dictation (increment counter)
      try {
        await recordDictation();
      } catch (err: any) {
        if (err.message?.includes(PAYMENT_REQUIRED_ERR_MSG)) {
          setShowPaywall(true);
        }
      }

      addRecord(correctionResult.correctedText, "auto");

      setProcessingState({
        transcription: originalText,
        corrected: correctionResult.correctedText,
        outOfContextWords: correctionResult.outOfContextWords || [],
        translatedTo: correctionResult.translatedTo ?? undefined,
      });

      setProcessingStep("idle");
      setIsProcessing(false);
      toast.success(
        correctionResult.translatedTo
          ? `Tradução para ${correctionResult.translatedTo} concluída!`
          : "Transcrição e correção concluídas!"
      );
    } catch (error: any) {
      setProcessingStep("idle");
      setIsProcessing(false);
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

  const handleReCorrect = async (editedOriginal: string) => {
    try {
      const correctionResult = await correctMutation.mutateAsync({
        text: editedOriginal,
        language: "auto",
      });
      setProcessingState(prev => prev ? {
        ...prev,
        transcription: editedOriginal,
        corrected: correctionResult.correctedText,
        outOfContextWords: correctionResult.outOfContextWords || [],
        translatedTo: correctionResult.translatedTo ?? undefined,
      } : null);
      toast.success("Texto re-corrigido!");
    } catch (error: any) {
      toast.error(`Erro ao re-corrigir: ${error.message || "Erro desconhecido"}`);
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="text-center mb-12 relative z-10">
          <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <AudioLines className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-semibold mb-4 text-foreground tracking-tighter font-display">
            Ditado <span className="text-indigo-500">Inteligente</span>
          </h1>
          <p className="text-lg text-indigo-200/40 font-medium tracking-wide">
            Converte seu ditado em texto
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
          className="glass-button text-foreground px-10 py-6 rounded-2xl font-semibold tracking-widest uppercase hover:scale-105 transition-all shadow-xl"
        >
          Entrar com Google
        </Button>
        <footer className="absolute bottom-8 text-[10px] text-indigo-400/20 font-semibold tracking-[0.3em] uppercase pointer-events-none">
          BY FERNANDO AZEVEDO
        </footer>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-x-hidden relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <header className="absolute top-0 left-0 right-0 z-20 px-6 pt-4 pb-2 bg-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <AudioLines className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tighter font-display">
              Ditado <span className="text-indigo-500">Inteligente</span>
            </h1>
          </div>
          <div className="flex items-start gap-2 shrink-0 ml-3">
            <button
              onClick={logout}
              className="p-2.5 rounded-xl transition-all glass-dark hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border border-white/5"
              title="Sair"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2.5 rounded-xl transition-all border border-white/5 glass-button ${
                  showHistory
                    ? "bg-indigo-500/20 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    : "text-muted-foreground hover:text-indigo-400"
                }`}
                title="Histórico"
              >
                <History className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {/* Dictation Counter Badge */}
              <div className="absolute top-full mt-1 right-0 z-30">
                <DictationCounter
                  dictationCount={info.dictationCount}
                  isPremium={info.isPremium}
                  onClick={() => !info.isPremium && setShowPaywall(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main
        className={`relative z-10 flex-1 flex flex-col items-center min-h-0 ${
          processingState
            ? "justify-start pt-24 sm:pt-32 pb-4 px-2 overflow-hidden"
            : showHistory
              ? "justify-start pt-2"
              : "justify-center"
        } w-full`}
      >
        {showHistory ? (
          <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-end mb-8">
              <Button variant="ghost" onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                Voltar ao Gravador
              </Button>
            </div>
            <HistoryPanel />
            {isAdmin && <AdminPanel />}
          </div>
        ) : processingState ? (
          <ComparisonView
            originalText={processingState.transcription}
            correctedText={processingState.corrected}
            outOfContextWords={processingState.outOfContextWords}
            translatedTo={processingState.translatedTo}
            language="auto"
            onClose={handleReset}
            onReCorrect={handleReCorrect}
          />
        ) : (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-4">
            <RecordingInterface
              onTranscriptionStart={handleTranscriptionStart}
              isProcessing={isProcessing}
            />
            {isAdmin && <AdminPanel />}
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-500">
            <div className="glass-card p-12 max-w-md w-full mx-4 border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
              <div className="flex flex-col items-center gap-8">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-indigo-500" />
                  <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tighter text-glow-primary">
                    {processingStep === "transcribing" ? "Transcrevendo..." : "Corrigindo com IA"}
                  </h2>
                  <p className="text-sm text-indigo-200/50 font-medium tracking-wide">
                    {processingStep === "transcribing"
                      ? "Convertendo áudio em texto..."
                      : "Aplicando pontuação, gramática e parágrafos..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={purchaseSubscription}
        dictationCount={info.dictationCount}
        isPurchasing={isPurchasing}
      />

      {/* Registration Modal — shown after grace period if not yet registered */}
      <RegistrationModal
        isOpen={showRegistrationModal}
        defaultEmail={user?.email ?? ""}
        onComplete={() => {
          setForceShowRegistration(false);
          profileQuery.refetch();
        }}
      />

      <footer className="absolute bottom-4 left-0 right-0 flex justify-center text-[9px] text-muted-foreground/20 font-semibold tracking-[0.4em] uppercase pointer-events-none">
        BY FERNANDO AZEVEDO
      </footer>
    </div>
  );
}
