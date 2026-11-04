-- Add coordinator nominations based on existing team member records.
-- Non-destructive: preserves EventCoordinator user-to-event permissions.
CREATE TABLE "EventCoordinatorMember" (
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventCoordinatorMember_pkey" PRIMARY KEY ("eventId","memberId")
);
CREATE INDEX "EventCoordinatorMember_memberId_idx" ON "EventCoordinatorMember"("memberId");
ALTER TABLE "EventCoordinatorMember" ADD CONSTRAINT "EventCoordinatorMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventCoordinatorMember" ADD CONSTRAINT "EventCoordinatorMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
