import { ClientRequestEntity } from '@/types';
/**
 * Platform-Aware Human Pitch Generator
 * Produces honest, non-cliché pitches tailored to operator profile and target platform.
 */

import { lintPitchText, verifyPitchClaims } from './pitch-linter';
import { OperatorProfileEntity, RequestPitchEntity } from '@/types';

export interface GeneratedPitches {
  email: { variantA: RequestPitchEntity; variantB: RequestPitchEntity };
  platformMessage: { variantA: RequestPitchEntity; variantB: RequestPitchEntity };
  followUp: { variantA: RequestPitchEntity; variantB: RequestPitchEntity };
}

export function generatePitches(params: {
  requestId: string;
  sourcePlatform: string;
  needSummary: string;
  exactQuote: string;
  serviceFit: string;
  companyName?: string | null;
  personName?: string | null;
  platformUsername?: string | null;
  budget?: string | null;
  operatorProfile?: OperatorProfileEntity;
}): GeneratedPitches {
  const {
    requestId,
    sourcePlatform,
    needSummary,
    exactQuote,
    serviceFit,
    companyName,
    personName,
    platformUsername,
    budget,
    operatorProfile,
  } = params;

  const operatorName = operatorProfile?.name || 'Zia Ul Din';
  const mailingAddress = process.env.PHYSICAL_MAILING_ADDRESS || 'London, United Kingdom';
  const targetEntity = companyName || personName || 'your team';
  const firstName = personName ? personName.split(' ')[0] : null;

  // Short specific subject line without buzzwords or clickbait
  const emailSubjectA = `${serviceFit} for ${companyName || 'your project'}`;
  const emailSubjectB = `Question regarding your ${serviceFit.toLowerCase()} request`;

  // --- Email Variant A ---
  const emailBodyA = [
    firstName ? `Hi ${firstName},` : 'Hello,',
    `I saw your public note regarding ${needSummary.toLowerCase().replace('client requires ', '')}.`,
    `When setting up systems like this, I usually start by mapping the webhook flow and structuring error retries before connecting the production APIs. That keeps the integration resilient even during unexpected schema changes or rate limits.`,
    `I work independently as an automation and web developer with a focus on n8n, Python, and custom API pipelines.`,
    `Would you be open to a quick message exchange or a brief outline of how I would approach this for you?`,
    `Best regards,\n${operatorName}\n${mailingAddress}\nOpt-out: reply 'unsubscribe' to stop future notes.`,
  ].join('\n\n');

  // --- Email Variant B ---
  const emailBodyB = [
    firstName ? `Hi ${firstName},` : 'Hello,',
    `Regarding your posting about "${exactQuote.slice(0, 90)}":`,
    `A straightforward way to solve this is to break the workflow into two clean steps. First, normalize the incoming payload into standard JSON fields, then dispatch it via dedicated workers to prevent timeouts.`,
    `I build automated pipelines and web tools using Python and modern workflow engines.`,
    `If you have five minutes this week, I would be glad to share a quick architecture draft.`,
    `Kind regards,\n${operatorName}\n${mailingAddress}\nOpt-out: reply 'stop' to prevent further messages.`,
  ].join('\n\n');

  // --- Platform Message Variant A (respects platform rules) ---
  const isUpwork = sourcePlatform.toLowerCase().includes('upwork');
  const greeting = platformUsername ? `@${platformUsername}` : (firstName ? `Hi ${firstName}` : 'Hello');

  const platformMsgA = [
    `${greeting},`,
    `Regarding your post on ${sourcePlatform} about ${serviceFit.toLowerCase()}:`,
    `I specialize in building custom automation workflows, API integrations, and Python backend scripts. Based on what you outlined, this can be solved cleanly with modular error handling and structured payloads.`,
    isUpwork
      ? `I would be glad to deliver this directly through Upwork. Let me know if you would like to discuss the scope further.`
      : `Let me know if you would like me to outline the implementation steps for you here on ${sourcePlatform}.`,
    `— ${operatorName}`,
  ].join('\n\n');

  // --- Platform Message Variant B (shorter, LinkedIn / direct style) ---
  const platformMsgB = [
    `${greeting}, saw your post on ${sourcePlatform} regarding ${serviceFit.toLowerCase()}.`,
    `I build automated pipelines, n8n workflows, and Python data integrations. I can take care of this cleanly with robust retries and documentation.`,
    `Let me know if you are still looking for help with this.`,
    `Best,\n${operatorName}`,
  ].join('\n\n');

  // --- Follow-Up Note (after 4-5 days) ---
  const followUpA = [
    firstName ? `Hi ${firstName},` : 'Hello,',
    `Checking in briefly on your ${serviceFit.toLowerCase()} project.`,
    `If you have already filled this or solved the workflow, no problem at all. If you still need a developer to implement it, I am available to help.`,
    `Best,\n${operatorName}`,
  ].join('\n\n');

  const followUpB = [
    firstName ? `Hi ${firstName},` : 'Hello,',
    `I wanted to check if you still need assistance with ${needSummary.toLowerCase().replace('client requires ', '')}.`,
    `Happy to outline the technical steps whenever convenient.`,
    `Regards,\n${operatorName}`,
  ].join('\n\n');

  // Lint and verify each generated pitch
  const lintEmailA = lintPitchText(emailBodyA);
  const lintEmailB = lintPitchText(emailBodyB);
  const lintPlatA = lintPitchText(platformMsgA);
  const lintPlatB = lintPitchText(platformMsgB);
  const lintFollowA = lintPitchText(followUpA);
  const lintFollowB = lintPitchText(followUpB);

  const now = new Date().toISOString();

  return {
    email: {
      variantA: {
        id: `pitch-${requestId}-email-a`,
        requestId,
        channelType: 'email',
        variant: 'variant_a',
        subject: emailSubjectA,
        text: emailBodyA,
        readAloudPassed: lintEmailA.readAloudPassed,
        generatedAt: now,
      },
      variantB: {
        id: `pitch-${requestId}-email-b`,
        requestId,
        channelType: 'email',
        variant: 'variant_b',
        subject: emailSubjectB,
        text: emailBodyB,
        readAloudPassed: lintEmailB.readAloudPassed,
        generatedAt: now,
      },
    },
    platformMessage: {
      variantA: {
        id: `pitch-${requestId}-plat-a`,
        requestId,
        channelType: 'platform_message',
        variant: 'variant_a',
        text: platformMsgA,
        readAloudPassed: lintPlatA.readAloudPassed,
        generatedAt: now,
      },
      variantB: {
        id: `pitch-${requestId}-plat-b`,
        requestId,
        channelType: 'platform_message',
        variant: 'variant_b',
        text: platformMsgB,
        readAloudPassed: lintPlatB.readAloudPassed,
        generatedAt: now,
      },
    },
    followUp: {
      variantA: {
        id: `pitch-${requestId}-follow-a`,
        requestId,
        channelType: 'follow_up',
        variant: 'variant_a',
        text: followUpA,
        readAloudPassed: lintFollowA.readAloudPassed,
        generatedAt: now,
      },
      variantB: {
        id: `pitch-${requestId}-follow-b`,
        requestId,
        channelType: 'follow_up',
        variant: 'variant_b',
        text: followUpB,
        readAloudPassed: lintFollowB.readAloudPassed,
        generatedAt: now,
      },
    },
  };
}


export function generatePitchVariants(
  lead: ClientRequestEntity,
  operatorProfile?: OperatorProfileEntity
): RequestPitchEntity[] {
  const generated = generatePitches({
    requestId: lead.id,
    sourcePlatform: lead.sourcePlatform,
    needSummary: lead.needSummary,
    exactQuote: lead.quote,
    serviceFit: lead.serviceFit,
    companyName: lead.companyName,
    personName: lead.personName,
    platformUsername: lead.platformUsername,
    budget: lead.budget,
    operatorProfile,
  });

  return [
    generated.email.variantA,
    generated.email.variantB,
    generated.platformMessage.variantA,
    generated.platformMessage.variantB,
    generated.followUp.variantA,
    generated.followUp.variantB,
  ];
}
