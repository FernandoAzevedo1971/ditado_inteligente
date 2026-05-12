import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc.js";
import { z } from "zod";
import { transcribeAudioFile, type SupportedLanguage } from "./transcription.js";
import { correctTextWithAI, type SupportedLanguage as CorrectionLanguage } from "./textCorrection.js";
import { applyVoiceCorrections } from "./voiceCorrections.js";
import { incrementDictationCount, getUserSubscriptionInfo, updateSubscription } from "./db.js";
import { FREE_DICTATION_LIMIT, PAYMENT_REQUIRED_ERR_MSG } from "../shared/const.js";
import { TRPCError } from "@trpc/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
        const base64Data = input.audioData.includes(",")
          ? input.audioData.split(",")[1]
          : input.audioData;

        const buffer = Buffer.from(base64Data, "base64");
        const tempFilePath = path.join(os.tmpdir(), `audio-trpc-${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, buffer);

        const lang = input.language === "auto" ? undefined : (input.language as SupportedLanguage);
        const transcribedText = await transcribeAudioFile(tempFilePath, lang);

        fs.unlinkSync(tempFilePath);
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
        const lang = input.language === "auto" ? undefined : (input.language as CorrectionLanguage);
        const result = await correctTextWithAI(input.text, lang);
        return {
          correctedText: result.correctedText,
          outOfContextWords: result.outOfContextWords,
          translatedTo: result.translatedTo,
        };
      }),

    applyVoiceCorrections: publicProcedure
      .input(z.object({
        correctedText: z.string(),
        voiceCorrections: z.string(),
        language: LANGUAGE_ENUM.default("auto"),
      }))
      .mutation(async ({ input }) => {
        const lang: CorrectionLanguage = (input.language === "auto" ? "pt" : input.language) as CorrectionLanguage;
        const finalText = await applyVoiceCorrections(
          input.correctedText,
          input.voiceCorrections,
          lang
        );
        return { finalText };
      }),
  }),

  // Subscription & billing routes
  subscription: router({
    // Get current user's subscription info and dictation count
    getInfo: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        return {
          dictationCount: 0,
          dictationsRemaining: FREE_DICTATION_LIMIT,
          subscriptionStatus: "free" as const,
          isPremium: false,
          limit: FREE_DICTATION_LIMIT,
        };
      }

      const info = await getUserSubscriptionInfo(ctx.user.openId);
      if (!info) {
        return {
          dictationCount: 0,
          dictationsRemaining: FREE_DICTATION_LIMIT,
          subscriptionStatus: "free" as const,
          isPremium: false,
          limit: FREE_DICTATION_LIMIT,
        };
      }

      // Check if subscription has expired
      const isExpired = info.subscriptionExpiry && new Date(info.subscriptionExpiry) < new Date();
      const effectiveStatus = isExpired && info.subscriptionStatus === "active"
        ? "expired"
        : info.subscriptionStatus;

      const isPremium = effectiveStatus === "active" || ctx.user.role === "admin";
      const remaining = isPremium
        ? Infinity
        : Math.max(0, FREE_DICTATION_LIMIT - info.dictationCount);

      return {
        dictationCount: info.dictationCount,
        dictationsRemaining: remaining,
        subscriptionStatus: effectiveStatus,
        isPremium,
        limit: FREE_DICTATION_LIMIT,
      };
    }),

    // Increment dictation count (called after each successful transcription)
    recordDictation: publicProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário" });
      }

      // Admins have unlimited access
      if (ctx.user.role === "admin") {
        return { allowed: true, count: 0, remaining: Infinity };
      }

      // Check subscription status
      const info = await getUserSubscriptionInfo(ctx.user.openId);
      const isPremium = info?.subscriptionStatus === "active";

      if (!isPremium && info && info.dictationCount >= FREE_DICTATION_LIMIT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: PAYMENT_REQUIRED_ERR_MSG,
        });
      }

      const newCount = await incrementDictationCount(ctx.user.openId);
      const remaining = isPremium ? Infinity : Math.max(0, FREE_DICTATION_LIMIT - newCount);

      return { allowed: true, count: newCount, remaining };
    }),

    // Validate a Google Play purchase and activate subscription
    validatePurchase: publicProcedure
      .input(z.object({
        purchaseToken: z.string(),
        productId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário" });
        }

        // For now, store the token and activate.
        // In production, validate with Google Play Developer API.
        // See: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);

        await updateSubscription(
          ctx.user.openId,
          "active",
          expiryDate,
          input.purchaseToken
        );

        return { success: true, expiresAt: expiryDate.toISOString() };
      }),
  }),
});

export type AppRouter = typeof appRouter;
