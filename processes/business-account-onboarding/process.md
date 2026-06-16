# Business Account Onboarding

**Owner:** Priya Anand (Sales/Partnerships Lead)

## What feeds into this process
- Signed business banking application
- Business formation documents (EIN, articles of incorporation)
- Beneficial ownership disclosure

## What this process produces
- An approved, active business account
- Issued API credentials
- An assigned customer success contact

## Steps

### 1. Application intake
**Owner:** Priya Anand
**Why:** Sales collects the signed application and formation documents upfront so Compliance never has to chase the client for basic paperwork mid-review.

- **Collect formation documents** (Priya Anand) — EIN and articles of incorporation are required before KYB can start; without them Compliance can't verify the business is real.

### 2. KYB/KYC verification
**Owner:** Marcus Whitfield
**Why:** Required under BSA/AML regulations before any business account can be opened — this is a legal requirement, not a policy choice.

- **Verify beneficial ownership** (Marcus Whitfield) — Regulators require identifying the individuals who ultimately own or control the business before an account can be opened.
- **Screen against OFAC/sanctions lists** (Marcus Whitfield) — Opening an account for a sanctioned entity exposes the company and the partner bank to regulatory penalties.

### 3. Risk review and approval decision
**Owner:** Marcus Whitfield
**Why:** Higher-risk industries (crypto-adjacent, money services businesses) or flagged screening results require a manual decision beyond what the automated KYB tooling can clear.

> **TBD — needs clarification:** There is no defined SLA for this step. Per leadership notes, flagged applications have sat for up to a week with no escalation trigger.

### 4. Treasury account provisioning
**Owner:** Elena Castillo
**Why:** The account must be created in the internal ledger and linked to the partner bank before any funds can move. This cannot happen before compliance approval — no exceptions.

### 5. Platform access and API key issuance
**Owner:** Sam Okafor
**Why:** Most startup clients integrate Tabby into their own finance stack, so API credentials need to be issued as soon as the account is live.

### 6. Customer success handoff
**Owner:** Jordan Lee
**Why:** The client needs a single ongoing point of contact, but today there is no system trigger for this handoff — Jordan often learns the account is live informally (e.g. via Slack) rather than through a defined process.

> **TBD — needs clarification:** What should trigger this handoff automatically once the account goes live?

## Upstream
- `partnership-lead-qualification` — not yet documented

## Downstream
- `treasury-cash-management-setup` — not yet documented; per leadership notes, ongoing treasury/cash management setup currently has no defined owner or workflow
