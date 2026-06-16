const { writeTemplate, listProcesses } = require('./lib/parser');
const { buildGraph } = require('./lib/graph');
const { buildReport } = require('./lib/renderer');

const command = process.argv[2];
const argument = process.argv[3];

function newProcess(name) {
  if (!name) {
    console.error('Error: provide a process name. Example: node index.js new proposal-approval');
    process.exit(1);
  }

  const template = {
    name: name,
    owner: '',
    inputs: [],
    outputs: [],
    steps: [],
    upstream: [],
    downstream: []
  };

  writeTemplate(name, template);
  console.log(`Created processes/${name}/`);
  console.log(`Next: drop source material into inbox/ then open Claude Code and say "process the files in inbox/ for ${name}"`);
}

function graph() {
  buildGraph();
}

if (command === 'new') {
  newProcess(argument);
} else if (command === 'graph') {
  graph();
} else if (command === 'report') {
  buildReport();
} else {
  console.log('ProcessBrain CLI');
  console.log('');
  console.log('Commands:');
  console.log('  node index.js new <name>   Create a new process');
  console.log('  node index.js graph        Rebuild the dependency graph');
  console.log('  node index.js report       Run static gap analysis');
}
