const fs = require('fs');
const path = require('path');
const { readProcess, listProcesses } = require('./parser');
const { analyze, analyzeCrossProcess, groupByDimension } = require('./renderer');

const ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'docs', 'data', 'dashboard.json');
const ORG_FILE = path.join(ROOT, 'context', 'org.md');
const INSIGHTS_FILE = path.join(ROOT, 'insights.md');
const INBOX_DIR = path.join(ROOT, 'inbox');

function parseDepartments() {
  if (!fs.existsSync(ORG_FILE)) return [];
  const text = fs.readFileSync(ORG_FILE, 'utf8');
  const matches = [...text.matchAll(/^### \[(.+?)\]/gm)];
  return matches.map(m => m[1]);
}

function parseInsights() {
  if (!fs.existsSync(INSIGHTS_FILE)) return [];
  const text = fs.readFileSync(INSIGHTS_FILE, 'utf8');
  const entries = [...text.matchAll(/\*\*(\d{4}-\d{2}-\d{2}) — ([^*]+)\*\*\n\n([\s\S]*?)\n\n---/g)];
  return entries.map(m => ({
    date: m[1],
    process: m[2].trim(),
    text: m[3].trim().replace(/\n/g, ' ')
  }));
}

function parseInbox() {
  if (!fs.existsSync(INBOX_DIR)) return [];
  const items = [];
  const depts = fs.readdirSync(INBOX_DIR).filter(d =>
    fs.statSync(path.join(INBOX_DIR, d)).isDirectory()
  );
  for (const dept of depts) {
    const deptDir = path.join(INBOX_DIR, dept);
    const files = fs.readdirSync(deptDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(deptDir, file), 'utf8').trim();
      const excerpt = content.split('\n').find(l => l.trim().length > 0) || '';
      items.push({
        department: dept,
        file,
        excerpt: excerpt.replace(/^[-#\s]+/, '').slice(0, 160)
      });
    }
  }
  return items;
}

function computeOwnerLoad(processes) {
  const counts = {};
  for (const p of processes) {
    for (const step of (p.steps || [])) {
      if (step.owner) counts[step.owner] = (counts[step.owner] || 0) + 1;
      for (const sub of (step.steps || [])) {
        if (sub.owner) counts[sub.owner] = (counts[sub.owner] || 0) + 1;
      }
    }
  }
  return counts;
}

function buildDashboardData() {
  const names = listProcesses();
  const processes = [];
  for (const name of names) {
    try {
      processes.push(readProcess(name));
    } catch (e) {
      console.warn(`Skipping "${name}": ${e.message}`);
    }
  }

  const knownProcesses = processes.map(p => p.name);

  const gapsByProcess = {};
  let totalGapFindings = 0;
  for (const p of processes) {
    const findings = analyze(p, knownProcesses);
    totalGapFindings += findings.length;
    gapsByProcess[p.name] = groupByDimension(findings);
  }

  const crossFindings = analyzeCrossProcess(processes);
  totalGapFindings += crossFindings.length;
  const crossProcessGaps = groupByDimension(crossFindings);

  const data = {
    generated: new Date().toISOString().split('T')[0],
    departments: parseDepartments(),
    processes,
    gapsByProcess,
    crossProcessGaps,
    totalGapFindings,
    ownerLoad: computeOwnerLoad(processes),
    insights: parseInsights(),
    inbox: parseInbox()
  };

  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`Dashboard data written to docs/data/dashboard.json — ${processes.length} process(es), ${totalGapFindings} gap(s) found.`);
}

module.exports = { buildDashboardData };
