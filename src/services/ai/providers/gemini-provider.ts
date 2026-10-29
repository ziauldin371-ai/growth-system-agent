import { ILLMProvider, GenerateOutreachContext } from '../types';
import { AIOutreachOutput, AIOutreachOutputSchema } from '@/lib/validation/schemas';
import { wrapInSecurityBoundary } from '../prompt-defense';

export class GeminiProvider implements ILLMProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini API (1.5 Flash)';

  public isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  }

  public async generateOutreachDraft(context: GenerateOutreachContext): Promise<AIOutreachOutput> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API is unconfigured: GEMINI_API_KEY environment variable is missing.');
    }

    const apiKey = process.env.GEMINI_API_KEY!;
    const { business, evidence = [], websiteCheck, contact, strategy, senderProfile } = context;

    // Collect and wrap untrusted data safely
    const rawExternalText = [
      `Company Name: ${business.name}`,
      `Industry: ${business.industry || 'Unknown'}`,
      `Website Status: ${websiteCheck?.status || 'apparently_absent'}`,
      `Website Title: ${websiteCheck?.pageTitle || 'None'}`,
      `Verified Evidence:\n${evidence.map(e => `- [${e.sourceName}] (${e.isFactual ? 'FACT' : 'INFERENCE'}): ${e.summary}`).join('\n')}`,
    ].join('\n\n');

    const { wrappedText } = wrapInSecurityBoundary('External Business Evidence', rawExternalText);

    const systemPrompt = `
You are an expert executive communication assistant for a senior Full Stack AI Developer & Automation Architect specializing in LLMs, Python, Data Science, AI agents, workflow automation, APIs, and modern full-stack systems.

TASK: Generate a concise, human, highly personalized, and professional outreach package for the business described in the data boundary.

STRICT OPERATIONAL RULES:
1. ONLY use verified facts from the data boundary. NEVER invent revenue, funding, growth rates, employee counts, or technical needs.
2. If data is missing, treat it as unknown and add a clear warning in the warnings array.
3. NEVER write generic spam phrases (e.g., "I came across your website", "Hope this email finds you well", "We are a leading agency").
4. Maintain a peer-to-peer, respectful, consultative tone.
5. Provide exactly 3 compelling, relevant subject lines.
6. The email body must be concise (under 130 words), specific, and offer clear commercial value.
7. Comply strictly with CAN-SPAM and UK PECR guidelines: no deception, clear sender identification, and accurate subjects.

OUTREACH STRATEGY: ${strategy}
SENDER: ${senderProfile.name}, ${senderProfile.title} (${senderProfile.specialization})
CONTACT RECIPIENT: ${contact?.fullName || 'Business Owner / Technical Lead'} (${contact?.title || 'Decision Maker'})

OUTPUT FORMAT: Return raw valid JSON conforming to the requested schema.
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
        temperature: 0.2, // Low temperature to maximize factual grounding
        maxOutputTokens: 1500,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned error ${response.status}: ${errText}`);
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned an empty completion.');
    }

    const parsedJson = JSON.parse(candidateText);
    return AIOutreachOutputSchema.parse(parsedJson);
  }
}
