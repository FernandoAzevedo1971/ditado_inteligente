import { db } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";
import { doc, setDoc, increment, onSnapshot } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";
import { FREE_DICTATION_LIMIT, SUBSCRIPTION_PRICE_BRL, SUBSCRIPTION_SKU } from "@shared/const";
import { canDictateOffline, getOfflineKey } from "@shared/subscription";


export interface SubscriptionInfo {
  dictationCount: number;
  dictationsRemaining: number;
  subscriptionStatus: "free" | "active" | "expired" | "cancelled";
  isPremium: boolean;
  limit: number;
  isFreeAccess?: boolean;
}

const DEFAULT_INFO: SubscriptionInfo = {
  dictationCount: 0,
  dictationsRemaining: FREE_DICTATION_LIMIT,
  subscriptionStatus: "free",
  isPremium: false,
  limit: FREE_DICTATION_LIMIT,
};

export function useSubscription() {
  const { user } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo>(DEFAULT_INFO);
  const [hasFreeAccess, setHasFreeAccess] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener on the user's subscription document in Firestore
  useEffect(() => {
    if (!user || !db) {
      setInfo(DEFAULT_INFO);
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, "subscriptions", user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const count = data.dictationCount ?? 0;
          const status = data.subscriptionStatus ?? "free";

          // Check if subscription has expired
          let effectiveStatus = status;
          if (status === "active" && data.subscriptionExpiry) {
            const expiry = data.subscriptionExpiry.toDate
              ? data.subscriptionExpiry.toDate()
              : new Date(data.subscriptionExpiry);
            if (expiry < new Date()) {
              effectiveStatus = "expired";
            }
          }

          const isPremium = effectiveStatus === "active";
          const remaining = isPremium
            ? Infinity
            : Math.max(0, FREE_DICTATION_LIMIT - count);

          setInfo({
            dictationCount: count,
            dictationsRemaining: remaining,
            subscriptionStatus: effectiveStatus,
            isPremium,
            limit: FREE_DICTATION_LIMIT,
          });
        } else {
          // First time user — create their subscription doc
          setDoc(userDocRef, {
            dictationCount: 0,
            subscriptionStatus: "free",
            createdAt: new Date(),
            email: user.email,
            displayName: user.displayName,
          }).catch(console.error);

          setInfo(DEFAULT_INFO);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("[Subscription] Firestore error:", error);
        // Fallback to localStorage if Firestore fails
        const localCount = parseInt(localStorage.getItem("dictation_count") || "0", 10);
        setInfo({
          ...DEFAULT_INFO,
          dictationCount: localCount,
          dictationsRemaining: Math.max(0, FREE_DICTATION_LIMIT - localCount),
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Listen for free-access grants from admin
  useEffect(() => {
    if (!user?.email || !db) {
      setHasFreeAccess(false);
      return;
    }

    const freeAccessRef = doc(db, "freeAccess", user.email);
    const unsubscribe = onSnapshot(
      freeAccessRef,
      (snap) => setHasFreeAccess(snap.exists() && snap.data()?.active === true),
      () => setHasFreeAccess(false)
    );

    return () => unsubscribe();
  }, [user?.email]);

  // Sync offline dictations when coming back online
  useEffect(() => {
    const syncOfflineData = async () => {
      if (!user || !db || !navigator.onLine) return;

      const pendingSync = parseInt(localStorage.getItem("pending_sync_count") || "0", 10);
      if (pendingSync > 0) {
        try {
          const userDocRef = doc(db, "subscriptions", user.uid);
          await setDoc(
            userDocRef,
            {
              dictationCount: increment(pendingSync),
            },
            { merge: true }
          );
          localStorage.setItem("pending_sync_count", "0");
          console.log(`[Subscription] Synchronized ${pendingSync} offline dictations.`);
        } catch (error) {
          console.error("[Subscription] Failed to sync offline dictations:", error);
        }
      }
    };

    syncOfflineData();
    window.addEventListener("online", syncOfflineData);
    return () => window.removeEventListener("online", syncOfflineData);
  }, [user, db]);

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const offlineKey = getOfflineKey(new Date());
  const offlineCount = typeof window !== 'undefined' ? parseInt(localStorage.getItem(offlineKey) || "0", 10) : 0;

  // Effective premium includes paid subscription OR admin-granted free access
  const effectiveIsPremium = info.isPremium || hasFreeAccess;
  const effectiveInfo: SubscriptionInfo = {
    ...info,
    isPremium: effectiveIsPremium,
    dictationsRemaining: effectiveIsPremium ? Infinity : info.dictationsRemaining,
    isFreeAccess: hasFreeAccess,
  };

  const canDictate = effectiveIsPremium || (isOffline ? canDictateOffline(offlineCount) : effectiveInfo.dictationsRemaining > 0);

  // Increment the dictation count in Firestore
  const recordDictation = useCallback(async () => {
    const isOfflineNow = !navigator.onLine;
    const key = getOfflineKey(new Date());
    const count = parseInt(localStorage.getItem(key) || "0", 10);

    if (isOfflineNow) {
      if (!canDictateOffline(count)) {
        throw new Error("Limite de ditados offline atingido para hoje.");
      }
      
      const newOfflineCount = count + 1;
      localStorage.setItem(key, String(newOfflineCount));
      
      const pendingSync = parseInt(localStorage.getItem("pending_sync_count") || "0", 10);
      localStorage.setItem("pending_sync_count", String(pendingSync + 1));

      const current = parseInt(localStorage.getItem("dictation_count") || "0", 10);
      const newCount = current + 1;
      localStorage.setItem("dictation_count", String(newCount));
      
      return { count: newCount, remaining: Math.max(0, FREE_DICTATION_LIMIT - newCount) };
    }

    if (!user || !db) {
      const current = parseInt(localStorage.getItem("dictation_count") || "0", 10);
      const newCount = current + 1;
      localStorage.setItem("dictation_count", String(newCount));
      return { count: newCount, remaining: Math.max(0, FREE_DICTATION_LIMIT - newCount) };
    }

    const userDocRef = doc(db, "subscriptions", user.uid);
    await setDoc(
      userDocRef,
      {
        dictationCount: increment(1),
        lastDictationAt: new Date(),
      },
      { merge: true }
    );

    const newCount = info.dictationCount + 1;
    localStorage.setItem("dictation_count", String(newCount));

    return {
      count: newCount,
      remaining: effectiveIsPremium ? Infinity : Math.max(0, FREE_DICTATION_LIMIT - newCount),
    };
  }, [user, info, effectiveIsPremium]);


  // Check if Google Play Billing is available (only in TWA/Android context)
  const checkPlayBillingAvailable = useCallback(async (): Promise<boolean> => {
    if (!("getDigitalGoodsService" in window)) return false;
    try {
      const service = await (window as any).getDigitalGoodsService(
        "https://play.google.com/billing"
      );
      return !!service;
    } catch {
      return false;
    }
  }, []);

  // Purchase subscription via Google Play Billing
  const purchaseSubscription = useCallback(async () => {
    setIsPurchasing(true);
    try {
      const isPlayAvailable = await checkPlayBillingAvailable();

      if (isPlayAvailable) {
        // Use Digital Goods API + Payment Request API (TWA/Android)
        const service = await (window as any).getDigitalGoodsService(
          "https://play.google.com/billing"
        );
        const details = await service.getDetails([SUBSCRIPTION_SKU]);

        if (!details || details.length === 0) {
          throw new Error("Produto não encontrado na Play Store");
        }

        const paymentMethod = [{
          supportedMethods: "https://play.google.com/billing",
          data: { sku: details[0].itemId },
        }];

        const paymentDetails = {
          total: {
            label: "Ditado Inteligente Premium",
            amount: { currency: "BRL", value: SUBSCRIPTION_PRICE_BRL.replace(",", ".") },
          },
        };

        const request = new PaymentRequest(paymentMethod, paymentDetails);
        const response = await request.show();

        // Activate subscription in Firestore
        if (user && db) {
          const userDocRef = doc(db, "subscriptions", user.uid);
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);

          await setDoc(
            userDocRef,
            {
              subscriptionStatus: "active",
              subscriptionExpiry: expiryDate,
              playStoreToken: response.details.token,
              subscribedAt: new Date(),
            },
            { merge: true }
          );
        }

        await response.complete("success");
        return { success: true, method: "play_store" as const };
      } else {
        // Not in TWA context — show instructions
        throw new Error(
          "Assinatura disponível apenas pelo aplicativo Android na Play Store."
        );
      }
    } catch (error: any) {
      console.error("[Subscription] Purchase failed:", error);
      throw error;
    } finally {
      setIsPurchasing(false);
    }
  }, [checkPlayBillingAvailable, user]);

  return {
    info: effectiveInfo,
    canDictate,
    isPurchasing,
    isLoading,
    recordDictation,
    purchaseSubscription,
  };
}
