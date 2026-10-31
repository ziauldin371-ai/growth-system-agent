# AI & ML Client Acquisition Platform Engine Report

**Branch:** `platforms`  
**Generated:** October 31, 2026  
**Operator:** Zia Ul Din (`ziauldin371@gmail.com`)  

---

## 1. Executive Summary & Philosophy

The Growth System Client Acquisition Engine transforms how the agency finds and lands AI/ML clients globally. Rather than relying on manual prospecting in a single country or single channel, the system establishes a data-driven multi-platform discovery, vetting, and outreach engine across **89 platforms**.

### The 3 Core Platform Jobs
1. **Group A: Where Clients Post Work (Marketplaces)**  
   *Examples:* Upwork, Freelancer.com, PeoplePerHour, Guru, Contra, Kolabtree, Truelancer, Malt, AI IXX, Meridial.  
   *Engine Action:* The client already has an active project and budget. The engine classifies the RFP, checks for off-platform contact scams, calculates a fit score, and drafts a tailored, evidence-only proposal ready for 1-click copying.
2. **Group B: Where You Get Vetted and Matched (Talent Networks)**  
   *Examples:* Toptal, Arc.dev, Lemon.io, Gun.io, Braintrust, A.Team, Andela, Index.dev, Flexiple, Revelo, Catalant, Graphite.  
   *Engine Action:* There is no open public bidding. You pass rigorous screening once and receive pre-vetted client matching. The engine provides a 5-point readiness checklist (CV, polished GitHub, 2-3 evidence-only case studies, 2-minute demo video, and screening interview prep) with a 0-100% readiness score and practical payout verification for Pakistani engineers (Wise, Payoneer, direct local wire, and W-8BEN tax treaty notes).
3. **Group C: Where You Find Companies and Contacts (Lead Databases & Intel)**  
   *Examples:* Apollo.io, Hunter.io, Snov.io, Crunchbase, Clutch, GoodFirms, G2, BuiltWith, Wappalyzer, RocketReach, Seamless.AI, LeadIQ, Kaspr.  
   *Engine Action:* Discovers companies hiring or needing AI/ML infrastructure, enriches verified work emails, checks MX DNS records, respects monthly credit budgets, and powers CSV column mapping and clipboard text importing.

---

## 2. Directory Corrections & Verification

During the ingestion of `AI_ML_Client_Acquisition_Platforms.xlsx`:
- **Kaspr URL Correction:** The original spreadsheet listed `https://wwwkaspr.io/` (missing period). This was corrected to `https://www.kaspr.io/`.
- **Unverified Terms Rule:** All fee statements, commission percentages, and subscription costs from the source sheet are stored with `last_verified: null` and display "Verify current terms before use" alongside a direct link to each platform's official terms of service.
- **Email Sending Tools Excluded from Lead Sources:** Instantly, Smartlead, and Lemlist are categorized as `email_sending_tool` and cannot be queried for leads; instead, the system provides a 1-click **Export Clean CSV** button formatted specifically for bulk senders.

---

## 3. The 89 Platforms Registry

The registry contains 89 data-driven platforms across 13 distinct categories:

