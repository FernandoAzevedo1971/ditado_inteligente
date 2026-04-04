import { Mistral } from "@mistralai/mistralai";
import fs from "fs";
import { SupportedLanguage } from "./transcription";

// Instancia o cliente Mistral usando a chave nas variáveis de ambiente
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || "dummy" });

const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  pt: "pt",
  en: "en",
  es: "es",
};

export async function transcribeWithMistral(
  filePath: string,
  language: SupportedLanguage = "pt"
): Promise<string> {
  console.log(`[Voxtral] Iniciando transcrição Mistral. Idioma: ${language}`);

  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY === "dummy") {
    console.warn("[Voxtral] MISTRAL_API_KEY não encontrada. Usando mock.");
    return "Esta é uma transcrição simulada pelo Mistral Voxtral (Modo Mock). Por favor, configure sua MISTRAL_API_KEY no ambiente.";
  }

  try {
    const audioContent = fs.readFileSync(filePath);
    
    // Voxtral Mini Transcribe v2
    const result = await mistral.audio.transcriptions.complete({
      model: "voxtral-mini-latest",
      file: {
        fileName: "audio.webm",
        content: audioContent,
      },
      language: LANGUAGE_MAP[language],
    });

    console.log(`[Voxtral] Sucesso! Texto transcrito: "${result.text.substring(0, 50)}..."`);
    return result.text;
  } catch (error: any) {
    console.error("[Voxtral] Erro transcrevendo áudio com Mistral Voxtral:", error.message);
    throw new Error(`Falha no Voxtral: ${error.message}`);
  }
}
