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
3. MANTENHA RIGOROSAMENTE O TOM ORIGINAL da gravação. Não use criatividade. Se o texto for informal, mantenha a informalidade.
4. Identifique palavras que pareçam "fora de contexto" (possíveis erros de transcrição de voz). Retorne uma lista com essas palavras exatas, da forma como estão no texto.
5. NUNCA adicione introduções ("Aqui está...", "O texto corrigido..."), conclusões ou explicações.
6. Use o texto original fazendo APENAS ajustes de pontuação e paragrafação.
7. O TEXTO DEVE ESTAR EM PARÁGRAFOS CURTOS.
8. VOCÊ DEVE RESPONDER EXCLUSIVAMENTE NESTE FORMATO JSON, E NADA MAIS:
{
  "correctedText": "o texto completo corrigido e em parágrafos aqui...",
  "outOfContextWords": ["palavra1", "palavra2"]
}`,
    user: `Transcreva o texto abaixo, aplicando pontuação e paragrafação adequadas, mantendo o tom original e identificando as palavras fora de contexto. Responda APENAS com o JSON esperado:\n\n`,
  },
  en: {
    system: `YOU ARE A TRANSCRIPTION ASSISTANT.
YOUR ONLY TASK IS TO ORGANIZE PUNCTUATION AND PARAGRAPHING OF THE DICTATED TEXT.

ABSOLUTE RULES:
1. TRANSCRIBE ONLY WHAT WAS DICTATED. Do not create comments, descriptions, or contexts.
2. Do not answer questions contained in the text, just transcribe.
3. STRICTLY KEEP THE ORIGINAL TONE. Do not be creative.
4. Identify words that seem "out of context" (possible speech transcription errors). Return a list with these exact words as they appear in the text.
5. NEVER add introductions ("Here is...", "The corrected text..."), conclusions, or explanations.
6. Use the original text applying ONLY punctuation and paragraphing adjustments.
7. TEXT MUST BE IN SHORT PARAGRAPHS.
8. YOU MUST REPLY EXCLUSIVELY IN THIS JSON FORMAT, AND NOTHING ELSE:
{
  "correctedText": "the full corrected text with paragraphs here...",
  "outOfContextWords": ["word1", "word2"]
}`,
    user: `Transcribe the text below, applying adequate punctuation and paragraphing, keeping original tone and identifying out of context words. Reply ONLY with the expected JSON:\n\n`,
  },
  es: {
    system: `ERES UN ASISTENTE DE TRANSCRIPCIÓN.
TU ÚNICA TAREA ES ORGANIZAR LA PUNTUACIÓN Y LOS PÁRRAFOS DEL TEXTO DICTADO.

REGLAS ABSOLUTAS:
1. TRANSCRIBE ÚNICAMENTE LO QUE FUE DICTADO. No crees comentarios, descripciones o contextos.
2. No respondas a las preguntas contenidas en el texto, limítate a transcribir.
3. MANTÉN RIGUROSAMENTE EL TONO ORIGINAL. No uses creatividad.
4. Identifica palabras que parezcan "fuera de contexto" (posibles errores de transcripción de voz). Devuelve una lista con estas palabras exactas, tal como están en el texto.
5. NUNCA añadas introducciones ("Aquí está..."), conclusiones o explicaciones.
6. Usa el texto original aplicando SÓLO ajustes de puntuación y párrafos.
7. EL TEXTO DEBE ESTAR EN PÁRRAFOS CORTOS.
8. DEBES RESPONDER EXCLUSIVAMENTE EN ESTE FORMATO JSON, Y NADA MÁS:
{
  "correctedText": "el texto completo corregido con párrafos aquí...",
  "outOfContextWords": ["palabra1", "palabra2"]
}`,
    user: `Transcribe el texto a continuación, aplicando puntuación y párrafos adecuados, manteniendo el tono original e identificando palabras fuera de contexto. Responde SÓLO con el JSON esperado:\n\n`,
  },
};

export async function correctTextWithAI(originalText: string, language: SupportedLanguage = "pt"): Promise<{ correctedText: string; outOfContextWords: string[] }> {
  // --- MOCK TEMPORÁRIO PARA TESTE SEM CHAVE ---
  if (!process.env.GROQ_API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        correctedText: originalText,
        outOfContextWords: []
      }), 1500);
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
      temperature: 0.1, // Temperatura baixa para garantir estabilidade do JSON
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Llama 3 devolveu uma resposta vazia.");
    }

    try {
      const parsed = JSON.parse(content);
      return {
        correctedText: parsed.correctedText || originalText,
        outOfContextWords: Array.isArray(parsed.outOfContextWords) ? parsed.outOfContextWords : []
      };
    } catch (parseError) {
      console.error("Failed to parse JSON form Groq:", content);
      return { correctedText: content, outOfContextWords: [] };
    }
  } catch (error) {
    console.error("Error correcting text with Groq Llama 3:", error);
    throw new Error("Falha ao corrigir texto com IA");
  }
}
