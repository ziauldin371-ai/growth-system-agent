# GrowthSignal AI — Statutory Compliance & Commercial Outreach Guide

## 1. Compliance Architecture Overview

GrowthSignal AI enforces automated technical and policy guardrails designed to maintain strict compliance with global digital outreach regulations:
- **United States**: CAN-SPAM Act (15 U.S.C. 7701 et seq.)
- **United Kingdom**: Privacy and Electronic Communications Regulations (PECR) & UK GDPR
- **Canada**: Personal Information Protection and Electronic Documents Act (PIPEDA) / CASL
- **Australia**: Spam Act 2003 (Cth)

---

## 2. CAN-SPAM Act Statutory Checklist

GrowthSignal AI programmatically enforces the core tenets of the CAN-SPAM Act:

- [x] **No Deceptive Subject Lines (15 U.S.C. § 7704(a)(2))**: The platform generates 3 grounded, factual subject line options that accurately reflect the contents of the message.
- [x] **Clear Sender Identification (15 U.S.C. § 7704(a)(1))**: Headers and signatures clearly identify the sender name and professional role (Senior Full Stack AI Developer & Automation Architect).
- [x] **Valid Physical Postal Address (15 U.S.C. § 7704(a)(5)(A))**: Every outreach message automatically includes a physical postal mailing address in the footer.
- [x] **Clear Opt-Out Mechanism (15 U.S.C. § 7704(a)(3))**: A prominent, one-click unsubscribe URL is appended to every email.
- [x] **Immediate Opt-Out Processing (15 U.S.C. § 7704(a)(4))**: The `/api/compliance/unsubscribe` endpoint immediately inserts the recipient's email address into the permanent suppression list. No further emails can be sent to this address.

---

## 3. UK PECR & European Standards

Under the UK Privacy and Electronic Communications Regulations (PECR), unsolicited commercial emails to **corporate employees** (e.g. `name@company.ltd.uk`) are permissible provided:
1. The outreach is directly relevant to the recipient's corporate responsibilities (e.g., contacting a CTO or Head of Engineering regarding technical development support).
2. The sender's identity and valid contact details are clearly presented.
3. An explicit opt-out mechanism is included in every communication.
4. **Uncertainty Rule**: If a contact email appears to be an individual personal account (e.g., `@gmail.com`, `@yahoo.com`) rather than a verified corporate mailbox, the system flags the lead for manual review and blocks automated dispatch.

---

## 4. Sending Windows & Volume Controls

- **Permitted Sending Hours**: Messages are dispatched exclusively during standard business hours (**09:00 to 17:00**). Sends scheduled outside this window are automatically deferred to the next business day.
- **Daily Volume Caps**: Campaigns enforce configurable daily quotas (default 25–50 sends/day) to prevent domain reputation degradation and protect IP warming schedules.
- **Permanent Suppression Sync**: Any hard bounce, spam complaint, or unsubscribe event immediately suppresses the recipient email and company domain across all campaigns.
