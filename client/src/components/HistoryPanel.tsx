import { useTranscriptionHistory, type TranscriptionRecord } from "@/hooks/useTranscriptionHistory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
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
      year: "numeric",
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
      <Card className="p-6 bg-card text-card-foreground shadow-lg border border-border rounded-xl text-center">
        <p className="text-muted-foreground">Nenhuma transcrição no histórico ainda</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-foreground">Histórico ({history.length})</h3>
        {history.length > 0 && (
          <Button
            onClick={clearHistory}
            variant="outline"
            size="sm"
            className="text-red-500 border-red-200 hover:bg-red-500/10 dark:border-red-900"
          >
            Limpar Tudo
          </Button>
        )}
      </div>

      {history.map((record) => (
        <Card key={record.id} className="p-4 bg-card text-card-foreground shadow-md border border-border rounded-lg">
          <div
            onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
            className="cursor-pointer flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-1 bg-primary/20 text-primary rounded">
                  {getLanguageName(record.language)}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(record.timestamp)}</span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{record.correctedText}</p>
            </div>
            <button className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0">
              {expandedId === record.id ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>

          {expandedId === record.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Texto Original:</h4>
                <p className="text-sm text-foreground bg-muted p-3 rounded max-h-24 overflow-y-auto">
                  {record.originalText}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Texto Corrigido:</h4>
                <p className="text-sm text-foreground bg-green-500/10 p-3 rounded max-h-24 overflow-y-auto">
                  {record.correctedText}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(record.correctedText, record.id)}
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {copiedId === record.id ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => deleteRecord(record.id)}
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-500/10 dark:border-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
