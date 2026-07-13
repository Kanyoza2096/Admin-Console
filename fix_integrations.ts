import fs from 'fs';
let content = fs.readFileSync('src/pages/Integrations.tsx', 'utf-8');

// Replace `icon: any;` with `icon: React.ElementType;`
content = content.replace('icon: any;', 'icon: React.ElementType;');

// Add `import { useEffect } from 'react';` and `import { fetchIntegrations } from '../lib/api';`
content = content.replace(`import React, { useState } from 'react';`, `import React, { useState, useEffect } from 'react';\nimport { fetchIntegrations } from '../lib/api';\nimport { useStore } from '../store/useStore';`);

// Update export default function Integrations() {
let componentStart = `
export default function Integrations() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [data, setData] = useState<Integration[]>(integrations);
  const [loading, setLoading] = useState(true);
  const { restEndpoint, masterToken } = useStore();

  useEffect(() => {
    let mounted = true;
    fetchIntegrations({ base: restEndpoint, token: masterToken })
      .then(res => {
        if (mounted && res && res.ok && res.integrations) {
          // Map backend integration to local with icons (this is a simplified mapping logic for demo)
          const liveData = res.integrations.map((live: any) => {
            const existing = integrations.find(i => i.name.toLowerCase() === live.name.toLowerCase());
            return {
              name: live.name,
              category: existing ? existing.category : 'Other',
              status: live.status === 'active' ? 'connected' : 'offline',
              latency: live.latency || 0,
              lastSync: live.lastSync || 'Just now',
              icon: existing ? existing.icon : Webhook,
              color: existing ? existing.color : '#6366F1'
            } as Integration;
          });
          setData(liveData.length > 0 ? liveData : integrations);
        } else {
           if (mounted) setData(integrations);
        }
      })
      .catch(() => {
        if (mounted) setData(integrations);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [restEndpoint, masterToken]);

  const filteredIntegrations = data.filter(int => 
    selectedCategory === 'All' || int.category === selectedCategory
  );
  
  const connectedCount = data.filter(i => i.status === 'connected').length;
  const degradedCount = data.filter(i => i.status === 'degraded').length;
  const offlineCount = data.filter(i => i.status === 'offline').length;
`;

content = content.replace(/export default function Integrations\(\) \{[\s\S]*?(?=return \()/m, componentStart + "\n  ");

content = content.replace(/\{connectedCount\}/g, '{connectedCount}');
content = content.replace(/\{degradedCount\}/g, '{degradedCount}');
content = content.replace(/\{offlineCount\}/g, '{offlineCount}');

fs.writeFileSync('src/pages/Integrations.tsx', content, 'utf-8');
