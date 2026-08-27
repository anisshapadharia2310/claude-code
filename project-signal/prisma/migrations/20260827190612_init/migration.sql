-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RESEARCHER', 'CALLER', 'MANAGER');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('WHITE_PAPER', 'WEBINAR');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoleCategory" AS ENUM ('DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR', 'BUSINESS_INFLUENCER', 'PROCUREMENT', 'END_USER', 'PERIPHERAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('C_LEVEL', 'EVP', 'SVP', 'VP', 'HEAD', 'DIRECTOR', 'SENIOR_MANAGER', 'MANAGER', 'TEAM_LEAD', 'SENIOR_INDIVIDUAL', 'INDIVIDUAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DecisionRole" AS ENUM ('DECISION_MAKER', 'INFLUENCER', 'EVALUATOR', 'RECOMMENDER', 'GATEKEEPER', 'END_USER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('P1', 'P2', 'P3', 'REJECT', 'COMPLIANCE_HOLD', 'UNSCORED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('VERIFIED', 'VALID', 'CATCH_ALL', 'UNVERIFIED', 'RISKY', 'INVALID', 'BOUNCED', 'MISSING');

-- CreateEnum
CREATE TYPE "PhoneStatus" AS ENUM ('VERIFIED', 'VALID', 'UNVERIFIED', 'INVALID', 'WRONG_NUMBER', 'DO_NOT_CALL', 'MISSING');

-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('AVAILABLE_OPTED_IN', 'AVAILABLE_NO_CONSENT', 'NOT_AVAILABLE', 'OPTED_OUT', 'BLOCKED_BY_POLICY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('EXPLICIT_OPT_IN', 'SOFT_OPT_IN', 'LEGITIMATE_INTEREST', 'NOT_CAPTURED', 'OPT_OUT', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "LawfulBasis" AS ENUM ('CONSENT', 'LEGITIMATE_INTEREST', 'CONTRACT', 'LEGAL_OBLIGATION', 'NOT_DETERMINED');

-- CreateEnum
CREATE TYPE "OptOutStatus" AS ENUM ('NONE', 'EMAIL_OPT_OUT', 'PHONE_OPT_OUT', 'WHATSAPP_OPT_OUT', 'GLOBAL_OPT_OUT');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'SMS', 'LINKEDIN', 'POST');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TriggerVerification" AS ENUM ('VERIFIED', 'UNVERIFIED', 'FALSE_POSITIVE', 'NONE');

-- CreateEnum
CREATE TYPE "ExistingClientRelationship" AS ENUM ('NONE', 'PROSPECT', 'PAST_CLIENT', 'CURRENT_CLIENT', 'PARTNER');

-- CreateEnum
CREATE TYPE "EmployeeBand" AS ENUM ('BAND_1_50', 'BAND_51_200', 'BAND_201_500', 'BAND_501_1000', 'BAND_1001_5000', 'BAND_5001_10000', 'BAND_10000_PLUS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RevenueBand" AS ENUM ('UNDER_10M', 'USD_10M_50M', 'USD_50M_250M', 'USD_250M_1B', 'USD_1B_5B', 'OVER_5B', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'DOWNGRADED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('NEW', 'ASSIGNED', 'ATTEMPTED', 'CONTACTED', 'ENGAGED', 'REGISTERED', 'ATTENDED', 'MEETING_SET', 'NURTURE', 'CLOSED_LOST', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WHITEPAPER_SENT', 'WHITEPAPER_DELIVERED', 'WHITEPAPER_OPENED', 'WHITEPAPER_DOWNLOADED', 'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_REPLIED', 'POSITIVE_EMAIL_REPLY', 'WEBINAR_INVITATION_SENT', 'WEBINAR_REGISTERED', 'WEBINAR_ATTENDED', 'WEBINAR_ATTENDANCE_50_PERCENT', 'WEBINAR_ATTENDANCE_75_PERCENT', 'WEBINAR_ATTENDANCE_80_PERCENT', 'STAYED_FOR_QA', 'POLL_ANSWERED', 'QUESTION_ASKED', 'RESOURCE_DOWNLOADED', 'CTA_CLICKED', 'REPLAY_WATCHED', 'MEETING_REQUESTED', 'CALL_CONNECTED', 'CALL_NO_ANSWER', 'CALL_CALLBACK_REQUESTED', 'NOT_INTERESTED', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'INTERESTED', 'SENT_WHITEPAPER', 'SENT_WEBINAR_LINK', 'REGISTERED', 'NOT_RELEVANT', 'NOT_INTERESTED', 'WRONG_NUMBER', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('WHITEPAPER_OFFER', 'WEBINAR_INVITATION', 'WEBINAR_REMINDER', 'FOLLOW_UP', 'REPLAY_SHARE', 'NURTURE', 'MEETING_REQUEST');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('WEBINAR_INVITATION', 'WEBINAR_REMINDER', 'WHITEPAPER_SHARE', 'FOLLOW_UP', 'MEETING_CONFIRMATION');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'BOUNCED', 'FAILED', 'BLOCKED', 'LOGGED_ONLY');

-- CreateEnum
CREATE TYPE "ReplySentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'OUT_OF_OFFICE', 'UNSUBSCRIBE', 'REFERRAL');

-- CreateEnum
CREATE TYPE "ScoreChangeReason" AS ENUM ('INITIAL_SCORE', 'RESCORE', 'ENGAGEMENT_EVENT', 'MANUAL_REVIEW', 'WEIGHT_CHANGE', 'DATA_UPDATE', 'COMPLIANCE_CHANGE', 'IMPORT');

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
    "existingClientRelationship" "ExistingClientRelationship" NOT NULL DEFAULT 'NONE',
    "recentBusinessTrigger" TEXT,
    "relevantOpenJobPostings" INTEGER NOT NULL DEFAULT 0,
    "transformationActivity" BOOLEAN NOT NULL DEFAULT false,
    "expansionActivity" BOOLEAN NOT NULL DEFAULT false,
    "mergerOrAcquisitionActivity" BOOLEAN NOT NULL DEFAULT false,
    "leadershipChange" BOOLEAN NOT NULL DEFAULT false,
    "regulatoryPressure" BOOLEAN NOT NULL DEFAULT false,
    "publiclyStatedPriority" TEXT,
    "triggerSourceUrl" TEXT,
    "triggerDate" TIMESTAMP(3),
    "triggerVerification" "TriggerVerification" NOT NULL DEFAULT 'NONE',
    "accountNotes" TEXT,
    "accountDataConfidence" "DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
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
    "roleCategory" "RoleCategory" NOT NULL DEFAULT 'UNKNOWN',
    "seniority" "Seniority" NOT NULL DEFAULT 'UNKNOWN',
    "decisionRole" "DecisionRole" NOT NULL DEFAULT 'UNKNOWN',
    "ownsBudget" BOOLEAN NOT NULL DEFAULT false,
    "influencesDecision" BOOLEAN NOT NULL DEFAULT false,
    "directProblemResponsibility" BOOLEAN NOT NULL DEFAULT false,
    "roleRelevanceNotes" TEXT,
    "roleConfidence" "DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "tenureMonths" INTEGER,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "timeZone" TEXT,
    "language" TEXT,
    "workEmail" TEXT,
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'MISSING',
    "emailConfidence" INTEGER NOT NULL DEFAULT 0,
    "phoneNumber" TEXT,
    "phoneStatus" "PhoneStatus" NOT NULL DEFAULT 'MISSING',
    "whatsappStatus" "WhatsAppStatus" NOT NULL DEFAULT 'UNKNOWN',
    "linkedinUrl" TEXT,
    "contactSource" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'NOT_CAPTURED',
    "communicationRestrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactNotes" TEXT,
    "duplicateOfId" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
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
    "relevantTitleTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedTitleTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relevantDepartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventDate" TIMESTAMP(3),
    "eventTime" TEXT,
    "eventTimeZone" TEXT,
    "speakerInformation" TEXT,
    "registrationUrl" TEXT,
    "whitePaperUrl" TEXT,
    "campaignCost" DECIMAL(12,2),
    "campaignCurrency" TEXT NOT NULL DEFAULT 'USD',
    "allowedChannels" "Channel"[] DEFAULT ARRAY['EMAIL', 'PHONE']::"Channel"[],
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
    "engagementBonusScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "priority" "Priority" NOT NULL DEFAULT 'UNSCORED',
    "relevanceGatePassed" BOOLEAN NOT NULL DEFAULT false,
    "complianceGatePassed" BOOLEAN NOT NULL DEFAULT false,
    "gateFailureReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gateWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "humanReviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "humanReviewReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "whyThisContact" TEXT,
    "recommendedChannel" "Channel",
    "recommendedNextAction" TEXT,
    "callerOpening" TEXT,
    "emailAngle" TEXT,
    "whatsappRecommendation" TEXT,
    "scoreBreakdown" JSONB,
    "assignedTo" TEXT,
    "currentStatus" "OutreachStatus" NOT NULL DEFAULT 'NEW',
    "nextFollowUpAt" TIMESTAMP(3),
    "lastScoredAt" TIMESTAMP(3),
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
    "callerId" TEXT NOT NULL,
    "callDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "CallOutcome" NOT NULL,
    "notes" TEXT,
    "nextAction" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailActivity" (
    "id" TEXT NOT NULL,
    "campaignContactId" TEXT NOT NULL,
    "emailType" "EmailType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'LOGGED_ONLY',
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
    "messageType" "WhatsAppMessageType" NOT NULL,
    "messageText" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'LOGGED_ONLY',
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
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "companyFitMax" INTEGER NOT NULL DEFAULT 25,
    "roleRelevanceMax" INTEGER NOT NULL DEFAULT 25,
    "triggerMax" INTEGER NOT NULL DEFAULT 20,
    "engagementMax" INTEGER NOT NULL DEFAULT 15,
    "dataQualityMax" INTEGER NOT NULL DEFAULT 10,
    "attendanceLikelihoodMax" INTEGER NOT NULL DEFAULT 5,
    "componentWeights" JSONB NOT NULL,
    "p1Threshold" INTEGER NOT NULL DEFAULT 80,
    "p2Threshold" INTEGER NOT NULL DEFAULT 60,
    "p3Threshold" INTEGER NOT NULL DEFAULT 40,
    "p1MinRoleRelevance" INTEGER NOT NULL DEFAULT 18,
    "p1MinDataQuality" INTEGER NOT NULL DEFAULT 7,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreAudit" (
    "id" TEXT NOT NULL,
    "campaignContactId" TEXT NOT NULL,
    "previousTotal" INTEGER,
    "newTotal" INTEGER NOT NULL,
    "previousPriority" "Priority",
    "newPriority" "Priority" NOT NULL,
    "reason" "ScoreChangeReason" NOT NULL,
    "detail" TEXT,
    "breakdown" JSONB,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryComplianceRule" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "permittedChannels" "Channel"[] DEFAULT ARRAY[]::"Channel"[],
    "prohibitedChannels" "Channel"[] DEFAULT ARRAY[]::"Channel"[],
    "requiresExplicitOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappRequiresOptIn" BOOLEAN NOT NULL DEFAULT true,
    "requiresLawfulBasis" BOOLEAN NOT NULL DEFAULT true,
    "requiresNotice" BOOLEAN NOT NULL DEFAULT false,
    "consentValidityDays" INTEGER,
    "policyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryComplianceRule_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Contact_lastVerifiedAt_idx" ON "Contact"("lastVerifiedAt");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_campaignType_idx" ON "Campaign"("campaignType");

-- CreateIndex
CREATE INDEX "CampaignContact_campaignId_priority_idx" ON "CampaignContact"("campaignId", "priority");

-- CreateIndex
CREATE INDEX "CampaignContact_assignedTo_idx" ON "CampaignContact"("assignedTo");

-- CreateIndex
CREATE INDEX "CampaignContact_currentStatus_idx" ON "CampaignContact"("currentStatus");

-- CreateIndex
CREATE INDEX "CampaignContact_totalScore_idx" ON "CampaignContact"("totalScore");

-- CreateIndex
CREATE INDEX "CampaignContact_nextFollowUpAt_idx" ON "CampaignContact"("nextFollowUpAt");

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
CREATE INDEX "CallActivity_outcome_idx" ON "CallActivity"("outcome");

-- CreateIndex
CREATE INDEX "EmailActivity_campaignContactId_idx" ON "EmailActivity"("campaignContactId");

-- CreateIndex
CREATE INDEX "EmailActivity_deliveryStatus_idx" ON "EmailActivity"("deliveryStatus");

-- CreateIndex
CREATE INDEX "WhatsAppActivity_campaignContactId_idx" ON "WhatsAppActivity"("campaignContactId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_country_idx" ON "ComplianceRecord"("country");

-- CreateIndex
CREATE INDEX "ComplianceRecord_optOutStatus_idx" ON "ComplianceRecord"("optOutStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRecord_contactId_key" ON "ComplianceRecord"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringConfig_campaignId_key" ON "ScoringConfig"("campaignId");

-- CreateIndex
CREATE INDEX "ScoreAudit_campaignContactId_idx" ON "ScoreAudit"("campaignContactId");

-- CreateIndex
CREATE INDEX "ScoreAudit_createdAt_idx" ON "ScoreAudit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CountryComplianceRule_country_key" ON "CountryComplianceRule"("country");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContact" ADD CONSTRAINT "CampaignContact_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallActivity" ADD CONSTRAINT "CallActivity_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallActivity" ADD CONSTRAINT "CallActivity_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailActivity" ADD CONSTRAINT "EmailActivity_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppActivity" ADD CONSTRAINT "WhatsAppActivity_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringConfig" ADD CONSTRAINT "ScoringConfig_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreAudit" ADD CONSTRAINT "ScoreAudit_campaignContactId_fkey" FOREIGN KEY ("campaignContactId") REFERENCES "CampaignContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreAudit" ADD CONSTRAINT "ScoreAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
