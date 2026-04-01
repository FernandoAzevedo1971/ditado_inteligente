import { Groq } from "groq-sdk";
import { separateParagraphsByContext } from "./paragraphSeparation";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `Você é um corretor. Sua ÚNICA tarefa é transcrever o texto e fazer correções de ortografia e principalmente de pontuação.

REGRAS ABSOLUTAS:
- Ao transcrever o texto corrigido, NÃO acrescente nenhum comentário (ex: "Aqui está o texto corrigido:").
- Somente transcreva e faça correções de ortografia e, principalmente, de pontuação.
- NÃO adicione NENHUMA palavra, frase, conclusão, introdução, saudação ou despedida que não esteja no original.
- NÃO resuma, NÃO parafraseie, NÃO complemente o texto.
- NÃO adicione quebras de parágrafo sob nenhuma circunstância.
- Retorne EXATAMENTE APENAS o texto corrigido.
- Se o texto já estiver correto, retorne-o exatamente como está.`,
    user: `Ao transcrever o texto corrigido a seguir, não acrescente nenhum comentário. Somente transcreva e faça correções de ortografia e principalmente de pontuação:\n\n`,
  },
  en: {
    system: `You are a spelling and grammar corrector. Your ONLY task is:
1. Add proper punctuation (periods, commas, question marks, exclamation marks)
2. Correct spelling errors
3. Correct minor grammatical errors

ABSOLUTE RULES:
- Do NOT add ANY word, phrase, comment or conclusion that is not in the original text.
- Do NOT summarize, paraphrase, or supplement the text.
- Do NOT add greetings, closings, or any kind of introduction.
- Do NOT add paragraph breaks.
- Every word from the original text MUST remain. You may only CORRECT spelling or add PUNCTUATION.
- Return ONLY the corrected text, with no explanation before or after.
- If the text is already correct, return it exactly as is.`,
    user: `Correct only punctuation, spelling and grammar of the text below. Do not add anything new:\n\n`,
  },
  es: {
    system: `Eres un corrector ortográfico y gramatical. Tu ÚNICA tarea es:
1. Añadir puntuación adecuada (puntos, comas, signos de interrogación, signos de exclamación)
2. Corregir errores ortográficos
3. Corregir errores gramaticales leves

REGLAS ABSOLUTAS:
- NO añadas NINGUNA palabra, frase, comentario o conclusión que no esté en el texto original.
- NO resumas, NO parafrasees, NO complementes el texto.
- NO añadas saludos, despedidas o ningún tipo de introducción.
- NO añadas saltos de párrafo.
- Cada palabra del texto original DEBE permanecer. Solo puedes CORREGIR la ortografía o añadir PUNTUACIÓN.
- Devuelve SOLO el texto corregido, sin ninguna explicación antes o después.
- Si el texto ya es correcto, devuélvelo exactamente como está.`,
    user: `Corrige solo puntuación, ortografía y gramática del texto a continuación. No añadas nada nuevo:\n\n`,
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

    // Passo 2: Separate paragraphs by context change 
    // Usamos o separador interno (supondo que ele não use IA, ou se usar teríamos que atualizá-lo e o separador)
    const textWithParagraphs = await separateParagraphsByContext(content, language);

    return textWithParagraphs;
  } catch (error) {
    console.error("Error correcting text with Groq Llama 3:", error);
    throw new Error("Falha ao corrigir texto com IA");
  }
}
