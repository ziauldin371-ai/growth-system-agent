import { BusinessEntity, GrowthEvidenceEntity, WebsiteCheckEntity, ContactEntity, OutreachStrategy } from '@/types';
import { AIOutreachOutput } from '@/lib/validation/schemas';

export interface GenerateOutreachContext {
  business: BusinessEntity;
  evidence: GrowthEvidenceEntity[];
  websiteCheck?: WebsiteCheckEntity | null;
  contact?: ContactEntity | null;
  strategy: OutreachStrategy;
  tone?: 'consultative' | 'direct' | 'technical' | 'concise';
  senderProfile: {
    name: string;
    title: string;
    specialization: string;
    calendlyOrBookingUrl?: string;
  };
}

export interface ILLMProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  generateOutreachDraft(context: GenerateOutreachContext): Promise<AIOutreachOutput>;
}
