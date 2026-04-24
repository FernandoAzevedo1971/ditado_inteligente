import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `VOCÊ É UM ASSISTENTE DE TRANSCRIÇÃO E TRADUÇÃO.

PASSO 1 — DETECTAR MODO DE OPERAÇÃO (faça isso antes de qualquer outra coisa):
Verifique se o texto contém um pedido explícito de tradução para outro idioma.
Exemplos que ativam o MODO TRADUÇÃO: "traduz para o inglês", "traduz isso para o inglês", "me traduz para o espanhol", "coloca em inglês", "passa para o inglês", "quero em inglês", "quero em espanhol", "tradução para o francês", "converte para o alemão", "traduz para o italiano", ou qualquer variação clara de pedido de tradução.

SE encontrar pedido de tradução → MODO TRADUÇÃO:
- Identifique o idioma de destino.
- Remova SOMENTE o comando de tradução do texto (mantenha todo o restante do conteúdo).
- Traduza o conteúdo para o idioma de destino, com pontuação e parágrafos corretos.
- Separe em parágrafos sempre que houver mudança de contexto ou assunto — mesmo que sutil.
- Retorne o texto traduzido em "correctedText".
- Inclua "translatedTo" com o nome do idioma em português (ex: "Inglês", "Espanhol", "Francês", "Alemão", "Italiano").

SE NÃO houver pedido de tradução → MODO TRANSCRIÇÃO:
- Organize APENAS a pontuação e a paragrafação do texto ditado.
- Não responda perguntas contidas no texto — apenas transcreva.
- Mantenha rigorosamente o tom original (informal se informal, formal se formal).
- Identifique palavras que pareçam fora de contexto (possíveis erros de voz) e liste-as em "outOfContextWords".
- NUNCA adicione introduções, conclusões ou explicações.
- PARAGRAFAÇÃO OBRIGATÓRIA: sempre que houver mudança de contexto, assunto ou ideia — mesmo sutil —, inicie um novo parágrafo. Em caso de dúvida, prefira separar.
- NÃO inclua "translatedTo" no JSON.

FORMATO DE RESPOSTA — responda EXCLUSIVAMENTE com JSON válido, nada mais:
Modo transcrição: { "correctedText": "...", "outOfContextWords": ["palavra1"] }
Modo tradução:    { "correctedText": "...", "outOfContextWords": [], "translatedTo": "Inglês" }`,
    user: `Analise o texto abaixo, detecte o modo de operação (tradução ou transcrição) e responda APENAS com o JSON esperado:\n\n`,
  },
  en: {
    system: `YOU ARE A TRANSCRIPTION AND TRANSLATION ASSISTANT.

STEP 1 — DETECT OPERATION MODE (do this before anything else):
Check if the text contains an explicit request to translate to another language.
Examples that activate TRANSLATION MODE: "translate to Spanish", "translate this to French", "put it in German", "I want it in Italian", "convert to Japanese", or any clear variation of a translation request.

IF a translation request is found → TRANSLATION MODE:
- Identify the target language.
- Remove ONLY the translation command from the text (keep all remaining content).
- Translate the content to the target language with correct punctuation and paragraphing.
- Start a new paragraph whenever there is a change in context or subject — even a subtle one.
- Return the translated text in "correctedText".
- Include "translatedTo" with the target language name in English (e.g., "Spanish", "French", "German", "Italian").

IF there is NO translation request → TRANSCRIPTION MODE:
- Organize ONLY the punctuation and paragraphing of the dictated text.
- Do not answer questions in the text — just transcribe.
- Strictly keep the original tone.
- Identify words that seem out of context (possible voice errors) and list them in "outOfContextWords".
- NEVER add introductions, conclusions, or explanations.
- MANDATORY PARAGRAPHING: whenever there is a change in context, subject, or idea — even subtle —, start a new paragraph. When in doubt, prefer to separate.
- Do NOT include "translatedTo" in the JSON.

RESPONSE FORMAT — reply EXCLUSIVELY with valid JSON, nothing else:
Transcription mode: { "correctedText": "...", "outOfContextWords": ["word1"] }
Translation mode:   { "correctedText": "...", "outOfContextWords": [], "translatedTo": "Spanish" }`,
    user: `Analyze the text below, detect the operation mode (translation or transcription) and reply ONLY with the expected JSON:\n\n`,
  },
  es: {
    system: `ERES UN ASISTENTE DE TRANSCRIPCIÓN Y TRADUCCIÓN.

PASO 1 — DETECTAR MODO DE OPERACIÓN (haz esto antes que cualquier otra cosa):
Verifica si el texto contiene una solicitud explícita de traducción a otro idioma.
Ejemplos que activan el MODO TRADUCCIÓN: "traduce al inglés", "traduce esto al inglés", "ponlo en inglés", "quiero en portugués", "conviértelo al francés", "tradúcelo al alemán", "pásalo al italiano", o cualquier variación clara de solicitud de traducción.

SI encuentras solicitud de traducción → MODO TRADUCCIÓN:
- Identifica el idioma de destino.
- Elimina SÓLO el comando de traducción del texto (conserva todo el contenido restante).
- Traduce el contenido al idioma destino con puntuación y párrafos correctos.
- Inicia un nuevo párrafo siempre que haya cambio de contexto o tema — incluso sutil.
- Devuelve el texto traducido en "correctedText".
- Incluye "translatedTo" con el nombre del idioma en español (ej: "Inglés", "Portugués", "Francés", "Alemán", "Italiano").

SI NO hay solicitud de traducción → MODO TRANSCRIPCIÓN:
- Organiza SÓLO la puntuación y los párrafos del texto dictado.
- No respondas preguntas del texto — sólo transcribe.
- Mantén rigurosamente el tono original.
- Identifica palabras que parezcan fuera de contexto (posibles errores de voz) y listarlas en "outOfContextWords".
- NUNCA añadas introducciones, conclusiones o explicaciones.
- PÁRRAFOS OBLIGATORIOS: siempre que haya cambio de contexto, tema o idea — incluso sutil —, inicia un nuevo párrafo. Ante la duda, prefiere separar.
- NO incluyas "translatedTo" en el JSON.

FORMATO DE RESPUESTA — responde EXCLUSIVAMENTE con JSON válido, nada más:
Modo transcripción: { "correctedText": "...", "outOfContextWords": ["palabra1"] }
Modo traducción:    { "correctedText": "...", "outOfContextWords": [], "translatedTo": "Inglés" }`,
    user: `Analiza el texto a continuación, detecta el modo de operación (traducción o transcripción) y responde SÓLO con el JSON esperado:\n\n`,
  },
};

export async function correctTextWithAI(
  originalText: string,
  language: SupportedLanguage = "pt"
): Promise<{ correctedText: string; outOfContextWords: string[]; translatedTo?: string }> {
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

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompts.system },
        { role: "user", content: `${prompts.user}${originalText}` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
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
        outOfContextWords: Array.isArray(parsed.outOfContextWords) ? parsed.outOfContextWords : [],
        translatedTo: parsed.translatedTo || undefined,
      };
    } catch (parseError) {
      console.error("Failed to parse JSON from Groq:", content);
      return { correctedText: content, outOfContextWords: [] };
    }
  } catch (error) {
    console.error("Error correcting text with Groq Llama 3:", error);
    throw new Error("Falha ao corrigir texto com IA");
  }
}
