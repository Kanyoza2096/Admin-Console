const fs = require('fs');
let code = fs.readFileSync('src/pages/Workflows.tsx', 'utf8');

code = code.replace(
  `alert('Edit workflow mode activated');`,
  `console.log('Edit workflow mode activated');`
);

code = code.replace(
  `if (confirm('Are you sure you want to delete this workflow?')) {
                        const next = workflows.filter(w => w.id !== wf.id);
                        setWorkflows(next);
                        if (activeTabId === wf.id && next.length > 0) {
                          setActiveTabId(next[0].id);
                        }
                      }`,
  `const next = workflows.filter(w => w.id !== wf.id);
                      setWorkflows(next);
                      if (activeTabId === wf.id && next.length > 0) {
                        setActiveTabId(next[0].id);
                      }`
);

fs.writeFileSync('src/pages/Workflows.tsx', code);
