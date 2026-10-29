import { z } from 'zod';

// Discovery Request Schema
export const DiscoveryRequestSchema = z.object({
  market: z.enum(['US', 'UK', 'CA', 'AU', 'EU', 'GLOBAL']),
  targetPipeline: z.enum(['website_opportunities', 'ai_software_opportunities', 'both']),
  industry: z.string().min(1).max(100),
  location: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  companyType: z.string().optional(),
  companySize: z.string().optional(),
  provider: z.enum(['auto', 'google_places', 'companies_house', 'b2b_mock']).default('auto'),
  limit: z.number().int().min(1).max(100).default(20),
});

export type DiscoveryRequest = z.infer<typeof DiscoveryRequestSchema>;

// Website Verification Output Schema
export const WebsiteVerificationSchema = z.object({
  domain: z.string().optional().nullable(),
  status: z.enum(['functional', 'apparently_absent', 'social_only', 'parked', 'broken', 'inconclusive']),
  dnsRecords: z.record(z.any()).optional().nullable(),
  httpStatusCode: z.number().int().optional().nullable(),
  tlsValid: z.boolean().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  isPrivateIp: z.boolean(),
  redirectChain: z.array(z.string()).optional().nullable(),
  socialUrls: z.array(z.string()).optional().nullable(),
  pageTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  verificationLatencyMs: z.number().optional().nullable(),
  errorDetails: z.string().optional().nullable(),
});

export type WebsiteVerificationResult = z.infer<typeof WebsiteVerificationSchema>;

// Structured AI Outreach Output Schema (Module 6 Requirement)
export const AIOutreachOutputSchema = z.object({
  researchSummary: z.string().min(20, 'Research summary must be substantive and grounded'),
  observations: z.array(
    z.object({
      fact: z.string().min(5),
      source: z.string().min(2),
      isVerified: z.boolean(),
    })
  ).min(1, 'At least one verified observation must be included'),
  rationale: z.string().min(20, 'Must explain why our development services are genuinely relevant'),
  valueProposition: z.string().min(20, 'Value proposition tailored to specific observed needs'),
  subjectLines: z.tuple([
    z.string().min(5).max(100),
    z.string().min(5).max(100),
    z.string().min(5).max(100),
  ]),
  selectedSubject: z.string().min(5).max(100),
  emailBody: z.string().min(50, 'Email body must be professional, human, and concise'),
  htmlBody: z.string().optional(),
  callToAction: z.string().min(10).max(150),
  serviceOffer: z.string().min(10),
  confidenceRating: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([]),
});

export type AIOutreachOutput = z.infer<typeof AIOutreachOutputSchema>;

// Campaign Approval Schema
export const CampaignApprovalSchema = z.object({
  leadId: z.string().uuid(),
  campaignId: z.string().uuid(),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

// Campaign Creation Schema
export const CreateCampaignSchema = z.object({
  name: z.string().min(3).max(100),
  targetPipeline: z.enum(['website_opportunities', 'ai_software_opportunities']),
  strategy: z.enum([
    'web_development',
    'ai_automation',
    'rag_systems',
    'python_engineering',
    'data_science',
    'agency_partner',
  ]),
  dailyCap: z.number().int().min(1).max(200).default(50),
  sendingWindowStart: z.number().int().min(0).max(23).default(9),
  sendingWindowEnd: z.number().int().min(0).max(23).default(17),
  requiresApproval: z.boolean().default(true),
});

// Suppression Input Schema
export const SuppressionInputSchema = z.object({
  type: z.enum(['email', 'domain', 'company']),
  value: z.string().min(1).max(255),
  reason: z.enum(['unsubscribe', 'hard_bounce', 'complaint', 'manual_dnc', 'legal_risk', 'competitor']),
  notes: z.string().optional(),
});

// Alternative Channel Update Schema
export const UpdateAlternativeChannelSchema = z.object({
  channelId: z.string().min(1),
  status: z.enum(['not_contacted', 'manually_contacted', 'replied', 'not_applicable']).optional(),
  reminderDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  customPitch: z.string().optional(),
});

// Gmail Test Send Schema
export const GmailTestSendSchema = z.object({
  recipientEmail: z.string().email(),
});
