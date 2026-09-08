import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, ExternalLink, RefreshCw, Zap, Server } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001/api/v1';

export default function ApiConsoleDiagnostics() {
  const [selectedEndpoint, setSelectedEndpoint] = useState('/situation/current');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const endpoints = [
    { method: 'GET', path: '/situation/current', desc: 'Active Common Operating Picture & Threat Level' },
    { method: 'GET', path: '/situation/timeline', desc: 'Rolling 1-Hour Threat Progression Timeline' },
    { method: 'GET', path: '/events', desc: 'All Deduplicated & Correlated Tactical Events' },
    { method: 'GET', path: '/intelligence/config', desc: 'Live Fusion Engine Weights & Decay Half-Life' },
    { method: 'GET', path: '/sources/health', desc: '5-Stream Sensor Health & Reliability Multipliers' },
    { method: 'POST', path: '/ai/verify', desc: 'Anti-Hallucination Grounding Gate Citation Auditor' },
  ];

  const handleExecute = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const isPost = selectedEndpoint === '/ai/verify';
      const res = await fetch(`${BACKEND_URL}${selectedEndpoint}`, {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setLatency(Math.round(performance.now() - start));
      setResponse(data);
    } catch (err: any) {
      setLatency(Math.round(performance.now() - start));
      setResponse({
        error: err.message,
        hint: 'Ensure backend server is running on http://localhost:3001 (npm run dev inside /server)',
        syntheticFallback: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="instrument-panel rounded-sm p-5 border border-white/10 corner-brackets space-y-4 select-none font-mono text-xs">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            REST API CONSOLE & DIAGNOSTICS WORKSPACE
          </span>
        </div>
        <span className="text-[10px] text-slate-400">BASE URL: {BACKEND_URL}</span>
      </div>

      {/* ENDPOINT SELECTOR & RUN BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 flex items-center gap-2">
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="flex-1 bg-[#05070a] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-500/40 text-xs font-mono"
          >
            {endpoints.map((ep) => (
              <option key={ep.path} value={ep.path}>
                {ep.method} {ep.path} — {ep.desc}
              </option>
            ))}
          </select>

          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900/90 text-cyan-300 font-bold transition-all disabled:opacity-50 shrink-0"
          >
            <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>EXECUTE</span>
          </button>
        </div>

        {/* METRICS */}
        <div className="flex items-center justify-end gap-3 text-slate-400 text-xs">
          {latency !== null && (
            <span>
              Latency: <strong className="text-cyan-400">{latency} ms</strong>
            </span>
          )}
          {response && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#05070a] border border-white/10 hover:border-white/30 text-slate-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Response</span>
            </button>
          )}
        </div>
      </div>

      {/* RESPONSE VIEWER */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
          <span>JSON RESPONSE PAYLOAD</span>
          {response?.provenance && (
            <span className="text-cyan-400 font-semibold">
              ENGINE: {response.provenance.engine.toUpperCase()}
            </span>
          )}
        </div>
        <pre className="p-4 rounded bg-[#05070a] border border-white/10 text-cyan-300/90 text-[11px] font-mono max-h-[420px] overflow-y-auto overflow-x-auto">
          {response ? JSON.stringify(response, null, 2) : '// Select an endpoint above and click EXECUTE to inspect live response'}
        </pre>
      </div>
    </div>
  );
}
