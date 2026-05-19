import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Shield, UserCheck, UserX, Plus } from "lucide-react";

export function AdminPanel() {
  const [emailInput, setEmailInput] = useState("");

  const { data: freeUsers, refetch } = trpc.admin.listFreeAccessUsers.useQuery();
  const grantMutation = trpc.admin.grantFreeAccess.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Acesso gratuito liberado!");
      setEmailInput("");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const revokeMutation = trpc.admin.revokeFreeAccess.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Acesso revogado.");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const handleGrant = () => {
    if (emailInput.trim()) grantMutation.mutate({ email: emailInput.trim() });
  };

  return (
    <div className="w-full max-w-md mx-auto mt-6 glass-card p-6 border border-indigo-500/20 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">
          Painel Admin — Acesso Gratuito
        </h3>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="email do usuário"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors"
          onKeyDown={(e) => e.key === "Enter" && handleGrant()}
        />
        <button
          onClick={handleGrant}
          disabled={!emailInput.trim() || grantMutation.isPending}
          className="glass-button px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 disabled:opacity-40"
          title="Liberar acesso"
        >
          <Plus className="w-4 h-4" />
          Liberar
        </button>
      </div>

      <ul className="space-y-2">
        {(freeUsers ?? []).length === 0 && (
          <li className="text-xs text-muted-foreground text-center py-2">
            Nenhum usuário com acesso gratuito liberado.
          </li>
        )}
        {(freeUsers ?? []).map((u) => (
          <li
            key={u.email}
            className="flex items-center justify-between gap-2 bg-white/5 rounded-xl px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-sm text-foreground truncate">{u.email}</span>
              {u.name && (
                <span className="text-xs text-muted-foreground truncate hidden sm:block">
                  ({u.name})
                </span>
              )}
            </div>
            <button
              onClick={() => u.email && revokeMutation.mutate({ email: u.email })}
              disabled={revokeMutation.isPending}
              className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Revogar acesso"
            >
              <UserX className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
