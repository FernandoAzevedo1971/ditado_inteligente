import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  defaultEmail?: string;
  onComplete: () => void;
}

export function RegistrationModal({ isOpen, defaultEmail = "", onComplete }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completeMutation = trpc.user.completeRegistration.useMutation();

  useEffect(() => {
    if (defaultEmail && !email) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      toast.error("Você deve aceitar os Termos de Uso para continuar.");
      return;
    }
    if (phone.trim().length < 8) {
      toast.error("Informe um número de telefone válido.");
      return;
    }
    setIsSubmitting(true);
    try {
      await completeMutation.mutateAsync({ email, phone: phone.trim() });
      toast.success("Cadastro concluído! Bem-vindo(a)!");
      onComplete();
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("10005") || msg.includes("telefone")) {
        toast.error("Este número de telefone já está cadastrado. Use outro número.");
      } else {
        toast.error("Erro ao salvar cadastro. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-md mx-4 p-8 border border-white/10 shadow-2xl rounded-3xl">
        <h2 className="text-2xl font-semibold tracking-tighter mb-2 text-foreground">
          Complete seu <span className="text-indigo-400">Cadastro</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Informe seus dados para continuar usando o Ditado Inteligente.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="seu@email.com"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Pode ser diferente do e-mail Google. Usado para contato e envio de códigos.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1 block">
              Telefone / WhatsApp
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="+55 (11) 99999-9999"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Número único por conta — impede o uso de múltiplos e-mails para burlar o limite.
            </p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer group pt-1">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-indigo-500 shrink-0"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Li e aceito os{" "}
              <span className="text-indigo-400 underline">Termos de Uso</span>{" "}
              do Ditado Inteligente.
            </span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting || !termsAccepted}
            className="w-full mt-2 glass-button py-3 rounded-xl font-semibold tracking-wider uppercase text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-all"
          >
            {isSubmitting ? "Salvando..." : "Concluir Cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
