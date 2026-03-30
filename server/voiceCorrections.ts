import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

/**
 * Aplica correções ditadas por voz ao texto já corrigido
 * O usuário dita as mudanças necessárias e o LLM as aplica ao texto
 */
export async function applyVoiceCorrections(
  correctedText: string,
  voiceCorrections: string,
  language: string = "pt"
): Promise<string> {
  if (!voiceCorrections.trim()) {
    return correctedText;
  }
  
  if (!process.env.GROQ_API_KEY) {
    return correctedText + "\n\n[Sem API Key: Correção de voz ignorada. As instruções foram: " + voiceCorrections + "]";
  }

  const systemPrompt =
    language === "pt"
      ? `Você é um assistente especializado em aplicar correções de texto ditadas por voz. 
Sua tarefa é:
1. Entender as correções ditadas pelo usuário (podem estar com erros de transcrição)
2. Aplicar essas correções ao texto fornecido
3. Manter a formatação de parágrafos
4. Preservar o contexto e significado original
5. Retornar apenas o texto corrigido, sem explicações

Regras importantes:
- Se o usuário dita "mudar X por Y", substitua X por Y no texto
- Se o usuário dita "remover X", remova X do texto
- Se o usuário dita "adicionar X em Y", adicione X perto de Y
- Mantenha a pontuação e parágrafos corretos
- Não altere partes do texto que não foram mencionadas nas correções`
      : language === "en"
        ? `You are a specialist assistant in applying voice-dictated text corrections.
Your task is to:
1. Understand the corrections dictated by the user (may have transcription errors)
2. Apply these corrections to the provided text
3. Maintain paragraph formatting
4. Preserve original context and meaning
5. Return only the corrected text, without explanations

Important rules:
- If the user says "change X to Y", replace X with Y in the text
- If the user says "remove X", remove X from the text
- If the user says "add X near Y", add X near Y
- Keep correct punctuation and paragraphs
- Do not change parts of the text that were not mentioned in the corrections`
        : `Eres un asistente especializado en aplicar correcciones de texto dictadas por voz.
Tu tarea es:
1. Entender las correcciones dictadas por el usuario (pueden tener errores de transcripción)
2. Aplicar estas correcciones al texto proporcionado
3. Mantener el formato de párrafos
4. Preservar el contexto y significado original
5. Devolver solo el texto corregido, sin explicaciones

Reglas importantes:
- Si el usuario dice "cambiar X por Y", reemplaza X por Y en el texto
- Si el usuario dice "eliminar X", elimina X del texto
- Si el usuario dice "agregar X cerca de Y", agrega X cerca de Y
- Mantén la puntuación y los párrafos correctos
- No cambies partes del texto que no fueron mencionadas en las correcciones`;

  const userPrompt =
    language === "pt"
      ? `Texto atual:\n\n${correctedText}\n\nCorreções ditadas:\n${voiceCorrections}\n\nAplique as correções acima ao texto e retorne apenas o texto corrigido.`
      : language === "en"
        ? `Current text:\n\n${correctedText}\n\nDictated corrections:\n${voiceCorrections}\n\nApply the above corrections to the text and return only the corrected text.`
        : `Texto actual:\n\n${correctedText}\n\nCorrecciones dictadas:\n${voiceCorrections}\n\nAplica las correcciones anteriores al texto y devuelve solo el texto corregido.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile", // Modelo poderoso para interpretar intenções
      temperature: 0.1,
    });

    const content = chatCompletion.choices[0]?.message?.content;
    const finalText = typeof content === "string" ? content : correctedText;

    return finalText.trim();
  } catch (error) {
    console.error("Erro na correção por voz com Llama 3:", error);
    return correctedText; // Fallback
  }
}
