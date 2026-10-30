import { ILLMProvider, GenerateOutreachContext } from '../types';
import { AIOutreachOutput, AIOutreachOutputSchema } from '@/lib/validation/schemas';
import { wrapInSecurityBoundary } from '../prompt-defense';

export class GeminiProvider implements ILLMProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini AI Engine';

  public isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  }

  public getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  public async generateOutreachDraft(context: GenerateOutreachContext): Promise<AIOutreachOutput> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API is unconfigured: GEMINI_API_KEY environment variable is missing.');
    }

    const apiKey = process.env.GEMINI_API_KEY!;
    const model = this.getModelName();
    const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 25000;
    const { business, evidence = [], websiteCheck, contact, strategy, senderProfile } = context;

    // Collect and wrap untrusted external evidence strictly within security boundaries
    const rawExternalText = [
      `Company Name: ${business.name}`,
      `Industry: ${business.industry || 'Unknown'}`,
      `City/Country: ${business.city || 'Unknown'}, ${business.country || 'Unknown'}`,
      `Website Status: ${websiteCheck?.status || 'apparently_absent'}`,
      `Website Title: ${websiteCheck?.pageTitle || 'None'}`,
      `Verified Evidence from Public Registries / Places:\n${evidence.map(e => `- [${e.sourceName}] (${e.isFactual ? 'VERIFIED FACT' : 'INFERENCE'}): ${e.summary}`).join('\n')}`,
    ].join('\n\n');

    const { wrappedText } = wrapInSecurityBoundary('External Business Evidence', rawExternalText);

    // Pass 1: Grounded Generation Prompt
    const systemPrompt = `
You are an expert executive communication assistant for Zia Ul Din, a senior Full Stack AI Developer & Automation Architect specializing in LLMs, Python, Data Science, AI agents, workflow automation, and modern web systems.

TASK: Generate a concise, human, highly personalized, and strictly evidence-grounded outreach email for the business described in the data boundary.

STRICT OPERATIONAL RULES:
1. EVIDENCE-ONLY: ONLY use verified facts from the data boundary. NEVER invent revenue, funding, growth rates, employee counts, or non-existent problems.
2. WORD COUNT: The email body must be between 60 and 100 words. Busy operators do not read long emails.
3. STRUCTURE: One verified observation -> Why it matters commercially -> One concrete low-risk offer -> One soft, low-friction question -> Opt-out sentence.
4. OPT-OUT CLAUSE: Every email body MUST include this exact closing sentence before sign-off: "If you would prefer not to hear from me, just reply unsubscribe."
5. NO SPAM PHRASES: Never use "I hope this email finds you well", "I came across your website", "We are a leading agency", "quick synergy", or fake urgency.
6. SUBJECT LINES: Provide exactly 3 honest, relevant, non-clickbait subject lines.

OUTREACH STRATEGY: ${strategy}
SENDER: ${senderProfile.name}, ${senderProfile.title} (${senderProfile.specialization})
CONTACT RECIPIENT: ${contact?.fullName || 'Business Owner / Principal'}

OUTPUT FORMAT: Return raw valid JSON conforming strictly to the required schema with keys: researchSummary, observations, rationale, valueProposition, subjectLines, selectedSubject, emailBody, callToAction, serviceOffer.
`.trim();

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: wrappedText },
            { text: 'Produce the structured JSON output now.' },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.15, // Low temperature for high factual precision
        maxOutputTokens: 1500,
      },
    };

    // Send API key via header 'x-goog-api-key' (never in URL query string)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let response: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          break;
        }

        if (response.status === 429 || response.status >= 500) {
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000));
            continue;
          }
        }

        const errText = await response.text();
        throw new Error(`Gemini API returned error HTTP ${response.status}: ${errText}`);
      } catch (fetchErr: any) {
        clearTimeout(timer);
        if (attempts >= maxAttempts) {
          throw new Error(`Gemini API call failed after ${maxAttempts} attempts: ${fetchErr?.message}`);
        }
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }

    if (!response || !response.ok) {
      throw new Error('Gemini API call failed.');
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned an empty completion.');
    }

    const parsedJson = JSON.parse(candidateText);

    // Pass 2: Claim-Check Verification (verifies factual claims against stored evidence)
    const draftWarnings: string[] = [];
    try {
      const claimCheckPrompt = `
You are a strict compliance and factual verification gatekeeper.
Compare the generated email body against the provided verified evidence.
EMAIL BODY:
"${parsedJson.emailBody}"

VERIFIED EVIDENCE:
${rawExternalText}

TASK: Identify any ungrounded factual claims (invented growth, fabricated awards, non-existent revenue, fake customer reviews, or unverified facts).
OUTPUT FORMAT: JSON with boolean "allClaimsSupported" and array of strings "unsupportedClaims".
`.trim();

      const claimCheckController = new AbortController();
      const claimCheckTimer = setTimeout(() => claimCheckController.abort(), 12000);

      const claimCheckRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: claimCheckPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
        }),
        signal: claimCheckController.signal,
      });
      clearTimeout(claimCheckTimer);

      if (claimCheckRes.ok) {
        const claimData = await claimCheckRes.json();
        const claimJsonText = claimData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (claimJsonText) {
          const claimCheckOutput = JSON.parse(claimJsonText);
          if (!claimCheckOutput.allClaimsSupported && Array.isArray(claimCheckOutput.unsupportedClaims)) {
            draftWarnings.push(...claimCheckOutput.unsupportedClaims.map((c: string) => `Unsupported claim: ${c}`));
          }
        }
      }
    } catch {
      // Pass 2 check non-fatal timeout
    }

    if (!parsedJson.htmlBody && parsedJson.emailBody) {
      parsedJson.htmlBody = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.6;font-size:15px;">${parsedJson.emailBody.split('\n\n').map((p: string) => `<p style="margin:0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}</div>`;
    }

    parsedJson.warnings = [...(parsedJson.warnings || []), ...draftWarnings];
    return AIOutreachOutputSchema.parse(parsedJson);
  }
}
