import { ICPNicheEntity } from '@/types';

export const PLAYBOOK_ICP_NICHES: ICPNicheEntity[] = [
  {
    id: 'niche_saas_rag',
    title: 'SaaS Needing LLM & RAG Features',
    vertical: 'B2B Software & SaaS',
    targetRoles: ['Founder', 'CTO', 'VP Engineering', 'Head of AI', 'Head of Product'],
    triggerSignals: [
      'Customer support ticket backlog or complaints about slow support',
      'Knowledge-base documentation is large, complex or scattered',
      'Recent hiring for Python, NLP, or AI engineers',
      'Competitors recently launched GenAI or assistant features',
      'Product is data-intensive with complex search requirements'
    ],
    defaultOffer: 'Support knowledge-base chatbot with RAG & LangChain/LlamaIndex',
    sampleScope: 'End-to-end vector pipeline (Qdrant/Pinecone), semantic retrieval, chunking, citations, and hallucination guardrails integrated into web app in 2-3 weeks.',
    typicalPriceRange: '$2,500 - $5,000 POC (Operator configurable)',
    isActive: true,
  },
  {
    id: 'niche_ecom_forecasting',
    title: 'E-commerce Needing Demand Forecasting',
    vertical: 'E-commerce & Retail Brands',
    targetRoles: ['Founder', 'Head of Supply Chain', 'Chief Operating Officer', 'E-commerce Director'],
    triggerSignals: [
      'Seasonal stockouts or high storage fees from excess inventory',
      'SKU count over 100 with volatile reorder cycles',
      'Manual Excel-based reordering and inventory replenishment',
      'Fast revenue growth straining supply chain logistics'
    ],
    defaultOffer: 'Demand forecasting proof of concept & automated replenishment models',
    sampleScope: 'Time-series forecasting pipeline using historical sales, seasonality, and promotional trends with automated reorder alerts.',
    typicalPriceRange: '$2,000 - $4,500 POC (Operator configurable)',
    isActive: true,
  },
  {
    id: 'niche_fintech_risk',
    title: 'Fintech Needing Fraud & Risk Models',
    vertical: 'Fintech & Financial Services',
    targetRoles: ['CTO', 'Head of Risk', 'Head of Engineering', 'VP Compliance'],
    triggerSignals: [
      'Rapid transaction volume growth with rising chargebacks/flagged payments',
      'Manual risk review queue slowing user onboarding',
      'Strict regulatory requirements for auditable model reasoning'
    ],
    defaultOffer: 'Transaction anomaly detection & risk scoring pipeline',
    sampleScope: 'Supervised classification and anomaly detection models running inference on incoming transaction streams with sub-100ms latency.',
    typicalPriceRange: '$3,500 - $7,000 POC (Operator configurable)',
    isActive: true,
  },
  {
    id: 'niche_manufacturing_vision',
    title: 'Manufacturers Needing Computer Vision',
    vertical: 'Manufacturing & Industrial Production',
    targetRoles: ['Operations Director', 'Plant Manager', 'Head of Quality Assurance', 'VP Technology'],
    triggerSignals: [
      'High scrap rate or manual visual quality inspection bottlenecks',
      'Assembly line defect escapes leading to customer returns',
      'Safety compliance requirements in hazardous work areas'
    ],
    defaultOffer: 'Computer-vision quality inspection prototype (YOLO / OpenCV)',
    sampleScope: 'Edge or cloud-based visual inspection prototype capable of detecting surface flaws, assembly completeness, and packaging defects.',
    typicalPriceRange: '$3,000 - $6,000 POC (Operator configurable)',
    isActive: true,
  },
  {
    id: 'niche_healthcare_doc_extraction',
    title: 'Healthcare Software Needing Document Extraction',
    vertical: 'Healthcare Tech & Medical Billing',
    targetRoles: ['CTO', 'VP Engineering', 'Head of Product', 'Compliance Officer'],
    triggerSignals: [
      'High volume of incoming unstructured medical records, PDFs, or lab faxes',
      'Manual data entry teams transcribing claims and patient histories',
      'Strict HIPAA compliance and data privacy requirements'
    ],
    defaultOffer: 'Document extraction & validation pipeline (OCR + Schema Validation)',
    sampleScope: 'Structured extraction of key medical entities, lab values, and billing codes into FHIR/JSON schemas with human-in-the-loop review queue.',
    typicalPriceRange: '$3,000 - $6,500 POC (Operator configurable)',
    isActive: true,
  },
  {
    id: 'niche_local_websites',
    title: 'Local Businesses Needing Modern Websites',
    vertical: 'Local Commercial Trades & Clinics',
    targetRoles: ['Business Owner', 'Managing Partner', 'Director'],
    triggerSignals: [
      'Google Business Profile active with customer reviews but NO website link',
      'Existing website is broken, returns 500 error, or non-mobile responsive',
      'Competitors ranking higher in local search results'
    ],
    defaultOffer: 'High-converting modern business website in 10 days',
    sampleScope: 'Mobile-first responsive Next.js website with 1-click WhatsApp quote button, service menu, verified reviews showcase, and Google SEO optimization.',
    typicalPriceRange: '$500 - $1,500 fixed (Operator configurable)',
    isActive: true,
  },
];

export class ICPNicheManager {
  private niches: ICPNicheEntity[] = [...PLAYBOOK_ICP_NICHES];

  public getAllNiches(): ICPNicheEntity[] {
    return this.niches;
  }

  public getNicheById(id: string): ICPNicheEntity | undefined {
    return this.niches.find(n => n.id === id);
  }

  public getActiveNiche(): ICPNicheEntity {
    return this.niches.find(n => n.isActive) || this.niches[0];
  }

  public setActiveNiche(id: string): boolean {
    const target = this.niches.find(n => n.id === id);
    if (!target) return false;
    for (const n of this.niches) {
      n.isActive = n.id === id;
    }
    return true;
  }

  public updateNicheOffer(id: string, offer: { defaultOffer?: string; typicalPriceRange?: string; sampleScope?: string }): boolean {
    const target = this.niches.find(n => n.id === id);
    if (!target) return false;
    if (offer.defaultOffer) target.defaultOffer = offer.defaultOffer;
    if (offer.typicalPriceRange) target.typicalPriceRange = offer.typicalPriceRange;
    if (offer.sampleScope) target.sampleScope = offer.sampleScope;
    return true;
  }
}

export const icpNicheManager = new ICPNicheManager();

