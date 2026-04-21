import { useState } from "react";
import { Lock, Zap, Loader2 } from "lucide-react";

interface PaywallModalProps {
  openId: string;
}

export function PaywallModal({ openId }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar pagamento");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-sm mx-4 p-8 rounded-2xl border border-white/10 shadow-[0_0_80px_rgba(99,102,241,0.2)] flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Limite gratuito atingido
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Você usou todos os seus <span className="text-foreground font-medium">30 usos gratuitos</span>.
            Assine para continuar usando sem limites.
          </p>
        </div>

        <div className="w-full rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Plano Pro</p>
            <p className="text-xs text-muted-foreground">Usos ilimitados</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-indigo-400">US$ 1,99</p>
            <p className="text-xs text-muted-foreground">/mês</p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {loading ? "Redirecionando..." : "Assinar por US$ 1,99/mês"}
        </button>

        <p className="text-[10px] text-muted-foreground/50 text-center">
          Pagamento seguro via Stripe. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}