| # | Platform Name | Category | Pitch Mode | Integration Mode | Priority |
|---|---|---|---|---|---|
| 1 | Upwork | marketplace | proposal | manual_link | High |
| 2 | Freelancer.com | marketplace | proposal | official_api | High |
| 3 | Contra | marketplace | proposal | manual_link | High |
| 4 | PeoplePerHour | marketplace | proposal | manual_link | Medium |
| 5 | Guru | marketplace | proposal | manual_link | Medium |
| 6 | Kolabtree | marketplace | proposal | manual_link | High |
| 7 | Truelancer | marketplace | proposal | manual_link | Medium |
| 8 | Malt | marketplace | proposal | manual_link | High |
| 9 | AI IXX | marketplace | proposal | manual_link | High |
| 10 | Meridial | marketplace | proposal | manual_link | Medium |
| 11 | Workana | marketplace | proposal | manual_link | Medium |
| 12 | Twago | marketplace | proposal | manual_link | Low |
| 13 | Fiverr Pro | marketplace | proposal | manual_link | High |
| 14 | Toptal | vetted_network | application | manual_link | High |
| 15 | Arc.dev | vetted_network | application | manual_link | High |
| 16 | Lemon.io | vetted_network | application | manual_link | High |
| 17 | Gun.io | vetted_network | application | manual_link | High |
| 18 | Braintrust | vetted_network | application | manual_link | High |
| 19 | A.Team | vetted_network | application | manual_link | High |
| 20 | Andela | vetted_network | application | manual_link | High |
| 21 | Index.dev | vetted_network | application | manual_link | Medium |
| 22 | Flexiple | vetted_network | application | manual_link | Medium |
| 23 | Revelo | vetted_network | application | manual_link | Medium |
| 24 | Catalant | expert_network | application | manual_link | High |
| 25 | Graphite | expert_network | application | manual_link | High |
| 26 | GLG (Gerson Lehrman) | expert_network | application | manual_link | Medium |
| 27 | AlphaSights | expert_network | application | manual_link | Medium |
| 28 | Dialectica | expert_network | application | manual_link | Medium |
| 29 | Guidepoint | expert_network | application | manual_link | Medium |
| 30 | Apollo.io | lead_database | direct_message | official_api | High |
| 31 | Clay | lead_database | research_only | official_api | High |
| 32 | Hunter.io | contact_finder | email | official_api | High |
| 33 | Snov.io | contact_finder | email | official_api | High |
| 34 | Crunchbase | company_intel | research_only | official_api | High |
| 35 | Clutch | b2b_directory | research_only | manual_link | High |
| 36 | GoodFirms | b2b_directory | research_only | manual_link | Medium |
| 37 | G2 | b2b_directory | research_only | manual_link | Medium |
| 38 | BuiltWith | company_intel | research_only | official_api | High |
| 39 | Wappalyzer | company_intel | research_only | official_api | High |
| 40 | Kaspr | contact_finder | direct_message | manual_link | Medium |
| 41 | Lusha | contact_finder | direct_message | official_api | Medium |
| 42 | RocketReach | contact_finder | email | official_api | Medium |
| 43 | Seamless.AI | lead_database | direct_message | manual_link | Medium |
| 44 | LeadIQ | contact_finder | direct_message | manual_link | Medium |
| 45 | UpLead | lead_database | email | official_api | Medium |
| 46 | ZoomInfo | lead_database | direct_message | manual_link | High |
| 47 | Wellfound (AngelList) | startup_community | direct_message | manual_link | High |
| 48 | Y Combinator Work at a Startup | startup_community | direct_message | manual_link | High |
| 49 | Product Hunt | startup_community | comment_reply | manual_link | High |
| 50 | Indie Hackers | startup_community | comment_reply | manual_link | High |
| 51 | GitHub Jobs & Discussions | startup_community | direct_message | manual_link | High |
| 52 | Hugging Face Community | startup_community | direct_message | manual_link | High |
| 53 | Kaggle Jobs & Discussions | startup_community | comment_reply | manual_link | Medium |
| 54 | LinkedIn | social | connection_note | manual_link | High |
| 55 | Twitter / X | social | direct_message | official_api | High |
| 56 | Reddit (r/forhire, r/freelance_forhire) | social | direct_message | rss_or_feed | High |
| 57 | Discord (AI Dev Hubs) | social | direct_message | manual_link | Medium |
| 58 | Slack Communities | social | direct_message | manual_link | Medium |
| 59 | Google Places / Maps | local_business_directory | contact_form | official_api | High |
| 60 | Yelp | local_business_directory | contact_form | manual_link | Medium |
| 61 | Yellow Pages UK | local_business_directory | contact_form | manual_link | Medium |
| 62 | Kompass B2B | local_business_directory | contact_form | manual_link | Medium |
| 63 | Europages | local_business_directory | contact_form | manual_link | Medium |
| 64 | ThomasNet | b2b_directory | contact_form | manual_link | High |
| 65 | Hacker News (Who is Hiring?) | job_feed | email | rss_or_feed | High |
| 66 | RemoteOK | job_feed | email | rss_or_feed | Medium |
| 67 | We Work Remotely | job_feed | email | rss_or_feed | Medium |
| 68 | Jobspresso | job_feed | email | rss_or_feed | Low |
| 69 | Remotive | job_feed | email | rss_or_feed | Medium |
| 70 | Working Nomads | job_feed | email | rss_or_feed | Low |
| 71 | Dribbble Projects | marketplace | proposal | manual_link | Medium |
| 72 | Behance Freelance | marketplace | proposal | manual_link | Low |
| 73 | DesignCrowd | marketplace | proposal | manual_link | Low |
| 74 | 99designs | marketplace | proposal | manual_link | Low |
| 75 | SAM.gov (US Federal) | tender_portal | proposal | official_api | High |
| 76 | Find a Tender (UK Gov) | tender_portal | proposal | official_api | High |
| 77 | Contracts Finder (UK) | tender_portal | proposal | official_api | High |
| 78 | TED (Tenders Electronic Daily EU) | tender_portal | proposal | official_api | High |
| 79 | UNGM (United Nations Global Marketplace) | tender_portal | proposal | manual_link | Medium |
| 80 | AusTender (Australia) | tender_portal | proposal | manual_link | Medium |
| 81 | Buyandsell.gc.ca (Canada) | tender_portal | proposal | manual_link | Medium |
| 82 | Instantly | email_sending_tool | email | csv_import | High |
| 83 | Smartlead | email_sending_tool | email | csv_import | High |
| 84 | Lemlist | email_sending_tool | email | csv_import | High |
| 85 | Woodpecker | email_sending_tool | email | csv_import | Medium |
| 86 | Mailshake | email_sending_tool | email | csv_import | Medium |
| 87 | Overloop | email_sending_tool | email | csv_import | Low |
| 88 | Klenty | email_sending_tool | email | csv_import | Low |
| 89 | Reply.io | email_sending_tool | email | csv_import | Medium |

