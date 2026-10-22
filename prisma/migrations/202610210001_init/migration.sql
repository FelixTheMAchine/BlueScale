-- BlueScale initial schema — PostgreSQL 16, Prisma ORM 6.
CREATE TYPE "Role" AS ENUM ('ADMIN','PEOPLE','EVENT_COORDINATOR','MEMBER');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE','INACTIVE','LEAVE');
CREATE TYPE "Commute" AS ENUM ('NEAR','MEDIUM','FAR');
CREATE TYPE "EventStatus" AS ENUM ('PLANNING','OPEN','GENERATED','PUBLISHED','COMPLETED','CANCELLED');
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING','CONFIRMED','DECLINED');
CREATE TYPE "SwapStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT','ABSENT','LATE');
CREATE TABLE "Department" (
 "id" TEXT NOT NULL,"name" TEXT NOT NULL, CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE TABLE "Member" (
 "id" TEXT NOT NULL,"identifier" TEXT NOT NULL,"fullName" TEXT NOT NULL,"nickname" TEXT,"email" TEXT NOT NULL,"phone" TEXT,
 "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',"departmentId" TEXT NOT NULL,"title" TEXT,"region" TEXT,
 "commute" "Commute","commuteMin" INTEGER,"transport" TEXT,"adminNotes" TEXT,
 "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Member_pkey" PRIMARY KEY("id"),CONSTRAINT "Member_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Member_identifier_key" ON "Member"("identifier");
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
CREATE INDEX "Member_departmentId_status_idx" ON "Member"("departmentId","status");
CREATE TABLE "User" (
 "id" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"role" "Role" NOT NULL DEFAULT 'MEMBER',
 "memberId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "User_pkey" PRIMARY KEY("id"),CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");
CREATE TABLE "MemberPreference" (
 "id" TEXT NOT NULL,"memberId" TEXT NOT NULL,"preferredPeriod" TEXT NOT NULL DEFAULT 'ANY',"enjoyAfterShift" BOOLEAN NOT NULL DEFAULT false,
 "preferredStations" TEXT[] DEFAULT ARRAY[]::TEXT[],CONSTRAINT "MemberPreference_pkey" PRIMARY KEY("id"),
 CONSTRAINT "MemberPreference_memberId_fkey" FOREIGN KEY("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MemberPreference_memberId_key" ON "MemberPreference"("memberId");
CREATE TABLE "Skill"("id" TEXT NOT NULL,"name" TEXT NOT NULL,CONSTRAINT "Skill_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");
CREATE TABLE "MemberSkill" (
 "memberId" TEXT NOT NULL,"skillId" TEXT NOT NULL,CONSTRAINT "MemberSkill_pkey" PRIMARY KEY("memberId","skillId"),
 CONSTRAINT "MemberSkill_memberId_fkey" FOREIGN KEY("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "MemberSkill_skillId_fkey" FOREIGN KEY("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Event" (
 "id" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"location" TEXT NOT NULL,"timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
 "startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3) NOT NULL,"confirmationDeadline" TIMESTAMP(3),
 "status" "EventStatus" NOT NULL DEFAULT 'PLANNING',"maxMinutesPerMember" INTEGER NOT NULL DEFAULT 360,
 "maxShiftsPerMember" INTEGER NOT NULL DEFAULT 4,"minRestMinutes" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Event_pkey" PRIMARY KEY("id"),CONSTRAINT "Event_valid_time" CHECK("endsAt">"startsAt")
);
CREATE INDEX "Event_startsAt_status_idx" ON "Event"("startsAt","status");
CREATE TABLE "MemberAvailability" (
 "id" TEXT NOT NULL,"memberId" TEXT NOT NULL,"eventId" TEXT NOT NULL,"startAt" TIMESTAMP(3) NOT NULL,"endAt" TIMESTAMP(3) NOT NULL,"available" BOOLEAN NOT NULL DEFAULT true,
 CONSTRAINT "MemberAvailability_pkey" PRIMARY KEY("id"),
 CONSTRAINT "MemberAvailability_memberId_fkey" FOREIGN KEY("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "MemberAvailability_eventId_fkey" FOREIGN KEY("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "MemberAvailability_valid_time" CHECK ("endAt">"startAt")
);
CREATE INDEX "MemberAvailability_memberId_eventId_startAt_endAt_idx" ON "MemberAvailability"("memberId","eventId","startAt","endAt");
CREATE UNIQUE INDEX "MemberAvailability_memberId_eventId_startAt_endAt_key" ON "MemberAvailability"("memberId","eventId","startAt","endAt");
CREATE TABLE "Workstation" (
 "id" TEXT NOT NULL,"eventId" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"minPeople" INTEGER NOT NULL DEFAULT 1,
 "idealPeople" INTEGER NOT NULL DEFAULT 1,"slotMinutes" INTEGER NOT NULL DEFAULT 90,"priority" INTEGER NOT NULL DEFAULT 1,
 "startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Workstation_pkey" PRIMARY KEY("id"),
 CONSTRAINT "Workstation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Workstation_valid" CHECK("minPeople">0 AND "idealPeople">="minPeople" AND "slotMinutes">=15)
);
CREATE UNIQUE INDEX "Workstation_eventId_name_key" ON "Workstation"("eventId","name");
CREATE TABLE "Shift" (
 "id" TEXT NOT NULL,"eventId" TEXT NOT NULL,"workstationId" TEXT NOT NULL,"startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3) NOT NULL,
 "minPeople" INTEGER NOT NULL DEFAULT 1,"idealPeople" INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT "Shift_pkey" PRIMARY KEY("id"),
 CONSTRAINT "Shift_eventId_fkey" FOREIGN KEY("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Shift_workstationId_fkey" FOREIGN KEY("workstationId") REFERENCES "Workstation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Shift_valid_time" CHECK("endsAt">"startsAt")
);
CREATE UNIQUE INDEX "Shift_workstationId_startsAt_key" ON "Shift"("workstationId","startsAt");
CREATE INDEX "Shift_eventId_startsAt_idx" ON "Shift"("eventId","startsAt");
CREATE TABLE "ShiftRequirement" (
 "shiftId" TEXT NOT NULL,"skillId" TEXT NOT NULL,CONSTRAINT "ShiftRequirement_pkey" PRIMARY KEY("shiftId","skillId"),
 CONSTRAINT "ShiftRequirement_shiftId_fkey" FOREIGN KEY("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ShiftRequirement_skillId_fkey" FOREIGN KEY("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ScheduleVersion" (
 "id" TEXT NOT NULL,"eventId" TEXT NOT NULL,"number" INTEGER NOT NULL,"revision" INTEGER NOT NULL DEFAULT 0,
 "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"publishedAt" TIMESTAMP(3),
 CONSTRAINT "ScheduleVersion_pkey" PRIMARY KEY("id"),
 CONSTRAINT "ScheduleVersion_eventId_fkey" FOREIGN KEY("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScheduleVersion_eventId_number_key" ON "ScheduleVersion"("eventId","number");
CREATE INDEX "ScheduleVersion_eventId_status_idx" ON "ScheduleVersion"("eventId","status");
CREATE UNIQUE INDEX "ScheduleVersion_one_draft_per_event" ON "ScheduleVersion"("eventId") WHERE "status"='DRAFT';
CREATE TABLE "ShiftAssignment" (
 "id" TEXT NOT NULL,"scheduleVersionId" TEXT NOT NULL,"memberId" TEXT NOT NULL,"shiftId" TEXT NOT NULL,
 "locked" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY("id"),
 CONSTRAINT "ShiftAssignment_scheduleVersionId_fkey" FOREIGN KEY("scheduleVersionId") REFERENCES "ScheduleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ShiftAssignment_memberId_fkey" FOREIGN KEY("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ShiftAssignment_scheduleVersionId_memberId_shiftId_key" ON "ShiftAssignment"("scheduleVersionId","memberId","shiftId");
CREATE INDEX "ShiftAssignment_scheduleVersionId_shiftId_idx" ON "ShiftAssignment"("scheduleVersionId","shiftId");
CREATE TABLE "ScheduleGeneration" (
 "id" TEXT NOT NULL,"eventId" TEXT NOT NULL,"scheduleVersionId" TEXT NOT NULL,"algorithm" TEXT NOT NULL DEFAULT 'deterministic-greedy-v1',
 "uncovered" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ScheduleGeneration_pkey" PRIMARY KEY("id"),
 CONSTRAINT "ScheduleGeneration_eventId_fkey" FOREIGN KEY("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ScheduleGeneration_scheduleVersionId_fkey" FOREIGN KEY("scheduleVersionId") REFERENCES "ScheduleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Confirmation" (
 "id" TEXT NOT NULL,"assignmentId" TEXT NOT NULL,"memberId" TEXT NOT NULL,"status" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
 "reason" TEXT,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Confirmation_pkey" PRIMARY KEY("id"),
 CONSTRAINT "Confirmation_assignmentId_fkey" FOREIGN KEY("assignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Confirmation_memberId_fkey" FOREIGN KEY("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Confirmation_assignmentId_key" ON "Confirmation"("assignmentId");
CREATE TABLE "SwapRequest" (
 "id" TEXT NOT NULL,"assignmentId" TEXT NOT NULL,"requesterId" TEXT NOT NULL,"targetId" TEXT,"status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
 "reason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SwapRequest_pkey" PRIMARY KEY("id"),
 CONSTRAINT "SwapRequest_assignmentId_fkey" FOREIGN KEY("assignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SwapRequest_requesterId_fkey" FOREIGN KEY("requesterId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SwapRequest_targetId_fkey" FOREIGN KEY("targetId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "Attendance" (
 "id" TEXT NOT NULL,"assignmentId" TEXT NOT NULL,"memberId" TEXT NOT NULL,"status" "AttendanceStatus" NOT NULL,
 "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Attendance_pkey" PRIMARY KEY("id"),
 CONSTRAINT "Attendance_assignmentId_fkey" FOREIGN KEY("assignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Attendance_assignmentId_key" ON "Attendance"("assignmentId");
CREATE TABLE "AuditLog" (
 "id" TEXT NOT NULL,"actorId" TEXT,"action" TEXT NOT NULL,"entity" TEXT NOT NULL,"entityId" TEXT NOT NULL,"details" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "AuditLog_pkey" PRIMARY KEY("id")
);
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity","entityId","createdAt");
