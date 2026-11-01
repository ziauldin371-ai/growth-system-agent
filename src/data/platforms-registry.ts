export interface PlatformItem {
  id: string; // slug
  name: string;
  officialUrl: string;
  group: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  groupName: string;
  howClientsFound: string;
  whatISend: string;
  priority: 'High' | 'Medium' | 'Low';
  pitchType:
    | 'marketplace proposal'
    | 'network application'
    | 'directory profile + reply template'
    | 'cold email / LinkedIn note'
    | 'cold email / contact form message'
    | 'community reply'
    | 'not needed';
  freeToStart: boolean;
  pakistanEligibility: 'Not checked' | 'OK' | 'Not available';
  pakistanTermsUrl: string;
  costFees: string;
  steps: string[];
  searchIdeas: Array<{ label: string; query: string; searchUrl?: string }>;
  note?: string;
}

export interface LocalChannelItem {
  id: string;
  name: string;
  channelType: 'phone' | 'contact_form' | 'whatsapp' | 'facebook' | 'instagram' | 'linkedin' | 'email';
  howFound: string;
  whatISend: string;
  instructions: string;
}

export const LOCAL_BUSINESS_CHANNELS: LocalChannelItem[] = [
  {
    id: 'gbp_phone',
    name: 'Google Business Profile Phone',
    channelType: 'phone',
    howFound: 'Verified Google Places phone listing of local business without a modern site',
    whatISend: 'Phone script (template)',
    instructions: 'Call during standard business hours. Keep intro under 30 seconds. Check local do-not-call rules beforehand.'
  },
  {
    id: 'website_form',
    name: 'Website Contact Form',
    channelType: 'contact_form',
    howFound: 'Official contact or inquiry form discovered on business domain',
    whatISend: 'Short contact form note (60-90 words)',
    instructions: 'Reference an exact observable improvement on their site. Provide your business email for response.'
  },
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business',
    channelType: 'whatsapp',
    howFound: 'Public WhatsApp link or number listed on business profile or landing page',
    whatISend: 'Direct WhatsApp message (40-70 words)',
    instructions: 'Direct, polite, low-pressure introduction. Never mass-message or use automated bots.'
  },
  {
    id: 'facebook_page',
    name: 'Facebook Page Messenger',
    channelType: 'facebook',
    howFound: 'Active Facebook Page discovered in social footprint audit',
    whatISend: 'Page messenger note',
    instructions: 'Verify page activity first. Unverified profiles are labeled "Possible match (check before using)".'
  },
  {
    id: 'instagram_profile',
    name: 'Instagram Direct Message',
    channelType: 'instagram',
    howFound: 'Business Instagram profile discovered via domain audit',
    whatISend: 'Short DM with proof of work',
    instructions: 'Keep under 300 characters. Point to your portfolio without spamming.'
  },
  {
    id: 'linkedin_company',
    name: 'LinkedIn Company Page',
    channelType: 'linkedin',
    howFound: 'Official company LinkedIn page or founder profile',
    whatISend: 'Connection note (<= 300 chars) or InMail',
    instructions: 'Focus on business workflow automation. Respect connection limits.'
  },
  {
    id: 'verified_email',
    name: 'Direct Verified Email',
    channelType: 'email',
    howFound: 'MX-verified business contact email from domain',
    whatISend: 'Structured cold email with physical mailing address and opt-out link',
    instructions: 'Sent strictly through safe pipeline (verified DNS, suppression checked, spam-free copy).'
  }
];

