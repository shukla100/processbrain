const fs = require('fs');
const path = require('path');
const { readProcess, listProcesses } = require('./parser');

const OUTPUT_FILE = path.join(__dirname, '..', 'gap-report.md');

const APPROVAL_KEYWORDS = ['approval', 'review', 'decision', 'sign-off', 'signoff', 'sign off'];
const TIMING_KEYWORDS = ['sla', 'hour', 'day', 'within', 'turnaround', 'deadline', 'business day'];
const SELF_ADMITTED_GAP_PHRASES = [
  'no sla', 'no trigger', 'no system trigger', 'no defined', 'no escalation',
  'tribal knowledge gap', 'single point of failure', 'falls through the cracks',
  'no one owns', 'nobody owns', 'informally'
];

function mentionsAny(text, keywords) {
  const lower = (text || '').toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function checkGapSignals(item, subjectLabel, findings) {
  if (mentionsAny(item.name, APPROVAL_KEYWORDS) && !mentionsAny(item.reason, TIMING_KEYWORDS)) {
    findings.push({
      dimension: 'Process gaps',
      text: `${subjectLabel} looks like an approval/review checkpoint, but no SLA or turnaround expectation is documented in its reason — what happens when it stalls?`
    });
  }

  if (mentionsAny(item.reason, SELF_ADMITTED_GAP_PHRASES)) {
    findings.push({
      dimension: 'Process gaps',
      text: `${subjectLabel} admits a gap in its own documented reason: "${item.reason}"`
    });
  }
}

function analyze(p, knownProcesses) {
  const findings = [];

  if (!p.inputs || p.inputs.length === 0) {
    findings.push({ dimension: 'Process gaps', text: `No inputs defined — what triggers this process?` });
  }

  if (!p.outputs || p.outputs.length === 0) {
    findings.push({ dimension: 'Process gaps', text: `No outputs defined — what does this process produce?` });
  }

  if (!p.steps || p.steps.length === 0) {
    findings.push({ dimension: 'Documentation gaps', text: `No steps documented yet.` });
  }

  for (const step of (p.steps || [])) {
    if (!step.owner || step.owner.trim() === '') {
      findings.push({ dimension: 'Process gaps', text: `Step "${step.name}" has no owner.` });
    } else if (step.owner.includes(' or ')) {
      findings.push({ dimension: 'Decision-making gaps', text: `Step "${step.name}" has shared/ambiguous ownership: "${step.owner}". Who is accountable when both are available?` });
    }

    if (!step.reason || step.reason.trim() === '') {
      findings.push({ dimension: 'Documentation gaps', text: `Step "${step.name}" has no reason documented — the tribal knowledge is missing.` });
    }

    if (step.reason && step.reason.toLowerCase().includes('tbd')) {
      findings.push({ dimension: 'Documentation gaps', text: `Step "${step.name}" reason contains TBD — needs clarification.` });
    }

    checkGapSignals(step, `Step "${step.name}"`, findings);

    for (const sub of (step.steps || [])) {
      if (!sub.owner || sub.owner.trim() === '') {
        findings.push({ dimension: 'Process gaps', text: `Sub-step "${sub.name}" under "${step.name}" has no owner.` });
      }
      if (!sub.reason || sub.reason.trim() === '') {
        findings.push({ dimension: 'Documentation gaps', text: `Sub-step "${sub.name}" under "${step.name}" has no reason documented.` });
      }

      checkGapSignals(sub, `Sub-step "${sub.name}" under "${step.name}"`, findings);
    }
  }

  for (const ref of (p.upstream || [])) {
    if (!knownProcesses.includes(ref)) {
      findings.push({ dimension: 'Documentation gaps', text: `Upstream process "${ref}" is referenced but not documented in ProcessBrain yet.` });
    }
  }

  for (const ref of (p.downstream || [])) {
    if (!knownProcesses.includes(ref)) {
      findings.push({ dimension: 'Documentation gaps', text: `Downstream process "${ref}" is referenced but not documented in ProcessBrain yet.` });
    }
  }

  return findings;
}

function groupByDimension(findings) {
  const groups = {};
  for (const f of findings) {
    if (!groups[f.dimension]) groups[f.dimension] = [];
    groups[f.dimension].push(f.text);
  }
  return groups;
}

function analyzeCrossProcess(processes) {
  const findings = [];

  // Build owner → [{process, step}] map across all processes
  const ownerMap = {};
  for (const p of processes) {
    for (const step of (p.steps || [])) {
      const owners = step.owner ? [step.owner] : [];
      for (const owner of owners) {
        if (!ownerMap[owner]) ownerMap[owner] = [];
        ownerMap[owner].push({ process: p.name, step: step.name });
      }
      for (const sub of (step.steps || [])) {
        if (sub.owner) {
          if (!ownerMap[sub.owner]) ownerMap[sub.owner] = [];
          ownerMap[sub.owner].push({ process: p.name, step: `${step.name} → ${sub.name}` });
        }
      }
    }
  }

  // Flag people owning 3+ steps across processes — overload risk
  for (const [owner, steps] of Object.entries(ownerMap)) {
    if (owner.includes(' or ')) continue; // skip ambiguous owners
    const crossProcess = steps.filter((s, i, arr) =>
      arr.findIndex(x => x.process === s.process) !== i ||
      arr.filter(x => x.process === s.process).length > 0
    );
    const uniqueProcesses = [...new Set(steps.map(s => s.process))];
    if (steps.length >= 3) {
      findings.push({
        dimension: 'Overloaded owners',
        text: `"${owner}" owns ${steps.length} step(s) across ${uniqueProcesses.length} process(es): ${steps.map(s => `"${s.step}" (${s.process})`).join(', ')}. Single point of failure risk.`
      });
    }
  }

  // Detect broken handoffs: process A lists B as downstream, but B doesn't list A as upstream
  for (const p of processes) {
    for (const downName of (p.downstream || [])) {
      const downProcess = processes.find(x => x.name === downName);
      if (!downProcess) continue;
      if (!(downProcess.upstream || []).includes(p.name)) {
        findings.push({
          dimension: 'Handoff gaps',
          text: `"${p.name}" lists "${downName}" as downstream, but "${downName}" does not list "${p.name}" as upstream. The handoff trigger is undefined from the receiving side.`
        });
      }
    }
  }

  // Detect undocumented processes that are referenced by 2+ processes — highest priority to document
  const allRefs = {};
  const knownNames = processes.map(p => p.name);
  for (const p of processes) {
    for (const ref of [...(p.upstream || []), ...(p.downstream || [])]) {
      if (!knownNames.includes(ref)) {
        if (!allRefs[ref]) allRefs[ref] = [];
        allRefs[ref].push(p.name);
      }
    }
  }
  for (const [ref, referencedBy] of Object.entries(allRefs)) {
    if (referencedBy.length >= 2) {
      findings.push({
        dimension: 'Documentation priority',
        text: `"${ref}" is undocumented but referenced by ${referencedBy.length} processes: ${referencedBy.join(', ')}. High priority to document next.`
      });
    }
  }

  // Detect isolated processes — no upstream and no downstream
  for (const p of processes) {
    const hasUp = (p.upstream || []).length > 0;
    const hasDown = (p.downstream || []).length > 0;
    if (!hasUp && !hasDown) {
      findings.push({
        dimension: 'Isolated processes',
        text: `"${p.name}" has no upstream or downstream links. Is it truly standalone, or are its connections just not documented yet?`
      });
    }
  }

  return findings;
}

function buildReport() {
  const names = listProcesses();
  if (names.length === 0) {
    console.log('No processes found — nothing to report.');
    return;
  }

  const processes = [];
  for (const name of names) {
    try {
      processes.push(readProcess(name));
    } catch (e) {
      console.warn(`Skipping "${name}": ${e.message}`);
    }
  }

  const knownProcesses = processes.map(p => p.name);
  const now = new Date().toISOString().split('T')[0];
  let report = `# ProcessBrain Gap Report\n\n> **Do not edit this file manually.** It is auto-generated every time a process is saved and will overwrite anything added here. Save insights and notes to \`insights.md\` instead.\n\nGenerated: ${now}  \nProcesses analyzed: ${names.join(', ')}\n\n---\n\n`;

  let totalFindings = 0;

  // Per-process analysis
  for (const p of processes) {
    const findings = analyze(p, knownProcesses);
    totalFindings += findings.length;

    report += `## ${p.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;

    if (findings.length === 0) {
      report += `No static issues found.\n\n`;
      continue;
    }

    const groups = groupByDimension(findings);
    for (const [dimension, items] of Object.entries(groups)) {
      report += `### ${dimension}\n\n`;
      for (const item of items) {
        report += `- ${item}\n`;
      }
      report += '\n';
    }
  }

  // Cross-process analysis
  const crossFindings = analyzeCrossProcess(processes);
  totalFindings += crossFindings.length;

  report += `---\n\n## Cross-Process Intelligence\n\n`;

  if (crossFindings.length === 0) {
    report += `No cross-process issues found.\n\n`;
  } else {
    const groups = groupByDimension(crossFindings);
    for (const [dimension, items] of Object.entries(groups)) {
      report += `### ${dimension}\n\n`;
      for (const item of items) {
        report += `- ${item}\n`;
      }
      report += '\n';
    }
  }

  report += `---\n\n_${totalFindings} issue(s) found across ${processes.length} process(es). Run \`node index.js report\` to refresh._\n`;

  fs.writeFileSync(OUTPUT_FILE, report);
  console.log(`Gap report written to gap-report.md — ${totalFindings} issue(s) found.`);
}

module.exports = { buildReport, analyze, analyzeCrossProcess, groupByDimension };
