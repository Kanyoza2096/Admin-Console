const fs = require('fs');
let code = fs.readFileSync('src/pages/Workflows.tsx', 'utf8');

// Replace ALL_WORKFLOWS and Workflows component with local state
code = code.replace(
`const ALL_WORKFLOWS = [...WORKFLOWS, ...EXTRA_WORKFLOWS];

export default function Workflows() {
  const [activeTabId, setActiveTabId] = useState<string>(WORKFLOWS[0].id);
  const activeWf = WORKFLOWS.find(w => w.id === activeTabId) || WORKFLOWS[0];`,
`const INITIAL_WORKFLOWS = [...WORKFLOWS, ...EXTRA_WORKFLOWS];

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>(() => {
    const saved = localStorage.getItem('kanyoza_workflows');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_WORKFLOWS;
  });

  // Sync to local storage whenever workflows change
  React.useEffect(() => {
    localStorage.setItem('kanyoza_workflows', JSON.stringify(workflows));
  }, [workflows]);

  const [activeTabId, setActiveTabId] = useState<string>(workflows.length > 0 ? workflows[0].id : '');
  const activeWf = workflows.find(w => w.id === activeTabId) || workflows[0] || INITIAL_WORKFLOWS[0];`
);

// Replace button handlers
code = code.replace(
`onClick={() => alert('Feature coming soon')}`,
`onClick={() => {
              const newWf: WorkflowConfig = {
                id: \`wf_\${Date.now()}\`,
                name: 'New Custom Workflow',
                description: 'A newly created workflow pipeline.',
                trigger: 'Manual',
                lastRun: 'Never',
                totalRuns: 0,
                successCount: 0,
                failCount: 0,
                nodes: [{ id: 'n1', label: 'Start Trigger', icon: Globe, status: 'active' }],
                logs: [],
                active: false,
                runsToday: 0
              };
              setWorkflows([newWf, ...workflows]);
              setActiveTabId(newWf.id);
            }}`
);

code = code.replace(
`onClick={() => alert('Feature coming soon')}`,
`onClick={(e) => {
                      e.stopPropagation();
                      // Edit feature placeholder
                      alert('Edit workflow mode activated');
                    }}`
);

code = code.replace(
`onClick={() => alert('Feature coming soon')}`,
`onClick={(e) => {
                      e.stopPropagation();
                      setWorkflows(workflows.map(w => 
                        w.id === wf.id ? { ...w, active: !w.active } : w
                      ));
                    }}`
);

code = code.replace(
`onClick={() => alert('Feature coming soon')}`,
`onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this workflow?')) {
                        const next = workflows.filter(w => w.id !== wf.id);
                        setWorkflows(next);
                        if (activeTabId === wf.id && next.length > 0) {
                          setActiveTabId(next[0].id);
                        }
                      }
                    }}`
);

// We need to also fix ALL_WORKFLOWS references to workflows
code = code.replace(/ALL_WORKFLOWS/g, 'workflows');
// Fix WORKFLOWS.map to workflows.map for the left side tabs
code = code.replace(/\{WORKFLOWS\.map/g, '{workflows.map');

fs.writeFileSync('src/pages/Workflows.tsx', code);