export const CLIENT_PLATFORMS: PlatformItem[] = [
  // ==========================================
  // GROUP A: MARKETPLACES (14 platforms)
  // ==========================================
  {
    id: 'upwork',
    name: 'Upwork',
    officialUrl: 'https://www.upwork.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'search jobs, send proposals (Connects)',
    whatISend: 'proposal',
    priority: 'High',
    pitchType: 'marketplace proposal',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.upwork.com/terms',
    costFees: 'Free account; Connects required to submit proposals ($0.15/connect); 10% freelancer service fee on earnings',
    steps: [
      'Search for newly posted projects under AI Apps, n8n/Make automation, or Next.js web development.',
      'Check client history: verified payment method, 4.5+ star rating, and fair hire rate.',
      'Draft a customized 120-200 word proposal focusing directly on their technical bottleneck.',
      'Include 1 smart clarifying question and relevant portfolio links from your profile.',
      'Submit directly on Upwork; keep all preliminary client communications on-platform.'
    ],
    searchIdeas: [
      { label: 'n8n Automation', query: 'n8n automation', searchUrl: 'https://www.upwork.com/nx/search/jobs/?q=n8n%20automation' },
      { label: 'LLM Integration', query: 'LLM integration OpenAI API', searchUrl: 'https://www.upwork.com/nx/search/jobs/?q=LLM%20integration' },
      { label: 'RAG Chatbot', query: 'RAG chatbot langchain', searchUrl: 'https://www.upwork.com/nx/search/jobs/?q=RAG%20chatbot' },
      { label: 'Make.com Workflows', query: 'Make.com Integromat workflow', searchUrl: 'https://www.upwork.com/nx/search/jobs/?q=Make.com' },
      { label: 'Web Redesign Next.js', query: 'website redesign Next.js Tailwind', searchUrl: 'https://www.upwork.com/nx/search/jobs/?q=Next.js%20website' }
    ]
  },
  {
    id: 'freelancer',
    name: 'Freelancer.com',
    officialUrl: 'https://www.freelancer.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'bid on projects and contests',
    whatISend: 'proposal',
    priority: 'High',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.freelancer.com/terms',
    costFees: 'Free account with limited monthly bids; membership plans for more bids; 10% or $5 fee on projects',
    steps: [
      'Browse active projects filtered by Python, API Integration, and Web Development.',
      'Inspect client reviews, deposit status, and project budget.',
      'Submit a competitive bid specifying exact deliverables and milestone timelines.',
      'Attach concrete portfolio examples and respond immediately if client messages.'
    ],
    searchIdeas: [
      { label: 'Workflow Automation', query: 'workflow automation zapier n8n', searchUrl: 'https://www.freelancer.com/jobs/?keyword=workflow%20automation' },
      { label: 'AI Chatbot', query: 'AI chatbot python', searchUrl: 'https://www.freelancer.com/jobs/?keyword=AI%20chatbot' },
      { label: 'Small Business Website', query: 'small business website redesign', searchUrl: 'https://www.freelancer.com/jobs/?keyword=small%20business%20website' }
    ]
  },
  {
    id: 'peopleperhour',
    name: 'PeoplePerHour',
    officialUrl: 'https://www.peopleperhour.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'proposals and fixed-price Offers',
    whatISend: 'proposal',
    priority: 'High',
    pitchType: 'marketplace proposal',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.peopleperhour.com/terms',
    costFees: 'Freelancer application required; proposal credits apply; tiered service fee from 20% down to 3.5%',
    steps: [
      'Set up your freelancer profile with specific service tags (AI, Automation, Full-stack).',
      'Create 1-2 pre-packaged fixed-price Offers (e.g. "Complete n8n business automation setup").',
      'Pitch on buyer project streams with custom milestone estimates.',
      'Ensure initial escrow deposit is confirmed before starting work.'
    ],
    searchIdeas: [
      { label: 'Zapier & Make', query: 'zapier make automation', searchUrl: 'https://www.peopleperhour.com/freelance-jobs?q=zapier' },
      { label: 'Python Automation', query: 'python automation script', searchUrl: 'https://www.peopleperhour.com/freelance-jobs?q=python%20automation' },
      { label: 'AI Application', query: 'AI application web', searchUrl: 'https://www.peopleperhour.com/freelance-jobs?q=AI%20application' }
    ]
  },
  {
    id: 'guru',
    name: 'Guru',
    officialUrl: 'https://www.guru.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'search jobs, submit quotes',
    whatISend: 'proposal',
    priority: 'High',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.guru.com/terms',
    costFees: 'Free membership includes 10 bids/month; paid plans for higher allowances; 5-9% job fee',
    steps: [
      'Filter job listings by Programming & Development > Web Development / Automation.',
      'Check the employer verification badge and total spend.',
      'Submit a detailed quote defining milestone deliverables and estimated completion hours.',
      'Keep client interactions in Guru WorkRooms for escrow safety.'
    ],
    searchIdeas: [
      { label: 'API Integration', query: 'API integration webhook', searchUrl: 'https://www.guru.com/d/jobs/q/API-integration/' },
      { label: 'AI & Machine Learning', query: 'machine learning AI', searchUrl: 'https://www.guru.com/d/jobs/q/machine-learning/' }
    ]
  },
  {
    id: 'contra',
    name: 'Contra',
    officialUrl: 'https://contra.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'opportunities and applications, portfolio-led inbound',
    whatISend: 'proposal',
    priority: 'High',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://contra.com/terms',
    costFees: '0% commission for freelancers; optional Contra Pro subscription for elevated visibility',
    steps: [
      'Build a modern portfolio profile with 3 detailed case studies (Automation, RAG, Web app).',
      'Browse public Opportunities and submit applications highlighting relevant case studies.',
      'Share your Contra profile link in developer communities for direct client contracts.',
      'Manage contracts and milestone payouts commission-free through Contra Payments.'
    ],
    searchIdeas: [
      { label: 'AI Engineer Opportunities', query: 'AI engineer', searchUrl: 'https://contra.com/opportunities' },
      { label: 'Automation Specialist', query: 'automation specialist' }
    ]
  },
  {
    id: 'fiverr',
    name: 'Fiverr',
    officialUrl: 'https://www.fiverr.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'create gigs (inbound); answer buyer messages; check if Buyer Requests is available for my account',
    whatISend: 'gig description + reply template',
    priority: 'High',
    pitchType: 'directory profile + reply template',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.fiverr.com/terms_of_service',
    costFees: 'Free to join and publish gigs; 20% platform fee on all order revenues',
    steps: [
      'Publish 3 distinct gigs: "Custom n8n & Make Automation", "AI Chatbot / RAG System", and "Modern Fast Business Website".',
      'Add clear pricing tiers (Basic, Standard, Premium) with realistic delivery times.',
      'Check Buyer Requests / Get Briefs daily if active for your seller level.',
      'Respond to buyer messages within 1 hour using the structured reply template to maintain a 100% response rate.'
    ],
    searchIdeas: [
      { label: 'n8n Gig Research', query: 'n8n automation', searchUrl: 'https://www.fiverr.com/search/gigs?query=n8n%20automation' },
      { label: 'AI Chatbot Gigs', query: 'AI chatbot website', searchUrl: 'https://www.fiverr.com/search/gigs?query=AI%20chatbot' }
    ]
  },
  {
    id: 'workana',
    name: 'Workana',
    officialUrl: 'https://www.workana.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'apply to projects (Latin America focus)',
    whatISend: 'proposal',
    priority: 'Medium',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.workana.com/terms',
    costFees: 'Free account with monthly connects; plans available; tiered fee from 20% to 4.5%',
    steps: [
      'Create verified developer profile listing full-stack and automation skills.',
      'Filter for English/remote IT & Programming projects.',
      'Submit proposals with clear scope breakdown and milestones.',
      'Maintain quick response times on client inquiries.'
    ],
    searchIdeas: [
      { label: 'Web Development', query: 'web development', searchUrl: 'https://www.workana.com/jobs?category=it-programming' }
    ]
  },
  {
    id: 'truelancer',
    name: 'Truelancer',
    officialUrl: 'https://www.truelancer.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'bid on projects',
    whatISend: 'proposal',
    priority: 'Medium',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.truelancer.com/terms',
    costFees: 'Free membership with monthly proposal credits; fee between 8% - 10%',
    steps: [
      'Register developer profile and pass basic skill verification.',
      'Search for workflow scripting, web apps, and API integrations.',
      'Send tailored proposals highlighting direct execution experience.',
      'Deliver on milestones to build feedback ratings.'
    ],
    searchIdeas: [
      { label: 'API Development', query: 'API development python' }
    ]
  },
  {
    id: 'malt',
    name: 'Malt',
    officialUrl: 'https://www.malt.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'consultant profile, clients contact you (strong in Europe)',
    whatISend: 'profile + reply template',
    priority: 'Medium',
    pitchType: 'directory profile + reply template',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.malt.com/about/terms',
    costFees: 'Free profile registration; platform commission (approx 5-10%) on invoices',
    steps: [
      'Set up comprehensive consultant profile in English with your daily rate (TJM).',
      'List verified skills: AI Engineering, Python, Workflow Automation, Next.js.',
      'Wait for direct client inquiries from European enterprises and agencies.',
      'Reply within 24 hours with the inbound reply template and schedule scoping calls.'
    ],
    searchIdeas: [
      { label: 'Freelance AI Consultant', query: 'AI consultant' }
    ]
  },
  {
    id: 'kolabtree',
    name: 'Kolabtree',
    officialUrl: 'https://www.kolabtree.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'scientific/technical projects, expert proposals',
    whatISend: 'proposal',
    priority: 'High',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.kolabtree.com/terms',
    costFees: 'Free expert profile; service fee on completed projects',
    steps: [
      'Create an expert profile highlighting machine learning, data engineering, and technical algorithms.',
      'Browse technical/scientific consulting and implementation requests.',
      'Submit proposals referencing real technical architectures and data validation.',
      'Execute through Kolabtree milestone contracts.'
    ],
    searchIdeas: [
      { label: 'Machine Learning Expert', query: 'machine learning', searchUrl: 'https://www.kolabtree.com/find-freelance-experts' },
      { label: 'Data Science Consulting', query: 'data science' }
    ]
  },
  {
    id: 'codeable',
    name: 'Codeable',
    officialUrl: 'https://www.codeable.io',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'vetted WordPress/WooCommerce experts, apply then get project requests',
    whatISend: 'application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.codeable.io/terms',
    costFees: 'Application screening; standard hourly minimum ($70-$120/hr); platform fee added to client invoice',
    steps: [
      'Apply to join Codeable by submitting your development history and code samples.',
      'Pass technical coding test and professional communication screening.',
      'Once admitted, receive matched WordPress, WooCommerce, and API plugin requests.',
      'Collaborate in Codeable project workrooms adhering to strict pricing guidelines.'
    ],
    searchIdeas: [
      { label: 'Codeable Application', query: 'expert application', searchUrl: 'https://codeable.io/apply/' }
    ]
  },
  {
    id: 'codementor',
    name: 'Codementor',
    officialUrl: 'https://www.codementor.io',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'profile + project requests from developers/startups',
    whatISend: 'profile + reply template',
    priority: 'Medium',
    pitchType: 'directory profile + reply template',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.codementor.io/terms',
    costFees: 'Free mentor application; platform takes fee on mentoring sessions and freelance contracts',
    steps: [
      'Create mentor profile covering Python, JavaScript/TypeScript, Next.js, and API debugging.',
      'Answer open developer requests for urgent 1-on-1 assistance or freelance builds.',
      'Offer ongoing freelance contract support to solve larger automation bottlenecks.',
      'Build 5-star session ratings to rise in mentor search rankings.'
    ],
    searchIdeas: [
      { label: 'Freelance Jobs', query: 'freelance projects', searchUrl: 'https://www.codementor.io/freelance-jobs' }
    ]
  },
  {
    id: 'twine',
    name: 'Twine',
    officialUrl: 'https://www.twine.net',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'creative/tech freelance jobs',
    whatISend: 'proposal',
    priority: 'Low',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.twine.net/terms',
    costFees: 'Free profile; monthly pitch limit; paid pro membership available',
    steps: [
      'Build developer portfolio with live links.',
      'Search web development and AI freelance briefs.',
      'Submit concise pitches with links to similar work.'
    ],
    searchIdeas: [
      { label: 'Tech Jobs', query: 'web developer', searchUrl: 'https://www.twine.net/jobs' }
    ]
  },
  {
    id: 'freelancermap',
    name: 'Freelancermap',
    officialUrl: 'https://www.freelancermap.com',
    group: 'A',
    groupName: 'Marketplaces',
    howClientsFound: 'project listings and profile (mostly Europe)',
    whatISend: 'proposal',
    priority: 'Low',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.freelancermap.com/terms',
    costFees: 'Basic free profile; Premium membership allows direct contact to project posters',
    steps: [
      'Create IT profile targeting international remote contracts.',
      'Browse European software engineering and automation listings.',
      'Send direct applications to projects open to remote contractors.'
    ],
    searchIdeas: [
      { label: 'Remote IT Projects', query: 'remote python developer', searchUrl: 'https://www.freelancermap.com/it-projects.html' }
    ]
  },

  // ==========================================
  // GROUP B: VETTED NETWORKS (13 platforms)
  // Pitch type: network application (summary + proof links)
  // ==========================================
  {
    id: 'toptal',
    name: 'Toptal',
    officialUrl: 'https://www.toptal.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'apply once, pass screening, get matched; top 3% freelance talent network',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.toptal.com/terms',
    costFees: 'Free to apply; 0% fee deducted from freelancer rate (clients pay markup)',
    steps: [
      'Submit comprehensive developer application highlighting AI, Python, and full-stack engineering.',
      'Complete English language and professional communication screening.',
      'Pass algorithmic coding test (Codility) and live technical walkthrough.',
      'Complete a test project demonstrating clean architecture and documentation.',
      'Once admitted, get matched with enterprise clients with guaranteed hourly rates.'
    ],
    searchIdeas: [
      { label: 'Toptal Talent Application', query: 'apply as a freelancer', searchUrl: 'https://www.toptal.com/talent/apply' }
    ]
  },
  {
    id: 'braintrust',
    name: 'Braintrust',
    officialUrl: 'https://www.usebraintrust.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'user-owned talent network, enterprise project matching',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.usebraintrust.com/terms',
    costFees: '0% fee for freelancers (talent keeps 100% of earnings)',
    steps: [
      'Apply to the talent network with GitHub profile and verified project history.',
      'Complete domain-specific vetting in AI/ML or Web Engineering.',
      'Browse and apply directly to vetted enterprise jobs (Fortune 500 & high-growth tech).',
      'Receive client interview invitations and negotiate hourly contracts.'
    ],
    searchIdeas: [
      { label: 'Braintrust Jobs', query: 'enterprise freelance jobs', searchUrl: 'https://app.usebraintrust.com/jobs/' }
    ]
  },
  {
    id: 'arc-dev',
    name: 'Arc.dev',
    officialUrl: 'https://arc.dev',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'remote developer matching platform for startups and scaleups',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://arc.dev/terms',
    costFees: 'Free to join; pass screening to become a "Fast Track" verified developer',
    steps: [
      'Create profile and connect GitHub repository.',
      'Take 30-minute online coding assessment in your core language.',
      'Complete video technical interview with senior engineer.',
      'Get featured to US/European tech companies seeking vetted contract developers.'
    ],
    searchIdeas: [
      { label: 'Arc Remote Jobs', query: 'remote software developer', searchUrl: 'https://arc.dev/remote-jobs' }
    ]
  },
  {
    id: 'lemon-io',
    name: 'Lemon.io',
    officialUrl: 'https://lemon.io',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'vetted marketplace matching developers with early-stage startups',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://lemon.io/terms-of-use/',
    costFees: 'Free for developers; startups pay platform fee on top of agreed contractor rate',
    steps: [
      'Apply with CV and GitHub showcasing real production web applications.',
      'Pass language screening and technical coding session.',
      'Get introduced directly to startup founders ready to hire within 48 hours.',
      'Work on ongoing hourly retainers managed by Lemon.io.'
    ],
    searchIdeas: [
      { label: 'Lemon Developer Application', query: 'apply as developer', searchUrl: 'https://lemon.io/for-developers/' }
    ]
  },
  {
    id: 'gun-io',
    name: 'Gun.io',
    officialUrl: 'https://gun.io',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'peer-vetted freelance software engineering network',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://gun.io/terms/',
    costFees: 'Free for developers; transparent margin added for clients',
    steps: [
      'Submit application with detailed engineering background.',
      'Complete 1-on-1 technical vetting with an active Gun.io staff engineer.',
      'Receive matched job recommendations tailored to your rate and availability.',
      'Work directly with client product teams with Gun.io billing support.'
    ],
    searchIdeas: [
      { label: 'Gun.io Join Talent', query: 'hire developers freelance', searchUrl: 'https://www.gun.io/join-talent' }
    ]
  },
  {
    id: 'a-team',
    name: 'A.Team',
    officialUrl: 'https://www.a.team',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'invite-only network of senior builders deployed in small squads',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.a.team/terms-of-service',
    costFees: 'Free to join; compensation agreed per squad mission',
    steps: [
      'Submit application detailing senior product/engineering contributions.',
      'Pass portfolio review demonstrating ownership of shipped products.',
      'Join collaborative missions alongside senior designers and engineers.',
      'Deliver high-impact digital products for venture-backed companies.'
    ],
    searchIdeas: [
      { label: 'A.Team Builder Network', query: 'apply to a-team', searchUrl: 'https://www.a.team/join' }
    ]
  },
  {
    id: 'andela',
    name: 'Andela',
    officialUrl: 'https://www.andela.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'global talent network connecting engineers with enterprise tech leaders',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.andela.com/terms',
    costFees: 'Free to join and apply for global contracts',
    steps: [
      'Register for Andela Talent Network and complete profile.',
      'Complete technical skill assessment and coding verification.',
      'Get matched with long-term remote engineering placements.',
      'Receive steady international contractor payments.'
    ],
    searchIdeas: [
      { label: 'Andela Talent Portal', query: 'join andela talent network', searchUrl: 'https://www.andela.com/join' }
    ]
  },
  {
    id: 'flexiple',
    name: 'Flexiple',
    officialUrl: 'https://flexiple.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'invite-only freelance network of top developers and designers',
    whatISend: 'network application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://flexiple.com/terms-of-service',
    costFees: 'Free for freelancers; 0% commission deducted from talent rate',
    steps: [
      'Apply with resume and code samples.',
      'Pass technical coding interview and project evaluation.',
      'Get matched 1-on-1 with hiring managers seeking specialized contractors.'
    ],
    searchIdeas: [
      { label: 'Flexiple Apply', query: 'freelance developer network', searchUrl: 'https://flexiple.com/developers' }
    ]
  },
  {
    id: 'index-dev',
    name: 'Index.dev',
    officialUrl: 'https://www.index.dev',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'remote tech recruitment platform matching vetted engineers with US/EU firms',
    whatISend: 'network application',
    priority: 'High',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.index.dev/terms',
    costFees: 'Free for talent; competitive long-term monthly contractor salaries',
    steps: [
      'Complete developer onboarding profile.',
      'Pass automated tech stack assessment and English proficiency interview.',
      'Interview directly with client tech leads for full-time remote contracts.'
    ],
    searchIdeas: [
      { label: 'Index.dev Jobs', query: 'remote jobs index.dev', searchUrl: 'https://www.index.dev/jobs' }
    ]
  },
  {
    id: 'revelo',
    name: 'Revelo',
    officialUrl: 'https://www.revelo.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'remote talent platform connecting US companies with global tech talent',
    whatISend: 'network application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.revelo.com/terms-of-service',
    costFees: 'Free for developers; check eligibility rules regarding nearshore versus global talent',
    steps: [
      'Create profile highlighting engineering stack and timezone compatibility.',
      'Verify eligibility for global roles.',
      'Interview with US tech clients.'
    ],
    searchIdeas: [
      { label: 'Revelo Apply', query: 'apply revelo developer', searchUrl: 'https://www.revelo.com/careers' }
    ]
  },
  {
    id: 'turing',
    name: 'Turing',
    officialUrl: 'https://www.turing.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'AI-powered talent cloud matching remote software engineers globally',
    whatISend: 'network application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.turing.com/terms-of-service',
    costFees: 'Free to test and apply; clients pay markup',
    steps: [
      'Register and complete comprehensive Turing automated testing (MCQs & coding challenges).',
      'Pass tech stack tests for Python, AI/ML, and Web frameworks.',
      'Get matched automatically by the Turing algorithm with US companies.'
    ],
    searchIdeas: [
      { label: 'Turing Developer Portal', query: 'turing software developer jobs', searchUrl: 'https://www.turing.com/jobs' }
    ]
  },
  {
    id: 'catalant',
    name: 'Catalant',
    officialUrl: 'https://catalant.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'expert marketplace for strategic consultants and executive operators',
    whatISend: 'network application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://catalant.com/terms/',
    costFees: 'Free profile; platform fee applies; restrictive geographic and seniority requirements',
    steps: [
      'Apply as an independent technical consultant.',
      'Check geographic eligibility and tax documentation requirements.',
      'Pitch on corporate digital transformation and automation initiatives.'
    ],
    searchIdeas: [
      { label: 'Catalant Experts', query: 'independent consultant network', searchUrl: 'https://catalant.com/experts/' }
    ]
  },
  {
    id: 'graphite',
    name: 'Graphite',
    officialUrl: 'https://www.graphite.com',
    group: 'B',
    groupName: 'Vetted Networks',
    howClientsFound: 'on-demand network of boutique consultants and senior technical talent',
    whatISend: 'network application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.graphite.com/terms',
    costFees: 'Free to join; platform takes fee on corporate contracts',
    steps: [
      'Create detailed expert profile with past enterprise projects.',
      'Pass background verification and compliance review.',
      'Respond to matched corporate requests for automation and AI advisory.'
    ],
    searchIdeas: [
      { label: 'Graphite Experts', query: 'expert network consulting', searchUrl: 'https://www.graphite.com/experts' }
    ]
  },

  // ==========================================
  // GROUP C: AI-SPECIFIC (3 platforms)
  // ==========================================
  {
    id: 'aiixx',
    name: 'AI IXX',
    officialUrl: 'https://www.aiixx.ai/freelance',
    group: 'C',
    groupName: 'AI-Specific',
    howClientsFound: 'browse/apply to AI projects (NLP, computer vision, ML)',
    whatISend: 'proposal',
    priority: 'High',
    pitchType: 'marketplace proposal',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.aiixx.ai',
    costFees: 'Check on official site; project commissions vary',
    steps: [
      'Create AI developer profile with specializations in NLP, RAG, and Computer Vision.',
      'Browse active client briefs specifically requesting applied machine learning.',
      'Submit detailed technical proposals including architecture diagrams and evaluation metrics.',
      'Deliver validated AI models or API integrations.'
    ],
    searchIdeas: [
      { label: 'AI Projects', query: 'NLP computer vision projects', searchUrl: 'https://www.aiixx.ai/freelance' }
    ]
  },
  {
    id: 'meridial',
    name: 'Meridial',
    officialUrl: 'https://www.meridial.ai',
    group: 'C',
    groupName: 'AI-Specific',
    howClientsFound: 'AI expert profile and engagements (more AI evaluation / training than client builds)',
    whatISend: 'application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.meridial.ai',
    costFees: 'Check on site; hourly compensation for model evaluation and specialized labeling',
    steps: [
      'Apply as an AI subject-matter expert or code evaluation specialist.',
      'Complete technical benchmark assessments in code generation and reasoning.',
      'Participate in high-tier AI model evaluation and RLHF contract tasks.'
    ],
    searchIdeas: [
      { label: 'AI Evaluation Contracts', query: 'AI expert application', searchUrl: 'https://www.meridial.ai' }
    ]
  },
  {
    id: 'mercor',
    name: 'Mercor',
    officialUrl: 'https://mercor.com',
    group: 'C',
    groupName: 'AI-Specific',
    howClientsFound: 'AI expert contracts (mostly evaluation / training work)',
    whatISend: 'application',
    priority: 'Medium',
    pitchType: 'network application',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://mercor.com',
    costFees: 'Check on site; direct hourly/project pay for AI training and development',
    steps: [
      'Complete automated AI video interview and code screening on Mercor.',
      'Connect GitHub and highlight AI/ML system architecture experience.',
      'Receive offers for AI evaluation, benchmark construction, or frontier model development.'
    ],
    searchIdeas: [
      { label: 'Mercor AI Roles', query: 'AI software engineer contracts', searchUrl: 'https://mercor.com' }
    ]
  },

  // ==========================================
  // GROUP D: AUTOMATION / NO-CODE / WEB ECOSYSTEM DIRECTORIES (7 platforms)
  // Pitch type: directory profile + reply template
  // ==========================================
  {
    id: 'make-partners',
    name: 'Make Partners Directory',
    officialUrl: 'https://www.make.com/en/partners-directory',
    group: 'D',
    groupName: 'Automation & Web Directories',
    howClientsFound: 'clients look for certified Make automation experts',
    whatISend: 'directory profile + reply template',
    priority: 'High',
    pitchType: 'directory profile + reply template',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.make.com/en/partners',
    costFees: 'Partner certification prerequisites; verify current partner tiers and fees on official site',
    steps: [
      'Complete Make Academy certifications (Foundation, Operations, Integration).',
      'Apply to the official Make Partner Program with evidence of client implementations.',
      'Publish certified partner profile on the directory for inbound buyer leads.',
      'Use the inbound reply template to qualify project leads within 24 hours.'
    ],
    searchIdeas: [
      { label: 'Make Partner Directory', query: 'Make partners directory', searchUrl: 'https://www.make.com/en/partners-directory' }
    ],
    note: 'Verify the exact page, application rules and eligibility on the official site.'
  },
  {
    id: 'zapier-experts',
    name: 'Zapier Expert Directory',
    officialUrl: 'https://zapier.com/experts',
    group: 'D',
    groupName: 'Automation & Web Directories',
    howClientsFound: 'businesses look for vetted Zapier Certified Experts to automate operations',
    whatISend: 'directory profile + reply template',
    priority: 'High',
    pitchType: 'directory profile + reply template',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://zapier.com/experts',
    costFees: 'Zapier Certified Expert exam requirements; verify on official site',
    steps: [
      'Pass the Zapier Certified Expert exam and build 3 production Zap templates.',
      'Apply to the Zapier Experts directory with case studies.',
      'Receive inbound project requests from businesses searching by industry.',
      'Respond quickly using the ready consultation response script.'
    ],
    searchIdeas: [
      { label: 'Zapier Experts Search', query: 'find a zapier expert', searchUrl: 'https://zapier.com/experts' }
    ],
    note: 'Verify the exact page, application rules and eligibility on the official site.'
  },
  {
    id: 'n8n-experts',
    name: 'n8n (Experts / community programs)',
    officialUrl: 'https://n8n.io',
    group: 'D',
    groupName: 'Automation & Web Directories',
    howClientsFound: 'businesses look for n8n workflow specialists in community and expert networks',
    whatISend: 'directory profile + reply template',
    priority: 'High',
    pitchType: 'directory profile + reply template',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://n8n.io/legal',
    costFees: 'Free community participation; check official partner/creator program terms',
    steps: [
      'Contribute custom workflow nodes or publish reusable templates to the n8n community.',
      'Participate actively in the n8n forum solving advanced self-hosted / API questions.',
      'Apply for n8n creator/partner directory programs as they become available.',
      'Convert community inquiries into direct automation implementation contracts.'
    ],
    searchIdeas: [
      { label: 'n8n Community Forum', query: 'n8n workflow help hire', searchUrl: 'https://community.n8n.io/' }
    ],
    note: 'Verify the exact page, application rules and eligibility on the official site.'
  },
  {
    id: 'webflow-experts',
    name: 'Webflow Experts / Partners',
    officialUrl: 'https://webflow.com',
    group: 'D',
    groupName: 'Automation & Web Directories',
    howClientsFound: 'clients search certified Webflow development partners',
    whatISend: 'directory profile + reply template',
    priority: 'Medium',
    pitchType: 'directory profile + reply template',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://webflow.com/terms',
    costFees: 'Partner certification and exam requirements; verify on official site',
    steps: [
      'Complete Webflow University certifications and build 3 polished production sites.',
      'Apply for Webflow Certified Expert status.',
      'List your services in the Webflow Partner directory.',
      'Provide rapid turnaround proposals to prospective clients.'
    ],
    searchIdeas: [
      { label: 'Webflow Experts Directory', query: 'webflow certified experts', searchUrl: 'https://experts.webflow.com/' }
    ],
    note: 'Verify the exact page, application rules and eligibility on the official site.'
  },
  {
    id: 'shopify-partners',
    name: 'Shopify Partners / Experts',
    officialUrl: 'https://www.shopify.com/partners',
    group: 'D',
    groupName: 'Automation & Web Directories',
    howClientsFound: 'merchants seek certified Shopify developers for custom stores and app integrations',
    whatISend: 'directory profile + reply template',
    priority: 'Medium',
    pitchType: 'directory profile + reply template',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.shopify.com/partners/terms',
    costFees: 'Free partner account; revenue share on app/theme sales and referral bounties',
    steps: [
      'Register a Shopify Partner account and complete Shopify Academy certifications.',
      'Build development stores or custom apps connecting Shopify to AI/automation backends.',
      'Qualify for the Shopify Experts directory by meeting merchant satisfaction benchmarks.',
      'Pitch custom automation (inventory sync, automated customer response) to store owners.'
    ],
    searchIdeas: [
      { label: 'Shopify Partner Program', query: 'shopify partner program', searchUrl: 'https://www.shopify.com/partners' }
    ],
    note: 'Verify the exact page, application rules and eligibility on the official site.'
  },
  {
    id: 'hubspot-solutions',
    name: 'HubSpot Solutions Directory',
    officialUrl: 'https://ecosystem.hubspot.com/marketplace/solutions',
    group: 'D',
    groupName: 'Automation & Web Directories',
    howClientsFound: 'businesses look for accredited HubSpot CRM, marketing, and integration specialists',
    whatISend: 'directory profile + reply template',
    priority: 'Medium',
    pitchType: 'directory profile + reply template',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://legal.hubspot.com/partner-terms',
    costFees: 'Solutions Partner program requirements; verify on official site',
    steps: [
      'Pass HubSpot Academy certifications in CRM, API Integrations, and Marketing Automation.',
      'Apply to the Solutions Provider / Partner Directory.',
      'Publish integration services linking HubSpot to custom web apps and AI pipelines.',
      'Respond to inbound service requests from mid-market teams.'
    ],
    searchIdeas: [
      { label: 'HubSpot Solutions Search', query: 'hubspot integration partner', searchUrl: 'https://ecosystem.hubspot.com/marketplace/solutions' }
    ],
    note: 'Verify the exact page, application rules and eligibility on the official site.'
  },
  {
    id: 'bubble-hire',
    name: 'Bubble (hire an expert)',
    officialUrl: 'https://bubble.io/hire',
    group: 'D',
    groupName: 'Automation & Web Directories',
    howClientsFound: 'startups hire vetted agency and freelance Bubble no-code developers',
    whatISend: 'directory profile + reply template',
    priority: 'Low',
    pitchType: 'directory profile + reply template',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://bubble.io/terms',
    costFees: 'Bubble certification fee; verify on official site',
    steps: [
      'Pass the Bubble Developer Certification exam.',
      'Create an expert profile showcasing complex no-code/hybrid database applications.',
      'Receive inbound project inquiries from founders building MVPs.'
    ],
    searchIdeas: [
      { label: 'Bubble Hire Experts', query: 'bubble certified experts', searchUrl: 'https://bubble.io/hire' }
    ],
    note: 'Verify the exact page, application rules and eligibility on the official site.'
  },

  // ==========================================
  // GROUP E: LEAD DATABASES AND CONTACT FINDERS (12 platforms)
  // Pitch type: cold email / LinkedIn note via own pipeline
  // Mark: "Not connected" until API key added
  // ==========================================
  {
    id: 'apollo-io',
    name: 'Apollo.io',
    officialUrl: 'https://www.apollo.io',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'find the right person at a target company via B2B database',
    whatISend: 'cold email / LinkedIn note',
    priority: 'High',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.apollo.io/terms',
    costFees: 'Free tier with limited monthly credits; paid plans from $49/mo; integration only through official API or CSV import',
    steps: [
      'Search for decision makers (Founders, CTOs, Operations Heads) in target industries.',
      'Export verified business emails via CSV or official API (never automated scraping).',
      'Run email through local DNS/MX verifier and suppression check.',
      'Send custom value pitch with physical address and opt-out link from your own safe pipeline.'
    ],
    searchIdeas: [
      { label: 'Search US Founders', query: 'Founder CEO operations small business' }
    ],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'clay',
    name: 'Clay',
    officialUrl: 'https://www.clay.com',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'data enrichment and prospecting workflows across 50+ providers',
    whatISend: 'cold email / LinkedIn note',
    priority: 'High',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.clay.com/terms',
    costFees: 'Free trial; credit-based pricing for enrichments; API / webhook integration',
    steps: [
      'Build a Clay workbook enriched with company tech stacks and funding signals.',
      'Identify companies with missing or slow web platforms or manual workflows.',
      'Export enriched lead list with verified emails.',
      'Draft personalized, evidence-grounded pitches in this application.'
    ],
    searchIdeas: [
      { label: 'Enrichment Recipes', query: 'clay data enrichment workflows' }
    ],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'hunter-io',
    name: 'Hunter.io',
    officialUrl: 'https://hunter.io',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'domain search and email verification for target companies',
    whatISend: 'cold email / LinkedIn note',
    priority: 'High',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://hunter.io/terms',
    costFees: 'Free tier with 25 searches/month; paid tiers for API volume',
    steps: [
      'Input target company domain to identify corporate email patterns.',
      'Verify deliverability score through Hunter API before dispatch.',
      'Send tailored cold email through your own verified Gmail setup.'
    ],
    searchIdeas: [
      { label: 'Domain Search', query: 'domain email pattern' }
    ],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'snov-io',
    name: 'Snov.io',
    officialUrl: 'https://snov.io',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'B2B lead generation and email validation tool',
    whatISend: 'cold email / LinkedIn note',
    priority: 'High',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://snov.io/terms-of-service',
    costFees: 'Free trial; monthly credit subscription',
    steps: [
      'Search target decision makers by industry and job title.',
      'Export verified CSV and import into this application.',
      'Contact manually or via single approved review queue.'
    ],
    searchIdeas: [
      { label: 'B2B Lead Search', query: 'target companies B2B' }
    ],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'linkedin-sales-navigator',
    name: 'LinkedIn Sales Navigator',
    officialUrl: 'https://business.linkedin.com/sales-solutions/sales-navigator',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'deep search across LinkedIn members with account and lead filters',
    whatISend: 'cold email / LinkedIn note',
    priority: 'High',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.linkedin.com/legal/user-agreement',
    costFees: 'Monthly subscription ($79-$130+/mo); strictly manual use only, no automated scraping or bot extensions',
    steps: [
      'Use lead filters: Company Headcount (11-50), Function (Operations/Engineering), Title (Owner, VP, Founder).',
      'Look for recent hiring or tech changes on company profile.',
      'Send personalized manual connection note (<= 300 characters, zero spam words).',
      'Follow up only once if they accept and express interest.'
    ],
    searchIdeas: [
      { label: 'Search Small Business Owners', query: 'Owner Founder small business IT' }
    ],
    note: 'Manual use only, no automation.'
  },
  {
    id: 'lusha',
    name: 'Lusha',
    officialUrl: 'https://www.lusha.com',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'B2B contact details and phone number intelligence',
    whatISend: 'cold email / LinkedIn note',
    priority: 'Medium',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.lusha.com/legal/terms_and_conditions/',
    costFees: 'Free tier with 5 credits/mo; paid plans for higher volume',
    steps: [
      'Search company domain for direct phone and email records.',
      'Verify contact legitimacy before outreach.'
    ],
    searchIdeas: [{ label: 'Direct Phone & Email', query: 'B2B contact verification' }],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'rocketreach',
    name: 'RocketReach',
    officialUrl: 'https://rocketreach.co',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'verified emails and phone numbers for professionals',
    whatISend: 'cold email / LinkedIn note',
    priority: 'Medium',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://rocketreach.co/terms',
    costFees: 'Credit-based subscription; API available',
    steps: [
      'Lookup specific founders or technical directors at target firms.',
      'Import verified business address into outreach pipeline.'
    ],
    searchIdeas: [{ label: 'Company Lookup', query: 'target executive email' }],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'leadiq',
    name: 'LeadIQ',
    officialUrl: 'https://leadiq.com',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'prospecting data and contact capture platform',
    whatISend: 'cold email / LinkedIn note',
    priority: 'Medium',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://leadiq.com/terms',
    costFees: 'Credit tier plans; official integrations with CRMs',
    steps: [
      'Identify decision makers at high-growth companies.',
      'Export verified contacts to CSV.'
    ],
    searchIdeas: [{ label: 'Prospect Capture', query: 'lead enrichment' }],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'seamless-ai',
    name: 'Seamless.AI',
    officialUrl: 'https://seamless.ai',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'real-time B2B search engine for sales leads',
    whatISend: 'cold email / LinkedIn note',
    priority: 'Medium',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://seamless.ai/terms',
    costFees: 'Credit-based pricing tiers',
    steps: [
      'Search company lists matching your ideal customer profile.',
      'Verify contact info with real-time validation engine.'
    ],
    searchIdeas: [{ label: 'Real-time B2B Search', query: 'business contacts' }],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'uplead',
    name: 'UpLead',
    officialUrl: 'https://www.uplead.com',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'B2B database with 95% data accuracy guarantee',
    whatISend: 'cold email / LinkedIn note',
    priority: 'Medium',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.uplead.com/terms',
    costFees: 'Trial with credits; paid subscription per month',
    steps: [
      'Filter leads by technology used (e.g. companies using outdated CMS or manual forms).',
      'Download clean list with verified emails.'
    ],
    searchIdeas: [{ label: 'Tech Stack Filter', query: 'technology filter prospecting' }],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'kaspr',
    name: 'Kaspr',
    officialUrl: 'https://www.kaspr.io',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'all-in-one B2B prospecting tool, strong in European contacts',
    whatISend: 'cold email / LinkedIn note',
    priority: 'Medium',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.kaspr.io/terms-of-use',
    costFees: 'Free credits available; monthly plans',
    steps: [
      'Find verified B2B email addresses for European SMEs.',
      'Use for manual email outreach.'
    ],
    searchIdeas: [{ label: 'European Prospecting', query: 'SME B2B email lookup' }],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },
  {
    id: 'findymail',
    name: 'Findymail',
    officialUrl: 'https://www.findymail.com',
    group: 'E',
    groupName: 'Lead Databases & Contact Finders',
    howClientsFound: 'high-accuracy email finder and cleaning service',
    whatISend: 'cold email / LinkedIn note',
    priority: 'Medium',
    pitchType: 'cold email / LinkedIn note',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.findymail.com/terms',
    costFees: 'Pay-per-valid-email credit model',
    steps: [
      'Clean prospective email lists to eliminate invalid and catch-all addresses.',
      'Protect domain sender reputation.'
    ],
    searchIdeas: [{ label: 'Email Cleaning', query: 'verify B2B email address' }],
    note: 'Integration only through official APIs or CSV import; mark "Not connected" until I add a key.'
  },

  // ==========================================
  // GROUP F: COMPANY RESEARCH AND DIRECTORIES (13 platforms)
  // Pitch type: cold email / contact form message
  // ==========================================
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    officialUrl: 'https://www.crunchbase.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'find companies that may need me (funded / growing companies, AI hiring signals)',
    whatISend: 'cold email / contact form message',
    priority: 'High',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.crunchbase.com/terms',
    costFees: 'Free basic company profiles; Crunchbase Pro subscription for advanced funding filters',
    steps: [
      'Filter for companies that recently raised Seed or Series A funding.',
      'Look for hiring signals in engineering, AI, or operations.',
      'Identify their current technical bottleneck or product roadmap goal.',
      'Send a crisp 80-120 word idea pitch proposing a specific automation or AI prototype.'
    ],
    searchIdeas: [
      { label: 'Recently Funded AI Startups', query: 'funded AI startups', searchUrl: 'https://www.crunchbase.com/discover/funding_rounds' }
    ]
  },
  {
    id: 'clutch',
    name: 'Clutch',
    officialUrl: 'https://clutch.co',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'find agencies, SaaS companies, and buyers of dev/AI services',
    whatISend: 'cold email / contact form message',
    priority: 'High',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://clutch.co/terms-of-service',
    costFees: 'Free company directory browsing; paid vendor sponsorships',
    steps: [
      'Browse digital agencies, marketing firms, and software houses with 5-30 employees.',
      'Review their client case studies to identify if they lack dedicated AI/workflow automation capacity.',
      'Pitch yourself as a reliable white-label or sub-contract development partner.',
      'Send proposal via their official partnership contact form or leadership email.'
    ],
    searchIdeas: [
      { label: 'Digital Agencies', query: 'digital agencies web development', searchUrl: 'https://clutch.co/agencies' }
    ]
  },
  {
    id: 'goodfirms',
    name: 'GoodFirms',
    officialUrl: 'https://www.goodfirms.co',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'research software development companies and service agencies',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.goodfirms.co/terms-of-use',
    costFees: 'Free directory browsing',
    steps: [
      'Filter agencies by category (Artificial Intelligence, Web Development).',
      'Examine company websites for partnership opportunities.'
    ],
    searchIdeas: [
      { label: 'B2B Software Agencies', query: 'software development companies', searchUrl: 'https://www.goodfirms.co/directory/software' }
    ]
  },
  {
    id: 'g2',
    name: 'G2',
    officialUrl: 'https://www.g2.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'identify fast-growing software products with integration requests',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.g2.com/static/terms',
    costFees: 'Free platform reviews browsing',
    steps: [
      'Read 2-star and 3-star reviews for niche SaaS tools citing "missing integrations" or "manual data entry".',
      'Identify target businesses relying on these tools.',
      'Reach out offering to build custom n8n or API webhook bridges.'
    ],
    searchIdeas: [
      { label: 'Integration Reviews', query: 'workflow software reviews', searchUrl: 'https://www.g2.com' }
    ]
  },
  {
    id: 'builtwith',
    name: 'BuiltWith',
    officialUrl: 'https://builtwith.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'tech-stack signals, not proof of need (identify technologies used on websites)',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://builtwith.com/terms',
    costFees: 'Free single lookups; paid subscription for bulk lead lists',
    steps: [
      'Inspect website technology profiles to see if they use outdated libraries or lack modern analytics.',
      'Treat tech detection as a technical clue, not proof of need.',
      'Frame outreach around observable business outcomes rather than unsolicited code critique.'
    ],
    searchIdeas: [
      { label: 'Technology Lookup', query: 'website technology profile', searchUrl: 'https://builtwith.com' }
    ],
    note: 'Tech-stack signals, not proof of need.'
  },
  {
    id: 'wappalyzer',
    name: 'Wappalyzer',
    officialUrl: 'https://www.wappalyzer.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'identify web technologies and eCommerce platforms',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.wappalyzer.com/terms',
    costFees: 'Free browser extension / limited lookups; paid API credits',
    steps: [
      'Scan target company websites for CMS and automation tools.',
      'Identify opportunities for modernization.'
    ],
    searchIdeas: [
      { label: 'Tech Stack Scanner', query: 'web technology detection' }
    ]
  },
  {
    id: 'designrush',
    name: 'DesignRush',
    officialUrl: 'https://www.designrush.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'b2b marketplace ranking top web design and technology agencies',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.designrush.com/terms',
    costFees: 'Free directory browsing',
    steps: [
      'Find top agencies in target geographic regions.',
      'Pitch technical backend and automation partnership.'
    ],
    searchIdeas: [
      { label: 'Agency Directory', query: 'web design agencies', searchUrl: 'https://www.designrush.com/agency' }
    ]
  },
  {
    id: 'sortlist',
    name: 'Sortlist',
    officialUrl: 'https://www.sortlist.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'platform matching companies with marketing and tech agencies',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.sortlist.com/terms',
    costFees: 'Free browsing for company research',
    steps: [
      'Research agency profiles in Europe and UK.',
      'Reach out directly regarding specialized engineering overflow support.'
    ],
    searchIdeas: [
      { label: 'Sortlist Agencies', query: 'marketing and dev agencies', searchUrl: 'https://www.sortlist.com' }
    ]
  },
  {
    id: 'the-manifest',
    name: 'The Manifest',
    officialUrl: 'https://themanifest.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'business news and agency ranking directory',
    whatISend: 'cold email / contact form message',
    priority: 'Low',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://themanifest.com/terms-use',
    costFees: 'Free directory browsing',
    steps: [
      'Browse shortlisted small businesses by city.',
      'Identify companies needing website refresh or operational workflows.'
    ],
    searchIdeas: [
      { label: 'Small Business Rankings', query: 'top small business agencies', searchUrl: 'https://themanifest.com' }
    ]
  },
  {
    id: 'upcity',
    name: 'UpCity',
    officialUrl: 'https://upcity.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'b2b provider directory connecting businesses with service partners',
    whatISend: 'cold email / contact form message',
    priority: 'Low',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://upcity.com/terms-of-service',
    costFees: 'Free browsing',
    steps: [
      'Search local B2B service providers in US cities.',
      'Evaluate digital presence and reach out with targeted web improvements.'
    ],
    searchIdeas: [
      { label: 'Local B2B Directory', query: 'local service providers', searchUrl: 'https://upcity.com' }
    ]
  },
  {
    id: 'wellfound',
    name: 'Wellfound',
    officialUrl: 'https://wellfound.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'startups, hiring signals (AngelList Talent)',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://wellfound.com/terms',
    costFees: 'Free job and startup browsing; recruiter subscriptions exist',
    steps: [
      'Search startups hiring for backend or automation roles with open contract listings.',
      'Reach out directly to founders offering immediate contract implementation while they recruit full-time.',
      'Highlight faster time-to-market with zero onboarding overhead.'
    ],
    searchIdeas: [
      { label: 'Contract Startup Roles', query: 'startup contractor software engineer', searchUrl: 'https://wellfound.com/jobs' }
    ]
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    officialUrl: 'https://www.producthunt.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'new launches that may need engineering / AI support',
    whatISend: 'cold email / contact form message',
    priority: 'Medium',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.producthunt.com/terms',
    costFees: 'Free community and directory',
    steps: [
      'Browse daily top launches in SaaS and productivity.',
      'Test their landing page and check if user onboarding or email automation is missing.',
      'Send a congratulations note to makers highlighting one high-leverage workflow enhancement.'
    ],
    searchIdeas: [
      { label: 'New Product Launches', query: 'today product hunt launches', searchUrl: 'https://www.producthunt.com' }
    ]
  },
  {
    id: 'yc-workatastartup',
    name: 'Y Combinator Work at a Startup',
    officialUrl: 'https://www.workatastartup.com',
    group: 'F',
    groupName: 'Company Research & Directories',
    howClientsFound: 'hiring signals for funded YC startups',
    whatISend: 'cold email / contact form message',
    priority: 'Low',
    pitchType: 'cold email / contact form message',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.ycombinator.com/legal/',
    costFees: 'Free startup directory browsing',
    steps: [
      'Search recent YC batch companies by tech stack.',
      'Contact founders regarding technical prototyping or integration services.'
    ],
    searchIdeas: [
      { label: 'YC Companies', query: 'YC funded companies', searchUrl: 'https://www.workatastartup.com/companies' }
    ]
  },

  // ==========================================
  // GROUP G: COMMUNITIES (3 platforms)
  // Pitch type: community reply (manual only, help first, never spam)
  // ==========================================
  {
    id: 'hacker-news',
    name: 'Hacker News (Freelancer Thread)',
    officialUrl: 'https://news.ycombinator.com',
    group: 'G',
    groupName: 'Communities',
    howClientsFound: 'monthly "Ask HN: Freelancer? Seeking freelancer?" thread on the 1st of every month',
    whatISend: 'community reply',
    priority: 'Medium',
    pitchType: 'community reply',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://news.ycombinator.com/newsguidelines.html',
    costFees: '100% free; strictly adhere to HN community guidelines (no marketing buzzwords)',
    steps: [
      'Visit Hacker News on the 1st day of each month to find the official "Ask HN: Freelancer? Seeking freelancer?" thread.',
      'Post under "SEEKING WORK" with the prescribed format: Location, Remote, Technologies, Email, Portfolio.',
      'Browse top-level comments under "SEEKING FREELANCER" looking for automation or AI contract work.',
      'Reply politely to relevant posts providing clear assistance or email directly.'
    ],
    searchIdeas: [
      { label: 'Search Freelancer Thread', query: 'Ask HN: Freelancer? Seeking freelancer?', searchUrl: 'https://hn.algolia.com/?q=Ask+HN%3A+Freelancer' }
    ]
  },
  {
    id: 'reddit-forhire',
    name: 'Reddit r/forhire',
    officialUrl: 'https://www.reddit.com/r/forhire',
    group: 'G',
    groupName: 'Communities',
    howClientsFound: 'post [FOR HIRE] services or reply to [HIRING] posts',
    whatISend: 'community reply',
    priority: 'Medium',
    pitchType: 'community reply',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.redditinc.com/policies/user-agreement',
    costFees: '100% free; strict subreddit rules: minimum $15/hr, no free work, 1 post per 7 days',
    steps: [
      'Review r/forhire community rules (frequency limits, minimum rate disclosures).',
      'Publish a structured [FOR HIRE] post detailing your AI automation and full-stack services with exact pricing ($35-$65/hr).',
      'Monitor new [HIRING] threads for automation, web development, and Python scripts.',
      'Send a courteous direct message answering the poster’s exact question.'
    ],
    searchIdeas: [
      { label: 'Browse [HIRING] Posts', query: '[HIRING] automation python web', searchUrl: 'https://www.reddit.com/r/forhire/search/?q=flair%3AHiring&restrict_sr=1' }
    ]
  },
  {
    id: 'indie-hackers',
    name: 'Indie Hackers',
    officialUrl: 'https://www.indiehackers.com',
    group: 'G',
    groupName: 'Communities',
    howClientsFound: 'community forum for bootstrapped founders and solopreneurs',
    whatISend: 'community reply',
    priority: 'Low',
    pitchType: 'community reply',
    freeToStart: true,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.indiehackers.com/terms',
    costFees: '100% free; contribute helpful insights first, no unsolicited mass pitches',
    steps: [
      'Engage in conversations where founders discuss operational bottlenecks.',
      'Provide concrete workflow or architectural advice publicly.',
      'Invite founders to connect if they need hands-on technical execution.'
    ],
    searchIdeas: [
      { label: 'Indie Hackers Forum', query: 'looking for developer automation', searchUrl: 'https://www.indiehackers.com' }
    ]
  },

  // ==========================================
  // GROUP H: SENDING TOOLS (3 platforms)
  // Reference only; NOT needed because this app sends through own Gmail
  // Show as "Not needed" with one line why
  // ==========================================
  {
    id: 'instantly',
    name: 'Instantly',
    officialUrl: 'https://instantly.ai',
    group: 'H',
    groupName: 'Sending Tools (Reference Only)',
    howClientsFound: 'cold email sending platform with inbox warmup',
    whatISend: 'Not needed',
    priority: 'Low',
    pitchType: 'not needed',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://instantly.ai/terms',
    costFees: 'Monthly subscription ($37-$97+/mo)',
    steps: [
      'Not needed: This application sends directly and safely through your own authenticated Gmail API pipeline.',
      'External sending software is unnecessary and would duplicate your built-in rate-limiting and claim-check controls.'
    ],
    searchIdeas: [],
    note: 'Not needed: This application sends directly and safely through your own authenticated Gmail API pipeline.'
  },
  {
    id: 'smartlead',
    name: 'Smartlead',
    officialUrl: 'https://smartlead.ai',
    group: 'H',
    groupName: 'Sending Tools (Reference Only)',
    howClientsFound: 'cold email infrastructure and multi-inbox sender',
    whatISend: 'Not needed',
    priority: 'Low',
    pitchType: 'not needed',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://smartlead.ai/terms',
    costFees: 'Monthly subscription ($39-$94+/mo)',
    steps: [
      'Not needed: This application sends directly and safely through your own authenticated Gmail API pipeline.',
      'Your verified domain and Gmail credentials handle safe, single-thread operator outreach directly.'
    ],
    searchIdeas: [],
    note: 'Not needed: This application sends directly and safely through your own authenticated Gmail API pipeline.'
  },
  {
    id: 'lemlist',
    name: 'Lemlist',
    officialUrl: 'https://www.lemlist.com',
    group: 'H',
    groupName: 'Sending Tools (Reference Only)',
    howClientsFound: 'email personalization and cold outreach tool',
    whatISend: 'Not needed',
    priority: 'Low',
    pitchType: 'not needed',
    freeToStart: false,
    pakistanEligibility: 'Not checked',
    pakistanTermsUrl: 'https://www.lemlist.com/terms',
    costFees: 'Monthly subscription ($59-$99+/mo)',
    steps: [
      'Not needed: This application sends directly and safely through your own authenticated Gmail API pipeline.',
      'Personalization and template safety are natively generated inside Growth System without third-party fees.'
    ],
    searchIdeas: [],
    note: 'Not needed: This application sends directly and safely through your own authenticated Gmail API pipeline.'
  }
];

export const TOTAL_CLIENT_PLATFORMS = CLIENT_PLATFORMS.length; // 68
export const TOTAL_LOCAL_CHANNELS = LOCAL_BUSINESS_CHANNELS.length; // 7
export const TOTAL_RECONCILED = TOTAL_CLIENT_PLATFORMS + TOTAL_LOCAL_CHANNELS; // 75

export function getPlatformById(id: string): PlatformItem | undefined {
  return CLIENT_PLATFORMS.find((p) => p.id === id);
}

export function getPlatformsByGroup(group: string): PlatformItem[] {
  return CLIENT_PLATFORMS.filter((p) => p.group === group);
}
