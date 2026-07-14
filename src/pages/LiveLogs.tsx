import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  connectLogStream,
  fetchRecentLogs,
  fetchLogStats,
  clearLogs,
  LogEntry,
} from '../lib/api';
import { cn } from '../lib/utils';
import { Trash2, Pause, Play, Filter, Search, RefreshCw, AlertCircle, AlertTriangle, Info, Terminal } from 'lucide-react';

export default function LiveLogs() {
  const { restEndpoint, masterToken } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>(searchParams.get('level') ?? '');
  const [filterModule, setFilterModule] = useState<string>(searchParams.get('module') ?? '');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<EventSource | null>(null);

  // Load initial logs
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [initialLogs, logStats] = await Promise.all([
          fetchRecentLogs({ restEndpoint, masterToken }, { limit: 200, level: filterLevel || undefined, module: filterModule || undefined, search: searchQuery || undefined }).catch(() => ({ logs: [] })),
          fetchLogStats({ restEndpoint, masterToken }).catch(() => null),
        ]);
        setLogs(initialLogs.logs || []);
        setStats(logStats);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    loadInitial();
  }, [restEndpoint, masterToken]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filterLevel) nextParams.set('level', filterLevel);
    if (filterModule) nextParams.set('module', filterModule);
    if (searchQuery) nextParams.set('search', searchQuery);
    setSearchParams(nextParams, { replace: true });
  }, [filterLevel, filterModule, searchQuery, setSearchParams]);

  // Connect to SSE
  useEffect(() => {
    if (isStreaming && restEndpoint && masterToken) {
      streamRef.current = connectLogStream(
        { restEndpoint, masterToken },
        (entry) => {
          if (!isPaused) {
            setLogs((prev) => [entry, ...prev].slice(0, 500));
          }
        },
        () => {},
        { level: filterLevel || undefined, module: filterModule || undefined }
      );
    } else {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
      }
    };
  }, [restEndpoint, masterToken, isStreaming, isPaused, filterLevel, filterModule]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const handleRefresh = async () => {
    const initialLogs = await fetchRecentLogs({ restEndpoint, masterToken }, { limit: 200, level: filterLevel || undefined, module: filterModule || undefined, search: searchQuery || undefined }).catch(() => ({ logs: [] }));
    setLogs(initialLogs.logs || []);
  };

  const handleClear = async () => {
    await clearLogs({ restEndpoint, masterToken }).catch(() => {});
    setLogs([]);
  };

  const filteredLogs = logs.filter((log) => {
    let matches = true;
    if (filterLevel && log.level !== filterLevel) matches = false;
    if (filterModule && !log.module.toLowerCase().includes(filterModule.toLowerCase())) matches = false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matches = matches && (log.message.toLowerCase().includes(q) || log.module.toLowerCase().includes(q));
    }
    return matches;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'INFO':
        return <Info className="w-4 h-4 text-blue-400" />;
      case 'DEBUG':
        return <Terminal className="w-4 h-4 text-gray-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return 'text-red-300';
      case 'WARNING':
        return 'text-yellow-300';
      case 'INFO':
        return 'text-blue-300';
      case 'DEBUG':
        return 'text-gray-400';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-brand-primary" />
            Live Logs
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isStreaming
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
              )}
            >
              {isStreaming ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isStreaming ? 'Streaming' : 'Paused'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-surface hover:bg-brand-elevated border border-brand-border transition-colors text-white"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg bg-brand-surface hover:bg-brand-elevated border border-brand-border text-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-brand-surface border border-brand-border rounded-xl">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white placeholder-gray-500 outline-none border-none text-sm"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-brand-elevated text-white border border-brand-border rounded-lg px-2 py-1 text-sm outline-none"
            >
              <option value="">All Levels</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <input
              type="text"
              placeholder="Filter by module..."
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="bg-brand-elevated text-white placeholder-gray-500 border border-brand-border rounded-lg px-2 py-1 text-sm outline-none"
            />
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="flex flex-wrap gap-4 p-3 bg-brand-surface border border-brand-border rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-300">Total: <span className="font-mono text-white">{stats.total_logs}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-gray-300">Errors: <span className="font-mono text-red-400">{stats.errors}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-300">Warnings: <span className="font-mono text-yellow-400">{stats.warnings}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Log Stream */}
      <div className="flex-1 bg-brand-surface border border-brand-border rounded-xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading logs...</div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                <Terminal className="w-8 h-8 opacity-30" />
                <span>No logs to display</span>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} className="flex gap-3 py-1 border-b border-brand-border/30 hover:bg-brand-elevated/30">
                  <span className="text-gray-500 w-32 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={cn('w-20 shrink-0 font-bold uppercase', getLevelColor(log.level))}>{log.level}</span>
                  <span className="text-cyan-400 w-40 shrink-0">{log.module}</span>
                  <span className="text-white flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