---

## 4. Multi-Platform Footprint Finder & Cross-Channel Spacing

For every business identified:
1. **Footprint Search:** Queries public domain links and search heuristics for the company's LinkedIn page, founder profiles, Twitter/X, GitHub repositories, Facebook, and Instagram.
2. **Match Confidence:** Candidates are marked as `verified_match` (domain/handle exactly corresponds to the business) or `possible_match` (inferred from name match; requires operator review).
3. **Cross-Channel Touch Spacing (72 Hours):** The system strictly enforces a **3-day minimum gap** between touches to the same company across channels. If an email is sent on Monday, a LinkedIn connection note or Twitter DM is blocked from dispatch until Thursday, preventing perceived multi-channel spam.

---

## 5. First 10 Steps for the Operator

1. **Verify Vetted Network Readiness:** Open **Setup -> Vetted Applications (Group B)**. Complete the 5-item checklist (CV, GitHub, 2 case studies, video walkthrough, screening prep) to reach an 80%+ readiness score.
2. **Apply to Toptal and Arc.dev:** Use the pre-filled Pakistan Practical notes (Wise/Payoneer payout, W-8BEN form for 0% withholding).
3. **Set Monthly Lead Budget:** Open **Setup -> Lead Sources & Budgets**. Enter your monthly credit limits for Apollo and Hunter (e.g., 50 free credits).
4. **Choose Target Buyer Niche:** Under Lead Sources, select one of the 6 Playbook niches (e.g., *Niche 1: Post-Series A B2B SaaS* or *Niche 3: Workflow Automation for Agencies*).
5. **Import First CSV or Paste Leads:** Use the CSV Import Wizard or Paste Importer to load prospect domains. The engine automatically maps columns and filters duplicates.
6. **Review Hot Client Requests:** Open **Businesses -> Hot (Client Requests)**. Paste any urgent RFP from Upwork or Contra to classify it and generate an evidence-only proposal.
7. **Inspect Discovered Footprints:** On any business card, click to open the drawer. Review the **"Where else can I reach them?"** multi-platform footprint candidates.
8. **Copy Tailored Pitches:** Use the 1-click **Copy Pitch** button for LinkedIn (under 300 chars) or Cold Email (under 125 words).
9. **Dispatch via Gmail or Export for External Senders:** Approve validated emails for safe dispatch via your authorized Gmail, or click **Export Sending CSV** for Instantly/Smartlead.
10. **Track Platform Spend & Terms:** Log platform subscription costs under Platform Spend and click **Verify Terms** every 90 days.

