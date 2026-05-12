ALTER TABLE `users`
  ADD COLUMN `dictationCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `subscriptionStatus` ENUM('free', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'free',
  ADD COLUMN `subscriptionExpiry` TIMESTAMP NULL,
  ADD COLUMN `playStoreToken` VARCHAR(512) NULL;
