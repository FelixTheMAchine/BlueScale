CREATE TABLE "LoginThrottle" (
 "key" TEXT NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "windowStarted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "blockedUntil" TIMESTAMP(3),
 CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);
