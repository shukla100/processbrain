# ProcessBrain

## What It Is

A tool that helps document and understand how a company actually operates.

Most process knowledge lives in people's heads, scattered Notion pages, Slack
threads, and email chains. ProcessBrain uses Claude Code as a thought partner to
extract and structure that raw content, identify what is missing, ask targeted
questions to fill gaps, and output clean process documents and structured data
that builds into a living map of the whole company.

Every process knows what other processes it connects to — upstream and downstream.
Over time this builds a dependency graph of how the whole company works, surfacing
gaps, overloaded owners, broken handoffs, and AI automation opportunities.

> **Note on this repo:** This is a portfolio version of a tool I originally built
> for internal use at my company. The code and workflow are real and unmodified;
> the company context, inbox notes, and documented process in this repo
> (`context/org.md`, `inbox/`, `processes/`) use a fictional fintech company —
> "Tabby Finance" — so the tool can be demonstrated publicly without exposing any
> real company data.

---

## How To Access It

1. Open terminal, navigate to `processbrain/`
2. Type `claude` — Claude Code opens in ProcessBrain mode automatically
3. ProcessBrain reads `CLAUDE.md` on startup and enters its role

**Important:** You must open Claude Code from inside `processbrain/` specifically.
Opening it from the parent folder will not load `CLAUDE.md` and you will get a
generic Claude session, not ProcessBrain.

---

## How It Works

Two systems work together:

**Claude Code (the AI layer)**
- `CLAUDE.md` is read automatically every time Claude Code opens in `processbrain/`
- Drop source material into the appropriate `inbox/<department>/` subfolder
- Open Claude Code and say "analyze inbox/proposals/" (or whichever department)
- ProcessBrain reads all files, identifies distinct processes, surfaces a list for
  your confirmation — including vague processes that aren't explicitly named
- You confirm, rename, or reject the suggested process list
- ProcessBrain documents them one at a time, asking 3-5 gap questions per process
- Files are written directly to disk — no copy-pasting needed
- Inbox files are never deleted — they are permanent source records

**Node.js CLI (the data layer)**
- Runs separately in the terminal
- Validates process schemas
- Builds the interactive dependency graph
- Generates static gap analysis reports

---

## Daily Workflow

**Documenting a new department:**
1. Create a subfolder: `inbox/<department>/`
2. Drop all relevant source material into it (notes, PDFs, exports, anything)
3. Open Claude Code in `processbrain/`
4. Say "analyze inbox/<department>/"
5. Confirm the process list ProcessBrain surfaces
6. Answer gap questions for each process
7. Run `node index.js graph` to update the visualization

**Having a thinking partner conversation:**
- Open Claude Code in `processbrain/`
- Ask anything: "analyze gaps in proposals", "where are the handoffs breaking
  between proposals and delivery", "where could we use AI in the hiring process"
- ProcessBrain leads the conversation, surfaces findings one at a time, asks
  follow-up questions
- Say "save this to insights.md" to capture what was uncovered

**Updating an existing process:**
- Open Claude Code in `processbrain/`
- Describe the change — ProcessBrain updates both `process.json` and `process.md`
  automatically and regenerates `gap-report.md`

---

## CLI Commands

```
node index.js new <name>    Create blank process folder
node index.js graph         Rebuild graph.html from all process files
node index.js report        Run static gap analysis (also runs automatically on save)
```

---

## Folder Structure

```
processbrain/
  CLAUDE.md                 ← ProcessBrain's instructions (read by Claude Code)
  PROCESS_BRAIN.md          ← This file
  index.js                  ← CLI entry point
  gap-report.md             ← Auto-generated, do not edit manually
  insights.md               ← Append-only log of conversation findings
  graph.html                ← Open in browser to see dependency map
  lib/
    parser.js               ← Read, write, validate process files
    graph.js                ← Build graph.html
    renderer.js              ← Build gap-report.md
  inbox/                    ← Drop source material here (never deleted)
    proposals/
    delivery/
    <department>/
  processes/
    <process-name>/
      process.json          ← Structured data (source of truth)
      process.md             ← Human-readable (what you read to confirm changes)
  package.json
```

---

## The process.json Schema

```json
{
  "name": "process-name-in-kebab-case",
  "owner": "Full Name or Role",
  "inputs": ["what feeds into this process"],
  "outputs": ["what this process produces"],
  "steps": [
    {
      "name": "step name",
      "owner": "who owns this step",
      "reason": "why this step exists — the tribal knowledge",
      "steps": [
        {
          "name": "sub-step name",
          "owner": "who owns this sub-step",
          "reason": "why this sub-step exists"
        }
      ]
    }
  ],
  "upstream": ["other-process-name"],
  "downstream": ["other-process-name"]
}
```

**Rules:**
- `name` must be kebab-case (e.g. `proposal-approval`)
- Steps are one level deep only — sub-steps cannot have their own steps
- Every step and sub-step requires `name`, `owner`, and `reason`
- `upstream` and `downstream` must exactly match other process `name` fields
- `inputs` and `outputs` are plain English, not process names

---

## Output Files

| File | What it is | Who writes it |
|------|-----------|---------------|
| `process.json` | Structured process data | ProcessBrain |
| `process.md` | Human-readable summary | ProcessBrain |
| `gap-report.md` | Static gap analysis, auto-regenerated | CLI (`node index.js report`) |
| `insights.md` | Conversation findings log | ProcessBrain (append-only) |
| `graph.html` | Interactive dependency map | CLI (`node index.js graph`) |

---

## Technical Setup

**Language:** Node.js
**No API key required** — runs inside Claude Code using an existing Claude
subscription/Teams plan. No personal accounts, no external services.
