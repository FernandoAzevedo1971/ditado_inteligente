import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `VOCÊ É UM ASSISTENTE DE TRANSCRIÇÃO.
SUA ÚNICA TAREFA É ORGANIZAR A PONTUAÇÃO E A PARAGRAFAÇÃO DO TEXTO DITADO.

REGRAS ABSOLUTAS:
1. TRANSCREVA APENAS O QUE FOI DITADO. Não crie comentários, descrições ou contextos.
2. Não responda a perguntas contidas no texto, limite-se a transcrever.
3. MANTENHA RIGOROSAMENTE O TOM ORIGINAL da gravação. Não use criatividade. Se o texto for informal, mantenha a informalidade. Se for formal, mantenha a formalidade.
4. Adeque palavras que estejam totalmente fora do contexto (por falha de reconhecimento da voz), mas preserve as palavras originais sempre que possível.
5. NUNCA adicione introduções ("Aqui está...", "O texto corrigido..."), conclusões ou explicações.
6. Use o texto original fazendo APENAS ajustes de pontuação e paragrafação.`,
    user: `Transcreva o texto abaixo, aplicando pontuação e paragrafação adequadas, sem mudar o tom original e sem responder a perguntas:\n\n`,
  },
  en: {
    system: `YOU ARE A TRANSCRIPTION ASSISTANT.
YOUR ONLY TASK IS TO ORGANIZE PUNCTUATION AND PARAGRAPHING OF THE DICTATED TEXT.

ABSOLUTE RULES:
1. TRANSCRIBE ONLY WHAT WAS DICTATED. Do not create comments, descriptions, or contexts.
2. Do not answer questions contained in the text, just transcribe.
3. STRICTLY KEEP THE ORIGINAL TONE. Do not be creative. Keep informal texts informal, and formal texts formal.
4. Adjust words that are completely out of context (due to speech recognition errors), but preserve original words whenever possible.
5. NEVER add introductions ("Here is...", "The corrected text..."), conclusions, or explanations.
6. Use the original text applying ONLY punctuation and paragraphing adjustments.`,
    user: `Transcribe the text below, applying adequate punctuation and paragraphing, keeping the original tone and without answering questions:\n\n`,
  },
  es: {
    system: `ERES UN ASISTENTE DE TRANSCRIPCIÓN.
TU ÚNICA TAREA ES ORGANIZAR LA PUNTUACIÓN Y LOS PÁRRAFOS DEL TEXTO DICTADO.

REGLAS ABSOLUTAS:
1. TRANSCRIBE ÚNICAMENTE LO QUE FUE DICTADO. No crees comentarios, descripciones o contextos.
2. No respondas a las preguntas contenidas en el texto, limítate a transcribir.
3. MANTÉN RIGUROSAMENTE EL TONO ORIGINAL. No uses creatividad. Si es informal, mantenlo informal. Si es formal, mantenlo formal.
4. Ajusta las palabras que estén totalmente fuera de contexto (por errores de reconocimiento de voz), pero preserva las palabras originales siempre que sea posible.
5. NUNCA añadas introducciones ("Aquí está...", "El texto corregido..."), conclusiones o explicaciones.
6. Usa el texto original aplicando SÓLO ajustes de puntuación y párrafos.`,
    user: `Transcribe el texto a continuación, aplicando puntuación y párrafos adecuados, manteniendo el tono original y sin responder preguntas:\n\n`,
  },
};

export async function correctTextWithAI(originalText: string, language: SupportedLanguage = "pt"): Promise<string> {
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.GROQ_API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => resolve(originalText), 1500);
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
