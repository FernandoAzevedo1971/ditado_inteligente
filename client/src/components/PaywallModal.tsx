import { useState } from "react";
import { Crown, Sparkles, Infinity, Mic, X, Loader2, CheckCircle2 } from "lucide-react";
import { SUBSCRIPTION_PRICE_BRL, FREE_DICTATION_LIMIT } from "@shared/const";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => Promise<any>;
  dictationCount: number;
  isPurchasing: boolean;
}

export function PaywallModal({
  isOpen,
  onClose,
  onSubscribe,
  dictationCount,
  isPurchasing,
}: PaywallModalProps) {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setError(null);
    try {
      await onSubscribe();
    } catch (err: any) {
      setError(err.message || "Erro ao processar assinatura");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
      <div className="glass-card max-w-md w-full relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Premium Gradient Header */}
        <div className="relative px-8 pt-10 pb-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent" />
          <div className="relative z-10">
            {/* Crown Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-float">
              <Crown className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-semibold text-foreground tracking-tighter font-display mb-2">
              Ditado <span className="text-amber-400">Premium</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Você usou todos os seus ditados gratuitos
            </p>
          </div>
        </div>

        {/* Usage Counter */}
        <div className="px-8 mb-6">
          <div className="glass-dark rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Ditados utilizados</span>
              <span className="text-sm font-semibold text-amber-400">
                {dictationCount}/{FREE_DICTATION_LIMIT}
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (dictationCount / FREE_DICTATION_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="px-8 mb-8 space-y-3">
          {[
            { icon: Infinity, text: "Ditados ilimitados" },
            { icon: Sparkles, text: "Correção IA sem limites" },
            { icon: Mic, text: "Edição por voz premium" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-sm text-foreground/80">{text}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
            </div>
          ))}
        </div>

        {/* Price & CTA */}
        <div className="px-8 pb-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={isPurchasing}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-lg tracking-tight shadow-2xl shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5" />
                Assinar por R$ {SUBSCRIPTION_PRICE_BRL}/mês
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground/50 mt-4">
            Cancele quando quiser pela Play Store
          </p>
        </div>
      </div>
    </div>
  );
}
