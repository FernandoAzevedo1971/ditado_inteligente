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
      ? `Você é um assistente de elite para reestruturação e correção de texto clínico e profissional.
Sua tarefa é:
1. Aplicar as correções específicas que o usuário solicitou por voz.
2. Garantir que o texto esteja ESTRITAMENTE em Português.
3. ESTRUTURAÇÃO PROFISSIONAL: Reorganize o texto em parágrafos (\n\n) sempre que houver mudança de tópico ou contexto. Use parágrafo único apenas se o texto for curto ou tiver contexto indivisível.
4. Identifique pontos de conclusão de raciocínio para iniciar novos parágrafos.
5. Ajuste a pontuação de todo o texto para garantir fluidez e clareza profissional.
6. NÃO adicionar nenhum comentário, saudação ou explicação.
7. Retornar APENAS o texto resultante estruturado.

Regras:
- Se o usuário diz "mudar X por Y", substitua X por Y.
- Se o usuário diz "remover X", remova X.
- Aplique quebras de parágrafo (\n\n) para separar assuntos ou seções diferentes sempre que apropriado.
- O texto final deve ser limpo, profissional e bem formatado, mesmo que a correção solicitada seja pequena.`
      : language === "en"
        ? `You are a strict assistant for applying voice-dictated text corrections.
Your task is to:
1. Apply EXACTLY the corrections the user requested.
2. Do NOT change any other part of the text not mentioned.
3. Do NOT add any comment, greeting, or explanation.
4. Return ONLY the resulting text.

Rules:
- If the user says "change X to Y", replace X with Y.
- If the user says "remove X", remove X.
- Maintain original punctuation and paragraphs in untouched parts.
- If there are no clear instructions, return the original text unchanged.`
        : `Eres un asistente estricto para aplicar correcciones de texto dictadas por voz.
Tu tarea es:
1. Aplicar EXACTAMENTE las correcciones que el usuario solicitó.
2. NO cambiar ninguna otra parte del texto que no fue mencionada.
3. NO añadir ningún comentario, saludo o explicación.
4. Devolver SÓLO el texto resultante.

Reglas:
- Si el usuario dice "cambiar X por Y", reemplaza X por Y.
- Si el usuario dice "eliminar X", elimina X.
- Mantén la puntuación y los párrafos originales en las partes no alteradas.
- Si no hay instrucciones claras, devuelve el texto original sin cambios.`;

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
