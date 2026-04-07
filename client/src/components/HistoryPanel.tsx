import { useTranscriptionHistory } from "@/hooks/useTranscriptionHistory";

import { Trash2, ChevronDown, ChevronUp, Copy, Check, Calendar, Type } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function HistoryPanel() {
  const { history, deleteRecord, clearHistory } = useTranscriptionHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success("Copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      pt: "Português",
      en: "English",
      es: "Español",
    };
    return names[code] || code;
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass-card border-white/5 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
          <Calendar className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-slate-400 font-medium tracking-tight">O histórico está vazio</p>
        <p className="text-slate-500 text-xs mt-2">Suas transcrições aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tighter">Anteriores</h3>
          <p className="text-[10px] font-bold tracking-[0.2em] text-indigo-400/50 uppercase mt-1">
            {history.length} {history.length === 1 ? 'REGISTRO' : 'REGISTROS'}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("Deseja limpar todo o histórico?")) clearHistory();
          }}
          className="text-[10px] font-black tracking-widest text-red-400/60 hover:text-red-400 uppercase transition-colors flex items-center gap-1.5 px-3 py-2 glass-dark rounded-lg border border-red-500/10"
        >
          <Trash2 className="w-3 h-3" /> Limpar Histórico
        </button>
      </div>

      <div className="space-y-3">
        {history.map((record, index) => (
          <div
            key={record.id}
            className="glass-card overflow-hidden border-white/5 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] group animate-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              className="cursor-pointer p-4 sm:p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[8px] font-black tracking-[0.2em] border border-indigo-500/30 uppercase">
                    {getLanguageName(record.language)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                    {formatDate(record.timestamp)}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed line-clamp-2 pr-4 group-hover:text-white transition-colors">
                  {record.correctedText}
                </p>
              </div>
              <div className="p-2 glass-dark rounded-xl group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all border border-white/5">
                {expandedId === record.id ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>

            {expandedId === record.id && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-6 animate-in slide-in-from-top-2 duration-300">
                <div className="h-px bg-white/10 mb-5" />
                
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <Type className="w-3 h-3 text-slate-500" />
                       <h4 className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase">Original</h4>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 sm:p-4 border border-white/5">
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed italic">
                        "{record.originalText}"
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <Check className="w-3 h-3 text-indigo-400" />
                       <h4 className="text-[9px] font-black tracking-[0.2em] text-indigo-400 uppercase">Aprimorado</h4>
                    </div>
                    <div className="glass-dark rounded-xl p-3 sm:p-4 border border-white/10">
                      <p className="text-sm sm:text-base text-white leading-relaxed font-medium">
                        {record.correctedText}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => copyToClipboard(record.correctedText, record.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white text-black hover:bg-slate-100 active:scale-[0.98] shadow-lg"
                    >
                      {copiedId === record.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copiar Texto
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="p-3 glass-dark text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-xl border border-white/5 active:scale-90"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
