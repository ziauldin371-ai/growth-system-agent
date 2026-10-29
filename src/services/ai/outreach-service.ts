import { ILLMProvider, GenerateOutreachContext } from './types';
import { MockLLMProvider } from './providers/mock-llm-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { AIOutreachOutput } from '@/lib/validation/schemas';

export class OutreachService {
  private providers: Map<string, ILLMProvider> = new Map();

  constructor() {
    this.registerProvider(new MockLLMProvider());
    this.registerProvider(new GeminiProvider());
  }

  public registerProvider(provider: ILLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProviders(): Array<{ id: string; name: string; isConfigured: boolean }> {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      isConfigured: p.isConfigured(),
    }));
  }

  public async generateDraft(
    context: GenerateOutreachContext,
    preferredProvider?: string
  ): Promise<{
    providerUsed: string;
    draft: AIOutreachOutput;
    warnings?: string[];
  }> {
    const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'mock';
    const providerId = preferredProvider || defaultProvider;
    const warnings: string[] = [];

    let provider = this.providers.get(providerId);
    if (!provider || !provider.isConfigured()) {
      if (providerId !== 'mock') {
        warnings.push(`LLM provider "${providerId}" is unconfigured or unavailable. Falling back to Grounded Mock Engine.`);
      }
      provider = this.providers.get('mock')!;
    }

    const draft = await provider.generateOutreachDraft(context);

    // Merge any service-level warnings with draft warnings
    if (warnings.length > 0) {
      draft.warnings.push(...warnings);
    }

    return {
      providerUsed: provider.id,
      draft,
      warnings: draft.warnings.length > 0 ? draft.warnings : undefined,
    };
  }
}

export const outreachService = new OutreachService();
