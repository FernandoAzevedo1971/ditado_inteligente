import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useSystemTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Detectar preferência do sistema
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    // Função para atualizar tema
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      setTheme(e.matches ? "dark" : "light");
    };

    // Definir tema inicial
    setTheme(mediaQuery.matches ? "dark" : "light");
    setIsInitialized(true);

    // Escutar mudanças de preferência
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  return { theme, isInitialized };
}
