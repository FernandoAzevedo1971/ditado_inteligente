import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export type SupportedLanguage = "pt" | "en" | "es";

const CORRECTION_PROMPTS: Record<SupportedLanguage, { system: string; user: string }> = {
  pt: {
    system: `VOCÊ É UM ASSISTENTE DE TRANSCRIÇÃO.
SUA ÚNICA TAREFA É ORGANIZAR A PONTUAÇÃO E A PARAGRAFAÇÃO DO TEXTO DITADO, OU TRADUZIR QUANDO SOLICITADO.

REGRAS ABSOLUTAS:
1. TRANSCREVA APENAS O QUE FOI DITADO. Não crie comentários, descrições ou contextos.
2. Não responda a perguntas contidas no texto, limite-se a transcrever.
3. MANTENHA RIGOROSAMENTE O TOM ORIGINAL da gravação. Não use criatividade. Se o texto for informal, mantenha a informalidade.
4. Identifique palavras que pareçam "fora de contexto" (possíveis erros de transcrição de voz). Retorne uma lista com essas palavras exatas, da forma como estão no texto.
5. NUNCA adicione introduções ("Aqui está...", "O texto corrigido..."), conclusões ou explicações.
6. Use o texto original fazendo APENAS ajustes de pontuação e paragrafação.
7. PARAGRAFAÇÃO OBRIGATÓRIA POR CONTEXTO: separe obrigatoriamente em parágrafos distintos sempre que houver mudança de assunto, contexto ou ideia — mesmo que sutil. Cada mudança de tema deve gerar um parágrafo separado. Parágrafos devem ser curtos. Em caso de dúvida, prefira separar.
8. TRADUÇÃO EXPLÍCITA POR VOZ: Se o texto ditado contiver um pedido explícito de tradução (ex: "traduz para o inglês", "tradução para espanhol", "traduz isso para o francês", "me traduz para o alemão"), você deve:
   a) Identificar o idioma de destino solicitado.
   b) Remover o comando de tradução do texto.
   c) Traduzir o conteúdo restante para o idioma solicitado, aplicando pontuação e paragrafação corretas.
   d) Retornar o texto traduzido em "correctedText".
   e) Incluir o campo "translatedTo" com o nome do idioma de destino em português (ex: "Inglês", "Espanhol", "Francês", "Alemão").
   Se NÃO houver pedido de tradução, omita completamente o campo "translatedTo".
9. VOCÊ DEVE RESPONDER EXCLUSIVAMENTE NESTE FORMATO JSON, E NADA MAIS:
{
  "correctedText": "o texto completo corrigido/traduzido aqui...",
  "outOfContextWords": ["palavra1", "palavra2"],
  "translatedTo": "Inglês"
}`,
    user: `Transcreva o texto abaixo, aplicando pontuação e paragrafação adequadas. ATENÇÃO ESPECIAL À PARAGRAFAÇÃO: sempre que o contexto ou assunto mudar — mesmo que sutilmente —, inicie um novo parágrafo. Mantenha o tom original, identifique palavras fora de contexto, e traduza caso seja solicitado explicitamente. Responda APENAS com o JSON esperado:\n\n`,
  },
  en: {
    system: `YOU ARE A TRANSCRIPTION ASSISTANT.
YOUR ONLY TASK IS TO ORGANIZE PUNCTUATION AND PARAGRAPHING OF THE DICTATED TEXT, OR TRANSLATE WHEN REQUESTED.

ABSOLUTE RULES:
1. TRANSCRIBE ONLY WHAT WAS DICTATED. Do not create comments, descriptions, or contexts.
2. Do not answer questions contained in the text, just transcribe.
3. STRICTLY KEEP THE ORIGINAL TONE. Do not be creative.
4. Identify words that seem "out of context" (possible speech transcription errors). Return a list with these exact words as they appear in the text.
5. NEVER add introductions ("Here is...", "The corrected text..."), conclusions, or explanations.
6. Use the original text applying ONLY punctuation and paragraphing adjustments.
7. MANDATORY CONTEXT-BASED PARAGRAPHS: always start a new paragraph whenever the subject, context, or idea changes — even subtly. Every shift in topic must produce a separate paragraph. Paragraphs must be short. When in doubt, prefer to separate.
8. EXPLICIT VOICE TRANSLATION: If the dictated text contains an explicit translation request (e.g., "translate this to Portuguese", "translate to Spanish", "translate it to French"), you must:
   a) Identify the target language.
   b) Remove the translation command from the text.
   c) Translate the remaining content to the requested language, applying correct punctuation and paragraphing.
   d) Return the translated text in "correctedText".
   e) Include the "translatedTo" field with the target language name in English (e.g., "Portuguese", "Spanish", "French").
   If there is NO translation request, omit the "translatedTo" field entirely.
9. YOU MUST REPLY EXCLUSIVELY IN THIS JSON FORMAT, AND NOTHING ELSE:
{
  "correctedText": "the full corrected/translated text here...",
  "outOfContextWords": ["word1", "word2"],
  "translatedTo": "Portuguese"
}`,
    user: `Transcribe the text below, applying adequate punctuation and paragraphing. SPECIAL ATTENTION TO PARAGRAPHING: whenever the context or subject changes — even subtly — start a new paragraph. Keep the original tone, identify out of context words, and translate if explicitly requested. Reply ONLY with the expected JSON:\n\n`,
  },
  es: {
    system: `ERES UN ASISTENTE DE TRANSCRIPCIÓN.
TU ÚNICA TAREA ES ORGANIZAR LA PUNTUACIÓN Y LOS PÁRRAFOS DEL TEXTO DICTADO, O TRADUCIR CUANDO SE SOLICITE.

REGLAS ABSOLUTAS:
1. TRANSCRIBE ÚNICAMENTE LO QUE FUE DICTADO. No crees comentarios, descripciones o contextos.
2. No respondas a las preguntas contenidas en el texto, limítate a transcribir.
3. MANTÉN RIGUROSAMENTE EL TONO ORIGINAL. No uses creatividad.
4. Identifica palabras que parezcan "fuera de contexto" (posibles errores de transcripción de voz). Devuelve una lista con estas palabras exactas, tal como están en el texto.
5. NUNCA añadas introducciones ("Aquí está..."), conclusiones o explicaciones.
6. Usa el texto original aplicando SÓLO ajustes de puntuación y párrafos.
7. PÁRRAFOS OBLIGATORIOS POR CONTEXTO: inicia siempre un nuevo párrafo cuando haya un cambio de tema, contexto o idea — incluso sutil. Cada cambio de tema debe generar un párrafo separado. Los párrafos deben ser cortos. Ante la duda, prefiere separar.
8. TRADUCCIÓN EXPLÍCITA POR VOZ: Si el texto dictado contiene una solicitud explícita de traducción (ej: "traduce esto al inglés", "traducción al portugués", "tradúcelo al francés"), debes:
   a) Identificar el idioma de destino solicitado.
   b) Eliminar el comando de traducción del texto.
   c) Traducir el contenido restante al idioma solicitado, aplicando puntuación y párrafos correctos.
   d) Devolver el texto traducido en "correctedText".
   e) Incluir el campo "translatedTo" con el nombre del idioma de destino en español (ej: "Inglés", "Portugués", "Francés").
   Si NO hay solicitud de traducción, omite completamente el campo "translatedTo".
9. DEBES RESPONDER EXCLUSIVAMENTE EN ESTE FORMATO JSON, Y NADA MÁS:
{
  "correctedText": "el texto completo corregido/traducido aquí...",
  "outOfContextWords": ["palabra1", "palabra2"],
  "translatedTo": "Inglés"
}`,
    user: `Transcribe el texto a continuación, aplicando puntuación y párrafos adecuados. ATENCIÓN ESPECIAL A LOS PÁRRAFOS: siempre que el contexto o el tema cambie — aunque sea sutilmente —, inicia un nuevo párrafo. Mantén el tono original, identifica palabras fuera de contexto, y traduce si se solicita explícitamente. Responde SÓLO con el JSON esperado:\n\n`,
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
      temperature: 0.1,
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
