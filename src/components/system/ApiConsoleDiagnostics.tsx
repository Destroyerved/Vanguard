import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, Server, Gauge, AlertTriangle } from 'lucide-react';
import { TacticalPanel, ScreenHeading, Chip, TacticalButton, StatTile } from '../ui/tactical';

const BACKEND_URL = 'http://localhost:3001/api/v1';

const ENDPOINTS = [
  { method: 'GET', path: '/situation/current', desc: 'Active COP & threat level' },
  { method: 'GET', path: '/situation/timeline', desc: 'Rolling 1-hour threat progression' },
  { method: 'GET', path: '/events', desc: 'Deduplicated & correlated events' },
  { method: 'GET', path: '/intelligence/config', desc: 'Fusion weights & decay half-life' },
  { method: 'GET', path: '/sources/health', desc: 'Sensor health & reliability multipliers' },
  { method: 'POST', path: '/ai/verify', desc: 'Grounding-gate citation auditor' },
] as const;

export default function ApiConsoleDiagnostics() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/situation/current');
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const active = ENDPOINTS.find((e) => e.path === selectedEndpoint);

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
      setStatus(res.status);
      setLatency(Math.round(performance.now() - start));
      setResponse(data);
    } catch (err: any) {
      setStatus(null);
      setLatency(Math.round(performance.now() - start));
      setResponse({
        error: err.message,
        hint: 'Ensure the fusion server is running on http://localhost:3001 (npm run dev inside /server)',
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

  const payloadSize = response ? JSON.stringify(response).length : 0;
  const failed = Boolean(response?.error);

  return (
    <div className="space-y-4 select-none font-mono text-xs pb-2">
      <ScreenHeading
        eyebrow="Diagnostics"
        title="REST API Console"
        icon={Terminal}
        description="Hit the fusion core directly and read the raw payload — the same responses that drive every screen in this console."
        actions={<Chip>{BACKEND_URL}</Chip>}
      />

      {/* REQUEST BUILDER */}
      <TacticalPanel title="Request" subtitle="Select an endpoint and execute" icon={Server} glow>
        <div className="space-y-3">
          {/* Endpoint chips — faster than a select for six routes */}
          <div className="flex flex-wrap gap-1.5">
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.path}
                onClick={() => setSelectedEndpoint(ep.path)}
                className={`vg-chip vg-chip-btn normal-case ${
                  selectedEndpoint === ep.path ? 'vg-chip-active' : ''
                }`}
              >
                <span
                  className={`font-bold ${
                    ep.method === 'POST' ? 'text-amber-400' : 'text-[#a4c639]'
                  }`}
                >
                  {ep.method}
                </span>
                {ep.path}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="vg-input flex-1 flex items-center gap-2 !py-2.5 truncate">
              <span
                className={`font-bold shrink-0 ${
                  active?.method === 'POST' ? 'text-amber-400' : 'text-[#a4c639]'
                }`}
              >
                {active?.method}
              </span>
              <span className="text-slate-300 truncate">
                {BACKEND_URL}
                <span className="text-white">{selectedEndpoint}</span>
              </span>
            </div>
            <TacticalButton
              variant="primary"
              onClick={handleExecute}
              disabled={loading}
              className="!py-2.5"
            >
              <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Execute
            </TacticalButton>
          </div>

          {active && <p className="vg-label">{active.desc}</p>}
        </div>
      </TacticalPanel>

      {/* RESPONSE METRICS */}
      {response && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatTile
            label="Status"
            value={status ?? 'ERR'}
            icon={failed ? AlertTriangle : Check}
            tone={failed ? 'rose' : 'emerald'}
            hint={failed ? 'Request failed' : 'Response received'}
          />
          <StatTile label="Latency" value={latency ?? '—'} unit="ms" icon={Gauge} tone="lime" hint="Round trip" />
          <StatTile label="Payload" value={payloadSize} unit="B" icon={Server} tone="slate" hint="Serialized size" />
          <StatTile
            label="Engine"
            value={response?.provenance?.engine?.toUpperCase() ?? '—'}
            icon={Terminal}
            tone="slate"
            hint="Synthesis provenance"
          />
        </div>
      )}

      {/* RESPONSE VIEWER */}
      <TacticalPanel
        title="JSON Response Payload"
        subtitle={failed ? 'Backend unreachable — fallback notice' : 'Raw fusion core output'}
        icon={Terminal}
        actions={
          response && (
            <TacticalButton onClick={handleCopy} className="!px-2.5 !py-1">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </TacticalButton>
          )
        }
        bodyClassName="p-0"
      >
        <pre
          className={`m-4 mt-0 p-4 rounded-xl bg-black/45 backdrop-blur-md border text-[11px] max-h-[440px] overflow-auto leading-relaxed ${
            failed
              ? 'border-rose-500/35 text-rose-200'
              : 'border-[#526a27]/30 text-[#bcd94f]'
          }`}
        >
          {response
            ? JSON.stringify(response, null, 2)
            : '// Pick an endpoint above and hit EXECUTE to inspect the live response.'}
        </pre>
      </TacticalPanel>
    </div>
  );
}
