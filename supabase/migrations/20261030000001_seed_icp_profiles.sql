-- =============================================================================
-- GrowthSignal AI — Seed 7 Default Ideal Customer Profiles (ICPs)
-- =============================================================================

INSERT INTO icp_profiles (
    organization_id,
    slug,
    name,
    target_pipeline,
    description,
    confidence_threshold,
    scoring_weights,
    qualification_criteria,
    is_active
) VALUES
-- 1. Growing local businesses without functional websites
(
    '00000000-0000-0000-0000-000000000001',
    'local-business-no-website',
    'Growing Local Businesses Without Functional Websites',
    'website_opportunities',
    'Active, verified commercial businesses operating with physical footprints, active customer reviews, or social channels but lacking a verified functional domain or website.',
    0.65,
    '{"no_website_weight": 0.40, "commercial_activity_weight": 0.30, "contact_availability_weight": 0.20, "review_growth_weight": 0.10}'::jsonb,
    '{"require_commercial_activity": true, "require_no_functional_website": true, "min_reviews_or_posts": 3}'::jsonb,
    true
),
-- 2. SaaS startups needing MVPs or engineering capacity
(
    '00000000-0000-0000-0000-000000000001',
    'saas-mvp-engineering-capacity',
    'SaaS Startups Needing MVPs or Engineering Capacity',
    'ai_software_opportunities',
    'Early-stage or funded software startups showing evidence of technical backlog, active product iteration, public hiring for developers, or modern SaaS stack evolution.',
    0.70,
    '{"saas_business_model_weight": 0.35, "engineering_demand_weight": 0.35, "recent_funding_or_launch_weight": 0.20, "contact_seniority_weight": 0.10}'::jsonb,
    '{"target_company_types": ["SaaS", "B2B Software", "Product Startup"], "min_team_size": 2, "max_team_size": 50}'::jsonb,
    true
),
-- 3. Companies with manual workflows suitable for automation
(
    '00000000-0000-0000-0000-000000000001',
    'manual-workflow-automation',
    'Businesses with High-Touch Operations Seeking Automation',
    'ai_software_opportunities',
    'Logistics, professional services, healthcare, or agencies showing operational complexity (manual intake, repetitive customer service, PDF/document handling).',
    0.60,
    '{"operational_complexity_weight": 0.40, "process_volume_signal_weight": 0.30, "decision_maker_contact_weight": 0.20, "growth_velocity_weight": 0.10}'::jsonb,
    '{"industries": ["Logistics", "Legal", "Real Estate", "Financial Services", "Healthcare", "Consulting"]}'::jsonb,
    true
),
-- 4. Businesses seeking AI assistants, LLM integrations, RAG, or document intelligence
(
    '00000000-0000-0000-0000-000000000001',
    'ai-llm-rag-integrations',
    'Companies Exploring AI / LLM / RAG Solutions',
    'ai_software_opportunities',
    'Companies publishing job openings or press mentions referencing AI, GenAI, chatbots, vector search, knowledge retrieval, or document processing.',
    0.70,
    '{"ai_keywords_presence_weight": 0.45, "unstructured_data_volume_weight": 0.25, "tech_maturity_weight": 0.20, "growth_weight": 0.10}'::jsonb,
    '{"keywords": ["LLM", "RAG", "AI Assistant", "Document Intelligence", "OpenAI", "LangChain", "Vector Database"]}'::jsonb,
    true
),
-- 5. Companies needing data pipelines, reporting, forecasting, or analytics
(
    '00000000-0000-0000-0000-000000000001',
    'data-engineering-analytics',
    'Organizations Needing Data Pipelines & Python Analytics',
    'ai_software_opportunities',
    'E-commerce, FinTech, and mid-market companies scaling data volume without dedicated in-house data engineering teams.',
    0.65,
    '{"data_volume_signals_weight": 0.40, "python_stack_affinity_weight": 0.30, "reporting_friction_signals_weight": 0.20, "budget_fit_weight": 0.10}'::jsonb,
    '{"keywords": ["ETL", "Data Pipeline", "BigQuery", "Snowflake", "Forecasting", "Dashboard", "Python"]}'::jsonb,
    true
),
-- 6. Digital agencies requiring white-label development partners
(
    '00000000-0000-0000-0000-000000000001',
    'agency-white-label-partner',
    'Digital Agencies Needing AI & Full-Stack White-Label Partners',
    'ai_software_opportunities',
    'Design, marketing, and SEO agencies that sell web and AI solutions to their clients but need an elite senior technical implementation partner.',
    0.70,
    '{"agency_model_weight": 0.45, "client_project_volume_weight": 0.30, "executive_reachability_weight": 0.15, "portfolio_breadth_weight": 0.10}'::jsonb,
    '{"industries": ["Marketing Agency", "Creative Agency", "SEO Agency", "Management Consulting"]}'::jsonb,
    true
),
-- 7. Companies showing credible public hiring signals or documented technical requirements
(
    '00000000-0000-0000-0000-000000000001',
    'public-hiring-signals',
    'Companies with Active Software/AI Job Openings',
    'ai_software_opportunities',
    'Businesses actively advertising for Python engineers, full-stack developers, AI architects, or data engineers—where an external contractor/consultant provides immediate velocity.',
    0.75,
    '{"job_posting_freshness_weight": 0.40, "role_alignment_weight": 0.35, "company_size_weight": 0.15, "speed_to_hire_friction_weight": 0.10}'::jsonb,
    '{"target_roles": ["Full Stack Engineer", "Python Developer", "AI Engineer", "Data Scientist", "DevOps Engineer"]}'::jsonb,
    true
)
ON CONFLICT (organization_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    scoring_weights = EXCLUDED.scoring_weights,
    qualification_criteria = EXCLUDED.qualification_criteria,
    confidence_threshold = EXCLUDED.confidence_threshold;
