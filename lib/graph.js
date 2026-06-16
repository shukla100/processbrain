const fs = require('fs');
const path = require('path');
const { readProcess, listProcesses } = require('./parser');

const OUTPUT_FILE = path.join(__dirname, '..', 'graph.html');

function buildGraph() {
  const names = listProcesses();
  if (names.length === 0) {
    console.log('No processes found.');
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

  const nodes = processes.map((p, i) => ({
    id: p.name,
    label: p.name.replace(/-/g, ' '),
    title: p.name,
    data: p
  }));

  const edgeSet = new Set();
  const edges = [];
  for (const p of processes) {
    for (const down of p.downstream) {
      const key = `${p.name}→${down}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: p.name, to: down });
      }
    }
  }

  const html = generateHtml(nodes, edges);
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Graph written to graph.html — open it in a browser.`);
}

function generateHtml(nodes, edges) {
  const nodesJson = JSON.stringify(nodes);
  const edgesJson = JSON.stringify(edges);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ProcessBrain — Dependency Graph</title>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; height: 100vh; background: #f5f5f5; }
    #graph { flex: 1; background: #fff; border-right: 1px solid #e0e0e0; }
    #panel { width: 380px; overflow-y: auto; padding: 24px; background: #fff; display: flex; flex-direction: column; gap: 16px; }
    #panel-placeholder { color: #999; font-size: 14px; margin-top: 40px; text-align: center; }
    #panel-content { display: none; }
    h1 { font-size: 20px; font-weight: 700; text-transform: capitalize; }
    .owner-line { font-size: 13px; color: #666; }
    .section { margin-top: 12px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 6px; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { background: #f0f0f0; border-radius: 4px; padding: 3px 8px; font-size: 12px; color: #333; }
    .tag.link { background: #e8f0fe; color: #1a73e8; cursor: pointer; }
    .tag.link:hover { background: #d2e3fc; }
    .step { border-left: 3px solid #1a73e8; padding: 8px 12px; margin-bottom: 8px; background: #fafafa; border-radius: 0 4px 4px 0; }
    .step-name { font-size: 14px; font-weight: 600; }
    .step-owner { font-size: 12px; color: #666; margin-top: 2px; }
    .step-reason { font-size: 12px; color: #444; margin-top: 4px; line-height: 1.4; }
    .substep { border-left: 2px solid #ccc; padding: 5px 10px; margin: 6px 0 0 8px; background: #fff; border-radius: 0 3px 3px 0; }
    .substep-name { font-size: 12px; font-weight: 600; }
    .substep-owner { font-size: 11px; color: #888; }
    .substep-reason { font-size: 11px; color: #555; margin-top: 2px; line-height: 1.4; }
  </style>
</head>
<body>
  <div id="graph"></div>
  <div id="panel">
    <div id="panel-placeholder">Click a process node to see its details</div>
    <div id="panel-content"></div>
  </div>

  <script>
    const allNodes = ${nodesJson};
    const allEdges = ${edgesJson};
    const processMap = {};
    allNodes.forEach(n => processMap[n.id] = n.data);

    const network = new vis.Network(
      document.getElementById('graph'),
      {
        nodes: new vis.DataSet(allNodes.map(n => ({
          id: n.id,
          label: n.label,
          shape: 'box',
          color: { background: '#e8f0fe', border: '#1a73e8', highlight: { background: '#d2e3fc', border: '#1558b0' } },
          font: { size: 14, face: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
          margin: 10
        }))),
        edges: new vis.DataSet(allEdges.map(e => ({
          from: e.from,
          to: e.to,
          arrows: 'to',
          color: { color: '#999', highlight: '#1a73e8' },
          smooth: { type: 'cubicBezier' }
        })))
      },
      {
        layout: { hierarchical: { direction: 'LR', sortMethod: 'directed', levelSeparation: 200, nodeSpacing: 120 } },
        physics: { enabled: false },
        interaction: { hover: true }
      }
    );

    network.on('click', function(params) {
      if (params.nodes.length === 0) return;
      const id = params.nodes[0];
      const p = processMap[id];
      if (!p) return;
      renderPanel(p);
    });

    function renderPanel(p) {
      document.getElementById('panel-placeholder').style.display = 'none';
      const el = document.getElementById('panel-content');
      el.style.display = 'block';

      const upstreamTags = (p.upstream || []).map(u =>
        \`<span class="tag link" onclick="focusNode('\${u}')">\${u.replace(/-/g,' ')}</span>\`
      ).join('') || '<span class="tag">none</span>';

      const downstreamTags = (p.downstream || []).map(d =>
        \`<span class="tag link" onclick="focusNode('\${d}')">\${d.replace(/-/g,' ')}</span>\`
      ).join('') || '<span class="tag">none</span>';

      const inputTags = (p.inputs || []).map(i => \`<span class="tag">\${i}</span>\`).join('');
      const outputTags = (p.outputs || []).map(o => \`<span class="tag">\${o}</span>\`).join('');

      const stepsHtml = (p.steps || []).map(s => {
        const substepsHtml = (s.steps || []).map(ss => \`
          <div class="substep">
            <div class="substep-name">\${ss.name}</div>
            <div class="substep-owner">Owner: \${ss.owner}</div>
            <div class="substep-reason">\${ss.reason}</div>
          </div>
        \`).join('');
        return \`
          <div class="step">
            <div class="step-name">\${s.name}</div>
            <div class="step-owner">Owner: \${s.owner}</div>
            <div class="step-reason">\${s.reason}</div>
            \${substepsHtml}
          </div>
        \`;
      }).join('');

      el.innerHTML = \`
        <h1>\${p.name.replace(/-/g, ' ')}</h1>
        <div class="owner-line">Owned by \${p.owner}</div>
        <div class="section"><div class="section-title">Inputs</div><div class="tag-list">\${inputTags}</div></div>
        <div class="section"><div class="section-title">Outputs</div><div class="tag-list">\${outputTags}</div></div>
        <div class="section"><div class="section-title">Upstream</div><div class="tag-list">\${upstreamTags}</div></div>
        <div class="section"><div class="section-title">Downstream</div><div class="tag-list">\${downstreamTags}</div></div>
        <div class="section"><div class="section-title">Steps</div>\${stepsHtml}</div>
      \`;
    }

    function focusNode(id) {
      network.selectNodes([id]);
      network.focus(id, { scale: 1.2, animation: true });
      const p = processMap[id];
      if (p) renderPanel(p);
    }
  </script>
</body>
</html>`;
}

module.exports = { buildGraph };
