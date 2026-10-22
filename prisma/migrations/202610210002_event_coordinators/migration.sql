CREATE TABLE "EventCoordinator" (
 "eventId" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "EventCoordinator_pkey" PRIMARY KEY ("eventId","userId")
);
CREATE INDEX "EventCoordinator_userId_idx" ON "EventCoordinator"("userId");
ALTER TABLE "EventCoordinator" ADD CONSTRAINT "EventCoordinator_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventCoordinator" ADD CONSTRAINT "EventCoordinator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
