-- Soft-delete workstations without erasing published shifts, assignments or attendance.
ALTER TABLE "Workstation" ADD COLUMN "archivedAt" TIMESTAMP(3);
