import { useLanguage, SUPPORTED_LANGUAGES } from "@/hooks/useLanguage";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  // Remover tema escuro - manter apenas fundo claro

  return (
    <div className="flex items-center gap-2 rounded-md p-2 shadow-sm border bg-white border-slate-200">
      <Globe className="w-5 h-5 flex-shrink-0 text-slate-600" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as "pt" | "en" | "es")}
        className="bg-transparent border-none outline-none font-medium text-sm cursor-pointer text-slate-900"
      >
        {Object.entries(supportedLanguages).map(([code, config]) => (
          <option key={code} value={code}>
            {config.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
