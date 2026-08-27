-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RESEARCHER', 'CALLER', 'MANAGER');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('WHITE_PAPER', 'WEBINAR');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('P1', 'P2', 'P3', 'REJECT', 'COMPLIANCE_HOLD', 'UNSCORED');

-- CreateEnum
CREATE TYPE "RoleCategory" AS ENUM ('DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR', 'BUSINESS_INFLUENCER', 'PROCUREMENT', 'END_USER', 'PERIPHERAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('C_LEVEL', 'EVP', 'SVP', 'VP', 'HEAD', 'DIRECTOR', 'SENIOR_MANAGER', 'MANAGER', 'TEAM_LEAD', 'INDIVIDUAL_CONTRIBUTOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DecisionRole" AS ENUM ('DECISION_MAKER', 'INFLUENCER', 'EVALUATOR', 'RECOMMENDER', 'GATEKEEPER', 'USER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('VERIFIED', 'VALID', 'CATCH_ALL', 'UNVERIFIED', 'RISKY', 'INVALID', 'BOUNCED', 'MISSING');

-- CreateEnum
CREATE TYPE "PhoneStatus" AS ENUM ('VERIFIED', 'VALID', 'UNVERIFIED', 'INVALID', 'WRONG_NUMBER', 'MISSING');

-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('AVAILABLE_OPTED_IN', 'AVAILABLE_NO_CONSENT', 'NOT_AVAILABLE', 'OPTED_OUT', 'BLOCKED_BY_POLICY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('EXPLICIT_OPT_IN', 'SOFT_OPT_IN', 'LEGITIMATE_INTEREST', 'NOT_CAPTURED', 'OPT_OUT', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "LawfulBasis" AS ENUM ('CONSENT', 'LEGITIMATE_INTEREST', 'CONTRACT', 'LEGAL_OBLIGATION', 'NOT_DETERMINED');

-- CreateEnum
CREATE TYPE "OptOutStatus" AS ENUM ('NONE', 'EMAIL_OPT_OUT', 'PHONE_OPT_OUT', 'WHATSAPP_OPT_OUT', 'GLOBAL_OPT_OUT');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "ConsentRequirement" AS ENUM ('EXPLICIT_OPT_IN_REQUIRED', 'SOFT_OPT_IN_SUFFICIENT', 'LEGITIMATE_INTEREST_SUFFICIENT', 'CHANNEL_PROHIBITED');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "EmployeeBand" AS ENUM ('BAND_1_50', 'BAND_51_200', 'BAND_201_500', 'BAND_501_1000', 'BAND_1001_5000', 'BAND_5001_10000', 'BAND_10001_PLUS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RevenueBand" AS ENUM ('LT_10M', 'FROM_10M_50M', 'FROM_50M_250M', 'FROM_250M_1B', 'FROM_1B_5B', 'GT_5B', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClientRelationship" AS ENUM ('NONE', 'PROSPECT_IN_PIPELINE', 'PAST_CLIENT', 'CURRENT_CLIENT', 'PARTNER');

-- CreateEnum
CREATE TYPE "TriggerVerification" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "HumanReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'DOWNGRADED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('NEW', 'ASSIGNED', 'ATTEMPTED', 'CONTACTED', 'ENGAGED', 'REGISTERED', 'ATTENDED', 'MEETING_REQUESTED', 'NURTURE', 'NOT_INTERESTED', 'DO_NOT_CONTACT', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WHITEPAPER_SENT', 'WHITEPAPER_DELIVERED', 'WHITEPAPER_OPENED', 'WHITEPAPER_DOWNLOADED', 'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_REPLIED', 'POSITIVE_EMAIL_REPLY', 'WEBINAR_INVITATION_SENT', 'WEBINAR_REGISTERED', 'WEBINAR_ATTENDED', 'WEBINAR_ATTENDANCE_50_PERCENT', 'WEBINAR_ATTENDANCE_75_PERCENT', 'WEBINAR_ATTENDANCE_80_PERCENT', 'STAYED_FOR_QA', 'POLL_ANSWERED', 'QUESTION_ASKED', 'RESOURCE_DOWNLOADED', 'CTA_CLICKED', 'REPLAY_WATCHED', 'MEETING_REQUESTED', 'CALL_CONNECTED', 'CALL_NO_ANSWER', 'CALL_CALLBACK_REQUESTED', 'NOT_INTERESTED', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'INTERESTED', 'SENT_WHITEPAPER', 'SENT_WEBINAR_LINK', 'REGISTERED', 'NOT_RELEVANT', 'NOT_INTERESTED', 'WRONG_NUMBER', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('WHITEPAPER_OFFER', 'WEBINAR_INVITE', 'REMINDER', 'FOLLOW_UP', 'REPLAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'LOGGED_MANUALLY');

-- CreateEnum
CREATE TYPE "ReplySentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'OUT_OF_OFFICE', 'UNSUBSCRIBE');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('INTRODUCTION', 'WEBINAR_INVITE', 'REMINDER', 'LINK_SHARE', 'FOLLOW_UP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'MAPPED', 'VALIDATED', 'COMMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('VALID', 'INVALID', 'DUPLICATE', 'CORRECTED', 'SKIPPED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "ScoreChangeSource" AS ENUM ('IMPORT', 'SCORING_ENGINE', 'ENGAGEMENT_EVENT', 'CALL_OUTCOME', 'HUMAN_REVIEW', 'WEIGHT_CHANGE', 'COMPLIANCE_UPDATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'RESEARCHER',
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "domain" TEXT,
    "industry" TEXT NOT NULL,
    "subIndustry" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "timeZone" TEXT,
    "language" TEXT,
    "employeeBand" "EmployeeBand" NOT NULL DEFAULT 'UNKNOWN',
    "revenueBand" "RevenueBand" NOT NULL DEFAULT 'UNKNOWN',
    "numberOfLocations" INTEGER,
    "existingTechnology" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitorTechnology" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "namedAccountStatus" BOOLEAN NOT NULL DEFAULT false,
    "existingClientRelationship" "ClientRelationship" NOT NULL DEFAULT 'NONE',
    "recentBusinessTrigger" TEXT,
    "relevantOpenJobPostings" INTEGER NOT NULL DEFAULT 0,
    "transformationActivity" BOOLEAN NOT NULL DEFAULT false,
    "expansionActivity" BOOLEAN NOT NULL DEFAULT false,
    "mergerOrAcquisitionActivity" BOOLEAN NOT NULL DEFAULT false,
    "leadershipChange" BOOLEAN NOT NULL DEFAULT false,
    "regulatoryPressure" BOOLEAN NOT NULL DEFAULT false,
    "publiclyStatedPriority" BOOLEAN NOT NULL DEFAULT false,
    "triggerSource" TEXT,
    "triggerDate" TIMESTAMP(3),
    "triggerVerification" "TriggerVerification" NOT NULL DEFAULT 'UNVERIFIED',
    "accountNotes" TEXT,
    "accountDataConfidence" "DataConfidence" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "normalizedJobTitle" TEXT NOT NULL,
    "department" TEXT,
    "jobFunction" TEXT,
    "roleCategory" "RoleCategory" NOT NULL DEFAULT 'UNKNOWN',
    "seniority" "Seniority" NOT NULL DEFAULT 'UNKNOWN',
    "decisionRole" "DecisionRole" NOT NULL DEFAULT 'UNKNOWN',
    "ownsBudget" BOOLEAN NOT NULL DEFAULT false,
    "influencesDecision" BOOLEAN NOT NULL DEFAULT false,
    "directProblemResponsibility" BOOLEAN NOT NULL DEFAULT false,
    "roleRelevanceNotes" TEXT,
    "roleConfidence" "DataConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "tenureMonths" INTEGER,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "timeZone" TEXT,
    "language" TEXT,
    "workEmail" TEXT,
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'MISSING',
    "emailConfidence" "DataConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "phoneNumber" TEXT,
    "phoneStatus" "PhoneStatus" NOT NULL DEFAULT 'MISSING',
    "whatsappStatus" "WhatsAppStatus" NOT NULL DEFAULT 'UNKNOWN',
    "linkedinUrl" TEXT,
    "contactSource" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'NOT_CAPTURED',
    "communicationRestrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactNotes" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientBrand" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "topic" TEXT NOT NULL,
    "targetBusinessProblem" TEXT NOT NULL,
    "description" TEXT,
    "targetIndustries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetSubIndustries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetEmployeeBands" "EmployeeBand"[] DEFAULT ARRAY[]::"EmployeeBand"[],
    "targetRevenueBands" "RevenueBand"[] DEFAULT ARRAY[]::"RevenueBand"[],
    "targetTechnologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetJobFunctions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetRoleCategories" "RoleCategory"[] DEFAULT ARRAY[]::"RoleCategory"[],
    "targetSeniorities" "Seniority"[] DEFAULT ARRAY[]::"Seniority"[],
    "preferredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relevantRoleCategories" "RoleCategory"[] DEFAULT ARRAY[]::"RoleCategory"[],
    "problemOwnershipTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surfaceTitleKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventDate" TIMESTAMP(3),
    "eventTime" TEXT,
    "eventTimeZone" TEXT,
    "speakerInformation" TEXT,
    "registrationUrl" TEXT,
    "whitePaperUrl" TEXT,
    "scoringWeights" JSONB,
    "campaignCost" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignContact" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "roleRelevanceScore" INTEGER NOT NULL DEFAULT 0,
    "triggerScore" INTEGER NOT NULL DEFAULT 0,
    "engagementScore" INTEGER NOT NULL DEFAULT 0,
    "dataQualityScore" INTEGER NOT NULL DEFAULT 0,
    "attendanceLikelihoodScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "engagementBonus" INTEGER NOT NULL DEFAULT 0,
    "priority" "Priority" NOT NULL DEFAULT 'UNSCORED',
    "relevanceGatePassed" BOOLEAN NOT NULL DEFAULT false,
    "complianceGatePassed" BOOLEAN NOT NULL DEFAULT false,
    "scoreExplanation" JSONB,
    "gateResults" JSONB,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "humanReviewStatus" "HumanReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "whyThisContact" TEXT,
    "recommendedChannel" "Channel",
    "recommendedNextAction" TEXT,
    "callerOpening" TEXT,
    "emailAngle" TEXT,
    "whatsappRecommended" BOOLEAN NOT NULL DEFAULT false,
    "surfaceLevelMatch" BOOLEAN NOT NULL DEFAULT false,
    "assignedToId" TEXT,
    "currentStatus" "OutreachStatus" NOT NULL DEFAULT 'NEW',
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallActivity" (
    "id" TEXT NOT NULL,
    "campaignContactId" TEXT NOT NULL,
    "callerId" TEXT,
    "callDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "CallOutcome" NOT NULL,
    "notes" TEXT,
    "nextAction" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailActivity" (
    "id" TEXT NOT NULL,
    "campaignContactId" TEXT NOT NULL,
    "emailType" "EmailType" NOT NULL DEFAULT 'CUSTOM',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "replySentiment" "ReplySentiment",
    "unsubscribeAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'log',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppActivity" (
    "id" TEXT NOT NULL,
    "campaignContactId" TEXT NOT NULL,
    "messageType" "WhatsAppMessageType" NOT NULL DEFAULT 'CUSTOM',
    "messageText" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "repliedAt" TIMESTAMP(3),
    "optOutAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'log',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecord" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'NOT_CAPTURED',
    "consentSource" TEXT,
    "consentDate" TIMESTAMP(3),
    "lawfulBasis" "LawfulBasis" NOT NULL DEFAULT 'NOT_DETERMINED',
    "noticeProvided" BOOLEAN NOT NULL DEFAULT false,
    "optOutStatus" "OptOutStatus" NOT NULL DEFAULT 'NONE',
    "allowedChannels" "Channel"[] DEFAULT ARRAY[]::"Channel"[],
    "blockedChannels" "Channel"[] DEFAULT ARRAY[]::"Channel"[],
    "complianceNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryComplianceRule" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "emailRequirement" "ConsentRequirement" NOT NULL DEFAULT 'LEGITIMATE_INTEREST_SUFFICIENT',
    "phoneRequirement" "ConsentRequirement" NOT NULL DEFAULT 'LEGITIMATE_INTEREST_SUFFICIENT',
    "whatsappRequirement" "ConsentRequirement" NOT NULL DEFAULT 'EXPLICIT_OPT_IN_REQUIRED',
    "requiredFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noticeRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "CountryComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreAudit" (
    "id" TEXT NOT NULL,
    "campaignContactId" TEXT NOT NULL,
    "source" "ScoreChangeSource" NOT NULL,
    "reason" TEXT NOT NULL,
    "previousTotal" INTEGER,
    "newTotal" INTEGER NOT NULL,
    "previousPriority" "Priority",
    "newPriority" "Priority" NOT NULL,
    "delta" JSONB,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "campaignId" TEXT,
    "uploadedById" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "columnMapping" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'VALID',
    "errors" JSONB,
    "warnings" JSONB,
    "duplicateOfContactId" TEXT,
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Account_domain_idx" ON "Account"("domain");

-- CreateIndex
CREATE INDEX "Account_industry_idx" ON "Account"("industry");

-- CreateIndex
CREATE INDEX "Account_country_idx" ON "Account"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Account_companyName_country_key" ON "Account"("companyName", "country");

-- CreateIndex
CREATE INDEX "Contact_accountId_idx" ON "Contact"("accountId");

-- CreateIndex
CREATE INDEX "Contact_workEmail_idx" ON "Contact"("workEmail");

-- CreateIndex
CREATE INDEX "Contact_phoneNumber_idx" ON "Contact"("phoneNumber");

-- CreateIndex
CREATE INDEX "Contact_roleCategory_idx" ON "Contact"("roleCategory");

-- CreateIndex
CREATE INDEX "Contact_country_idx" ON "Contact"("country");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignContact_campaignId_priority_idx" ON "CampaignContact"("campaignId", "priority");

-- CreateIndex
CREATE INDEX "CampaignContact_assignedToId_idx" ON "CampaignContact"("assignedToId");

-- CreateIndex
CREATE INDEX "CampaignContact_currentStatus_idx" ON "CampaignContact"("currentStatus");

-- CreateIndex
CREATE INDEX "CampaignContact_totalScore_idx" ON "CampaignContact"("totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignContact_campaignId_contactId_key" ON "CampaignContact"("campaignId", "contactId");

-- CreateIndex
CREATE INDEX "EngagementEvent_campaignId_contactId_idx" ON "EngagementEvent"("campaignId", "contactId");

-- CreateIndex
CREATE INDEX "EngagementEvent_eventType_idx" ON "EngagementEvent"("eventType");

-- CreateIndex
CREATE INDEX "EngagementEvent_eventDate_idx" ON "EngagementEvent"("eventDate");

-- CreateIndex
CREATE INDEX "CallActivity_campaignContactId_idx" ON "CallActivity"("campaignContactId");

-- CreateIndex
CREATE INDEX "CallActivity_callerId_idx" ON "CallActivity"("callerId");

-- CreateIndex
CREATE INDEX "EmailActivity_campaignContactId_idx" ON "EmailActivity"("campaignContactId");

-- CreateIndex
CREATE INDEX "WhatsAppActivity_campaignContactId_idx" ON "WhatsAppActivity"("campaignContactId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_contactId_idx" ON "ComplianceRecord"("contactId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_country_idx" ON "ComplianceRecord"("country");

-- CreateIndex
CREATE UNIQUE INDEX "CountryComplianceRule_country_key" ON "CountryComplianceRule"("country");

-- CreateIndex
CREATE INDEX "ScoreAudit_campaignContactId_createdAt_idx" ON "ScoreAudit"("campaignContactId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_batchId_status_idx" ON "ImportRow"("batchId", "status");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallActivity" ADD CONSTRAINT "CallActivity_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallActivity" ADD CONSTRAINT "CallActivity_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailActivity" ADD CONSTRAINT "EmailActivity_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppActivity" ADD CONSTRAINT "WhatsAppActivity_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreAudit" ADD CONSTRAINT "ScoreAudit_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreAudit" ADD CONSTRAINT "ScoreAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
