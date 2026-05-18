import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, UserPlus, Trash2, RefreshCw } from "lucide-react";

interface FreeAccessEntry {
  email: string;
  grantedAt: Date | null;
}

export function AdminPanel() {
  const [entries, setEntries] = useState<FreeAccessEntry[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const loadEntries = useCallback(async () => {
    if (!db) return;
    setIsLoadingList(true);
    try {
      const snap = await getDocs(collection(db, "freeAccess"));
      const list: FreeAccessEntry[] = snap.docs
        .filter((d) => d.data().active === true)
        .map((d) => ({
          email: d.id,
          grantedAt: d.data().grantedAt?.toDate?.() ?? null,
        }));
      setEntries(list);
    } catch (err: any) {
      toast.error("Erro ao carregar lista: " + err.message);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const grantAccess = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !db) return;
    setIsGranting(true);
    try {
      await setDoc(doc(db, "freeAccess", email), {
        active: true,
        grantedAt: new Date(),
        grantedBy: "fazevedopneumosono@gmail.com",
      });
      setNewEmail("");
      await loadEntries();
      toast.success(`Acesso gratuito concedido para ${email}`);
    } catch (err: any) {
      toast.error(`Erro ao conceder acesso: ${err.message}`);
    } finally {
      setIsGranting(false);
    }
  };

  const revokeAccess = async (email: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "freeAccess", email));
      await loadEntries();
      toast.success(`Acesso revogado para ${email}`);
    } catch (err: any) {
      toast.error(`Erro ao revogar acesso: ${err.message}`);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-2 glass-card p-5 rounded-2xl border border-indigo-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold text-indigo-300 tracking-widest uppercase">
            Admin — Acesso Gratuito
          </h2>
        </div>
        <button
          onClick={loadEntries}
          className="p-1 rounded hover:bg-white/5 text-muted-foreground transition-colors"
          title="Atualizar lista"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          type="email"
          placeholder="email@exemplo.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && grantAccess()}
          className="bg-white/5 border-white/10 text-sm h-9"
        />
        <Button
          onClick={grantAccess}
          disabled={isGranting || !newEmail.trim()}
          size="sm"
          className="shrink-0 h-9 bg-indigo-600 hover:bg-indigo-500 px-3"
          title="Conceder acesso gratuito"
        >
          <UserPlus className="w-4 h-4" />
        </Button>
      </div>

      {isLoadingList ? (
        <p className="text-xs text-muted-foreground text-center py-2">Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum usuário com acesso gratuito
        </p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li
              key={entry.email}
              className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-white/5"
            >
              <span className="text-sm text-foreground/80 truncate">{entry.email}</span>
              <button
                onClick={() => revokeAccess(entry.email)}
                className="shrink-0 p-1 rounded hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors"
                title="Revogar acesso"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
