import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { transcribeAudioFile, type SupportedLanguage } from "./transcription";
import { correctTextWithAI, type SupportedLanguage as CorrectionLanguage } from "./textCorrection";
import { applyVoiceCorrections } from "./voiceCorrections";

const LANGUAGE_ENUM = z.enum(["pt", "en", "es", "auto"]);

export const appRouter = router({
  system: systemRouter,

  audio: router({
    transcribe: publicProcedure
      .input(z.object({ 
        audioData: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        const binaryString = atob(input.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/webm" });
        // Se language é "auto", deixa undefined para detecção automática
        const lang = input.language === "auto" ? undefined : (input.language as SupportedLanguage);
        const transcribedText = await transcribeAudioFile(blob, lang);
        return { text: transcribedText };
      }),
  }),

  text: router({
    correct: publicProcedure
      .input(z.object({ 
        text: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        // Se language é "auto", deixa undefined para detecção automática
        const lang = input.language === "auto" ? undefined : (input.language as CorrectionLanguage);
        const correctedText = await correctTextWithAI(input.text, lang);
        return { correctedText };
      }),
    applyVoiceCorrections: publicProcedure
      .input(z.object({
        correctedText: z.string(),
        voiceCorrections: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        // Se language é "auto", deixa undefined para detecção automática
        const lang = input.language === "auto" ? undefined : (input.language as CorrectionLanguage);
        const finalText = await applyVoiceCorrections(
          input.correctedText,
          input.voiceCorrections,
          lang
        );
        return { finalText };
      }),
  }),
});

export type AppRouter = typeof appRouter;
