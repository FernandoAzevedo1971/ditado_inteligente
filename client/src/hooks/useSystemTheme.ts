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
      const newTheme = e.matches ? "dark" : "light";
      setTheme(newTheme);
      
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      if (newTheme === "light") {
        root.classList.add("light");
      }
    };

    // Definir tema inicial
    updateTheme(mediaQuery);
    setIsInitialized(true);

    // Escutar mudanças de preferência
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  return { theme, isInitialized };
}
