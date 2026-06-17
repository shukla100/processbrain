# ProcessBrain

A thought-partner tool that turns scattered, messy company knowledge — meeting
notes, scoping docs, Slack-style debriefs — into structured process documentation
and a live dependency map of how a company actually operates.

I built this to solve a real problem at my own company: process knowledge that
only lives in people's heads or buried in old docs, with no shared, structured
source of truth and no easy way to see how work hands off between departments.

**This repo is a portfolio version.** The tool and workflow are real and
unmodified from what I use day to day. The company context, source notes, and
documented process here use a fictional fintech ("Tabby Finance") so the project
can be shared publicly without exposing real company data.

## What it does

1. **Ingest** — drop raw, messy source material (notes, transcripts, scoping
   docs) into `inbox/<department>/`
2. **Discover** — Claude Code reads the inbox, identifies distinct processes
   even when they're never explicitly named, and proposes a list for you to
   confirm
3. **Document** — for each confirmed process, it asks 3-5 targeted questions to
   fill in what the source material didn't cover (owners, triggers, reasons),
   then writes a structured `process.json` and a human-readable `process.md`
4. **Analyze** — a small Node CLI validates the schema, builds an interactive
   dependency graph (`graph.html`) of how processes connect upstream/downstream,
   and runs static gap analysis (`gap-report.md`) — flagging missing owners,
   ambiguous ownership, broken handoffs, and overloaded single points of failure
5. **Think** — beyond documentation, ProcessBrain acts as an active thinking
   partner in conversation: surfacing process gaps, decision-making gaps,
   tooling gaps, and concrete AI-automation opportunities, and logging the
   valuable findings to an append-only `insights.md`

## Example included in this repo

`inbox/sales/onboarding-call-notes.md` and `inbox/general/leadership-meeting-notes.md`
are the kind of messy raw input ProcessBrain ingests — for a fictional fintech's
business account onboarding workflow (KYB/KYC verification, risk review, treasury
provisioning, API access, customer success handoff).

`processes/business-account-onboarding/` is the structured output: `process.json`
(the source of truth, validated against a strict schema) and `process.md` (the
plain-English version, including a TBD flag for an unresolved SLA gap).

`gap-report.md` and `graph.html` in this repo are **real, generated output** —
produced by actually running `node index.js report` and `node index.js graph`
against the fictional process above, not hand-written.

## How it's built

- **Claude Code** (`CLAUDE.md`) drives the conversational discovery, questioning,
  and writing — this is where the "thought partner" behavior lives: leading the
  conversation, never just answering and stopping, surfacing what the user is
  too close to the work to see themselves
- **Node.js CLI** (`index.js`, `lib/`) handles the deterministic parts: schema
  validation, the dependency graph (`vis-network`), and static gap analysis —
  things that don't need an LLM and should be fast and reliable
- No API key or external service required — runs inside an existing Claude
  Code session

See `PROCESS_BRAIN.md` for full usage instructions and the process schema.

## Using ProcessBrain

### As a portfolio demo (this repo)

This GitHub repo is frozen with Tabby Finance data so it's safe to view and share publicly.

```
node index.js report          # regenerate gap-report.md from processes/
node index.js graph           # regenerate graph.html — open in a browser
npm start                     # serve dashboard on localhost:8765
```

### For real company work (local setup)

To use ProcessBrain with your **real company data**:

1. Clone this repo locally to a working directory:
   ```bash
   git clone https://github.com/shukla100/processbrain.git processbrain-work
   cd processbrain-work
   ```

2. Clear the fictional data and bring your real company knowledge:
   ```bash
   rm -rf inbox/* processes/*/
   # Copy your actual PM notes into inbox/<department>/
   # ProcessBrain will guide you through documenting them
   ```

3. Open in Claude Code and start discovering processes:
   - Ask: "Analyze inbox/sales/ and propose the processes you see"
   - Answer the questions it asks to fill in owners, triggers, reasons
   - It writes `process.json` and `process.md` automatically
   - Run `node index.js dashboard` after each process to see live updates

4. Access your analysis locally:
   ```bash
   node index.js report              # gap-report.md
   node index.js graph               # graph.html (opens in browser)
   npm start                         # dashboard on localhost:8765
   ```

**Important:** Your local `inbox/` and `processes/` contain real company data. 
Never push them to a public repo. The GitHub version stays as the fictional 
portfolio demo; your local copy is your real working tool.

See `CLAUDE.md` for the full conversational workflow and `PROCESS_BRAIN.md` for 
the schema.
