ALTER TABLE `users`
  ADD COLUMN `usageCount` int NOT NULL DEFAULT 0,
  ADD COLUMN `isPremium` boolean NOT NULL DEFAULT false,
  ADD COLUMN `stripeCustomerId` varchar(128),
  ADD COLUMN `stripeSubscriptionId` varchar(128),
  ADD COLUMN `subscriptionStatus` enum('active','canceled','past_due');
