import { Groq } from "groq-sdk";
import { separateParagraphsByContext } from "./paragraphSeparation";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `Você é um corretor gramatical estrito. Sua ÚNICA tarefa é corrigir ortografia e, principalmente, pontuação.

REGRAS ABSOLUTAS:
- Mantenha EXATAMENTE as mesmas palavras do original, na mesma ordem.
- NÃO substitua palavras por sinônimos, nem melhore o estilo.
- NÃO adicione NENHUM comentário, introdução ou observação (ex: "Aqui está o texto:").
- NÃO resuma, não parafraseie e não complemente o texto.
- NÃO adicione quebras de parágrafo.
- Retorne EXATAMENTE APENAS o texto corrigido.
- Se o texto já estiver correto, retorne-o identicamente.`,
    user: `Corrija apenas a pontuação, ortografia e gramática do texto abaixo, mantendo as palavras originais:\n\n`,
  },
  en: {
    system: `You are a strict grammar corrector. Your ONLY task is to correct spelling, punctuation and grammar.

ABSOLUTE RULES:
- Keep EXACTLY the same words from the original, in the same order.
- Do NOT replace words with synonyms or "improve" the style.
- Do NOT add ANY comment, intro or feedback (e.g. "Here is the text:").
- Do NOT summarize, paraphrase, or supplement the text.
- Do NOT add paragraph breaks.
- Return ONLY the corrected text.
- If the text is already correct, return it identically.`,
    user: `Correct only punctuation, spelling and grammar of the text below, keeping original words:\n\n`,
  },
  es: {
    system: `Eres um corrector gramatical estricto. Tu ÚNICA tarea es corregir ortografía, puntuación y gramática.

REGLAS ABSOLUTAS:
- Mantén EXACTAMENTE as mismas palabras del original, en el mismo orden.
- NO substituyas palabras por sinónimos, ni "mejoras" el estilo.
- NO añadas NINGÚN comentario, introducción u observación (ex: "Aquí está el texto:").
- NO resumas, no parafrasees y no complementes el texto.
- NO añadas saltos de párrafo.
- Devuelve EXACTAMENTE SÓLO el texto corregido.
- Si el texto ya es correcto, devuélvelo identicamente.`,
    user: `Corrige sólo la puntuación, ortografía y gramática del texto a continuación, manteniendo las palabras originales:\n\n`,
  },
};

export async function correctTextWithAI(originalText: string, language: SupportedLanguage = "pt"): Promise<string> {
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.GROQ_API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => resolve(`${originalText}\n\n[SIMULAÇÃO] Configure sua GROQ_API_KEY no arquivo .env para que o cérebro do Llama 3 corrija o que eu acabei de falar com inteligência artificial.\n\nAbaixo um exemplo do formato esperado, mas a correção de IA depende da sua Chave Secreta.`), 1500);
    });
  }

  try {
    const prompts = CORRECTION_PROMPTS[language];

    // Passo 1: Chama a API do Llama 3 v70b no Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: `${prompts.user}${originalText}` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // Temperatura baixa para garantir que siga regras de não adicionar enrolação ao final
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Llama 3 devolveu uma resposta vazia.");
    }

    // Passo 2: Retornamos o texto corrigido diretamente para evitar interpretações de contexto indesejadas
    return content;
  } catch (error) {
    console.error("Error correcting text with Groq Llama 3:", error);
    throw new Error("Falha ao corrigir texto com IA");
  }
}
