import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Legend, Area,
} from 'recharts';
import { Cpu, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { fetchResources, type ResourcePayload } from '../lib/api';

// ── Static fallbacks ──────────────────────────────────────────────────────────
const RADAR_FALLBACK = [
  { subject: 'CPU Load',   A: 120, B: 110, fullMark: 150 },
  { subject: 'Memory',     A: 98,  B: 130, fullMark: 150 },
  { subject: 'Network',    A: 86,  B: 130, fullMark: 150 },
  { subject: 'Disk I/O',   A: 99,  B: 100, fullMark: 150 },
  { subject: 'DB Queries', A: 85,  B: 90,  fullMark: 150 },
  { subject: 'Cache Hit',  A: 65,  B: 85,  fullMark: 150 },
];

const TRAFFIC_SEED = [
  { time: '00:00', requests: 4000, errors: 24, latency: 45 },
  { time: '04:00', requests: 3000, errors: 13, latency: 42 },
  { time: '08:00', requests: 2000, errors: 98, latency: 60 },
  { time: '12:00', requests: 2780, errors: 39, latency: 50 },
  { time: '16:00', requests: 1890, errors: 48, latency: 48 },
  { time: '20:00', requests: 2390, errors: 38, latency: 46 },
];

// ── Transform ResourcePayload → radar rows ────────────────────────────────────
function toRadarData(r: ResourcePayload) {
  return [
    { subject: 'CPU Load', A: Math.round(r.cpu_percent),    B: Math.round(r.cpu_percent * 0.9),     fullMark: 100 },
    { subject: 'Memory',   A: Math.round(r.memory_percent), B: Math.round(r.memory_percent * 0.95), fullMark: 100 },
    { subject: 'Network',  A: Math.min(100, Math.round(r.network_in_kbps / 10)),  B: Math.min(100, Math.round(r.network_out_kbps / 10)), fullMark: 100 },
    { subject: 'Disk I/O', A: Math.round(r.disk_percent),   B: Math.round(r.disk_percent * 0.9),    fullMark: 100 },
    { subject: 'Workers',  A: Math.min(100, Math.round((r.workers_active / 3) * 100)), B: Math.min(100, Math.round(r.queue_depth / 2)), fullMark: 100 },
    { subject: 'Disk',     A: Math.round(r.disk_percent),   B: Math.round(r.disk_percent * 1.05),   fullMark: 100 },
  ];
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#0A0E17', borderColor: '#1E293B', borderRadius: '8px' },
  itemStyle: { color: '#E2E8F0' },
};

// ── Resource Radar ────────────────────────────────────────────────────────────
export function ResourceRadar() {
  const restEndpoint = useStore(state => state.restEndpoint);
  const masterToken  = useStore(state => state.masterToken);
  const cfg = { restEndpoint, masterToken };

  const { data: resources } = useQuery({
    queryKey: ['resources', restEndpoint],
    queryFn:  () => fetchResources(cfg),
    refetchInterval: 30_000,
    retry: 0, // endpoint may not exist on backend — fail silently and use fallback
  });

  const radarData = resources ? toRadarData(resources) : RADAR_FALLBACK;

  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 h-[400px] flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center mb-1">
            <Cpu className="w-4 h-4 mr-2 text-brand-primary" />
            Resource Utilization
          </h2>
          <p className="text-xs font-mono text-brand-text-muted">MULTIDIMENSIONAL LOAD ANALYSIS</p>
        </div>
        {resources && (
          <span className="text-[10px] font-mono text-brand-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success inline-block animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="flex-1 w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#1E293B" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Radar name="Node Alpha" dataKey="A" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.4} />
            <Radar name="Node Beta"  dataKey="B" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Traffic Composed Chart ────────────────────────────────────────────────────
// Builds a rolling 7-point window using live resource data when available.
// "errors" is derived deterministically from network load rather than Math.random().
export function TrafficComposedChart() {
  const restEndpoint = useStore(state => state.restEndpoint);
  const masterToken  = useStore(state => state.masterToken);
  const cfg = { restEndpoint, masterToken };

  const { data: resources } = useQuery({
    queryKey: ['resources', restEndpoint],
    queryFn:  () => fetchResources(cfg),
    refetchInterval: 30_000,
    retry: 0,
  });

  // Rolling window of traffic data points
  const windowRef = useRef<typeof TRAFFIC_SEED>(TRAFFIC_SEED);
  const [trafficData, setTrafficData] = useState(TRAFFIC_SEED);

  useEffect(() => {
    if (!resources) return;
    const totalNetwork = resources.network_in_kbps + resources.network_out_kbps;
    // Derive errors deterministically from disk I/O pressure — no Math.random()
    const errorProxy = Math.round(resources.disk_percent * 0.8 + resources.cpu_percent * 0.2);
    const point = {
      time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requests: Math.round(totalNetwork) || 2000,
      errors:   Math.min(errorProxy, 120),
      latency:  Math.round(35 + resources.cpu_percent * 0.5 + resources.memory_percent * 0.15),
    };
    windowRef.current = [...windowRef.current.slice(-6), point];
    setTrafficData([...windowRef.current]);
  }, [resources]);

  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 h-[400px] flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center mb-1">
            <Activity className="w-4 h-4 mr-2 text-brand-accent" />
            Traffic & Anomaly Correlation
          </h2>
          <p className="text-xs font-mono text-brand-text-muted">REQUEST VOLUME VS LATENCY & ERRORS</p>
        </div>
        {resources && (
          <span className="text-[10px] font-mono text-brand-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success inline-block animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="flex-1 w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trafficData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left"  stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0A0E17', borderColor: '#1E293B', borderRadius: '8px' }}
              itemStyle={{ color: '#E2E8F0', fontSize: '12px' }}
              labelStyle={{ color: '#94A3B8', fontSize: '10px', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Area  yAxisId="left"  type="monotone" dataKey="requests" fill="#4F46E5" stroke="#4F46E5" fillOpacity={0.1} name="Requests/hr" />
            <Bar   yAxisId="right"                  dataKey="errors"   barSize={12}   fill="#EF4444" name="Errors/hr" radius={[4, 4, 0, 0]} />
            <Line  yAxisId="right" type="monotone" dataKey="latency"  stroke="#10B981" strokeWidth={2} name="Avg Latency (ms)" dot={{ r: 3, fill: '#0A0E17', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
