import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { CausalGraph as CausalGraphType, CausalEdge, CausalNode, FixSimulation } from "../types";

interface Props {
  productId: number;
}

const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const severityConfig = (negRatio: number) => {
  if (negRatio > 0.5) return { text: 'Critical', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/25', border: 'border-red-200/80 dark:border-red-800/40', dot: 'bg-red-500', bar: 'bg-red-500' };
  if (negRatio > 0.3) return { text: 'At risk',  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/25', border: 'border-amber-200/80 dark:border-amber-800/40', dot: 'bg-amber-500', bar: 'bg-amber-500' };
  return { text: 'Healthy', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/25', border: 'border-green-200/80 dark:border-green-800/40', dot: 'bg-green-500', bar: 'bg-green-500' };
};

const strengthLabel = (s: number) => {
  if (s > 0.7) return { text: 'Strong', color: 'text-red-600 dark:text-red-400' };
  if (s > 0.4) return { text: 'Moderate', color: 'text-amber-600 dark:text-amber-400' };
  return { text: 'Weak', color: 'text-gray-500 dark:text-slate-400' };
};

/* ── Build causal chains from edges ── */
function buildChains(edges: CausalEdge[], nodes: CausalNode[]) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const outgoing: Record<string, CausalEdge[]> = {};
  const incoming = new Set<string>();

  for (const e of edges) {
    if (!outgoing[e.from]) outgoing[e.from] = [];
    outgoing[e.from].push(e);
    incoming.add(e.to);
  }

  const roots = Object.keys(outgoing).filter(k => !incoming.has(k));
  if (roots.length === 0) {
    const sorted = Object.entries(outgoing).sort((a, b) => b[1].length - a[1].length);
    if (sorted.length > 0) roots.push(sorted[0][0]);
  }

  const chains: { root: string; steps: { from: string; to: string; strength: number; method: string }[]; affected: string[] }[] = [];

  for (const root of roots) {
    const steps: { from: string; to: string; strength: number; method: string }[] = [];
    const affected: string[] = [root];
    const visited = new Set([root]);
    const queue = [root];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of (outgoing[current] || [])) {
        if (visited.has(edge.to)) continue;
        visited.add(edge.to);
        steps.push({ from: edge.from, to: edge.to, strength: edge.strength, method: edge.method });
        affected.push(edge.to);
        queue.push(edge.to);
      }
    }

    if (steps.length > 0) {
      chains.push({ root, steps, affected });
    }
  }

  return { chains, nodeMap };
}

/* ── Root Cause Card ── */
const RootCauseCard = ({ rootId, chain, nodeMap, onSimulate, index }: {
  rootId: string;
  chain: { from: string; to: string; strength: number; method: string }[];
  nodeMap: Record<string, CausalNode>;
  onSimulate: (aspect: string) => void;
  index: number;
}) => {
  const root = nodeMap[rootId];
  if (!root) return null;
  const sev = severityConfig(root.neg_ratio);
  const totalImpact = chain.reduce((sum, s) => sum + s.strength, 0) / chain.length;

  return (
    <div className={`rounded-2xl border ${sev.border} ${sev.bg} p-5 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 animate-fade-in`}
      style={{ animationDelay: `${index * 80}ms` }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sev.bg} border ${sev.border}`}>
            <svg className={`w-5 h-5 ${sev.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{label(rootId)}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
              Root cause · {root.total} mentions · {Math.round(root.neg_ratio * 100)}% negative
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${sev.bg} ${sev.color} border ${sev.border}`}>
          {sev.text}
        </span>
      </div>

      {/* Impact summary */}
      <div className="bg-white/60 dark:bg-slate-800/40 rounded-xl p-4 mb-4 border border-white/50 dark:border-slate-700/30">
        <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mb-3">
          <span className="font-semibold text-gray-800 dark:text-slate-100">{label(rootId)}</span> is a root cause affecting{' '}
          <span className="font-semibold">{chain.length} downstream area{chain.length > 1 ? 's' : ''}</span> with an average causal strength of{' '}
          <span className="font-semibold">{Math.round(totalImpact * 100)}%</span>. Fixing this issue would have a cascading positive effect.
        </p>

        {/* Causal chain */}
        <div className="space-y-0">
          {chain.map((step, i) => {
            const toNode = nodeMap[step.to];
            const toSev = toNode ? severityConfig(toNode.neg_ratio) : null;
            const str = strengthLabel(step.strength);
            return (
              <div key={i} className="flex items-stretch gap-3">
                {/* Vertical connector */}
                <div className="w-6 flex flex-col items-center">
                  {i === 0 && <div className={`w-2.5 h-2.5 rounded-full ${sev.dot} ring-4 ring-white dark:ring-slate-800/60 flex-shrink-0 mt-2.5`} />}
                  {i > 0 && <div className={`w-2 h-2 rounded-full ${toSev?.dot ?? 'bg-gray-300'} ring-4 ring-white dark:ring-slate-800/60 flex-shrink-0 mt-2.5`} />}
                  {i < chain.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-slate-600 my-1" />}
                </div>
                {/* Step content */}
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{label(step.to)}</span>
                    {toSev && (
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${toSev.bg} ${toSev.color}`}>
                        {Math.round((toNode?.neg_ratio ?? 0) * 100)}% neg
                      </span>
                    )}
                    {step.method.includes('granger') && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-800/40">
                        time-validated
                      </span>
                    )}
                  </div>
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[160px]">
                      <div className={`h-full rounded-full ${toSev?.bar ?? 'bg-gray-400'} transition-all`} style={{ width: Math.round(step.strength * 100) + '%' }} />
                    </div>
                    <span className={`text-[10px] font-medium tabular-nums ${str.color}`}>
                      {Math.round(step.strength * 100)}% — {str.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => onSimulate(rootId)}
        className="w-full text-xs font-semibold text-primary-600 dark:text-primary-400 bg-white/70 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800/80 border border-primary-200/60 dark:border-primary-700/40 rounded-xl py-2.5 transition-all hover:shadow-sm"
      >
        Simulate fixing {label(rootId)}
      </button>
    </div>
  );
};

/* ── Simulation Result ── */
const SimulationResult = ({ sim }: { sim: FixSimulation }) => (
  <div className="rounded-2xl border border-primary-200/60 dark:border-primary-700/40 bg-gradient-to-br from-primary-50/80 via-blue-50/60 to-indigo-50/40 dark:from-primary-900/20 dark:via-blue-900/15 dark:to-indigo-900/10 p-6 animate-fade-in">
    {/* Header */}
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center border border-primary-200/60 dark:border-primary-800/40">
        <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          What if you fix {label(sim.aspect_fixed)}?
        </p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500">
          Counterfactual simulation · {Math.round(sim.confidence * 100)}% confidence
        </p>
      </div>
    </div>

    {/* Score cards */}
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-white/70 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100/60 dark:border-slate-700/30 text-center">
        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Current</p>
        <p className="text-3xl font-bold text-gray-400 dark:text-slate-500 tabular-nums">{sim.current_score}</p>
      </div>
      <div className="bg-white/70 dark:bg-slate-800/50 rounded-xl p-4 border border-green-200/60 dark:border-green-800/30 text-center">
        <p className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Predicted</p>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">{sim.predicted_score}</p>
      </div>
      <div className="bg-white/70 dark:bg-slate-800/50 rounded-xl p-4 border border-primary-200/60 dark:border-primary-700/30 text-center">
        <p className="text-[10px] text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">Uplift</p>
        <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">+{sim.score_delta}</p>
      </div>
    </div>

    {/* Impact details */}
    {Object.keys(sim.details).length > 0 && (
      <div>
        <p className="section-label mb-3">Expected improvements</p>
        <div className="space-y-2.5">
          {Object.entries(sim.details).map(([asp, d]) => {
            const reduction = Math.round((d.neg_ratio_before - d.neg_ratio_after) * 100);
            if (reduction <= 0) return null;
            const barBefore = Math.round(d.neg_ratio_before * 100);
            const barAfter = Math.round(d.neg_ratio_after * 100);
            return (
              <div key={asp} className="bg-white/70 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100/60 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{label(asp)}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold tabular-nums">
                    -{reduction}% complaints
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: barBefore + '%' }} />
                    </div>
                    <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1 tabular-nums">Now: {barBefore}% negative</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5" />
                  </svg>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: barAfter + '%' }} />
                    </div>
                    <p className="text-[9px] text-green-600 dark:text-green-400 mt-1 tabular-nums">After: {barAfter}% negative</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

/* ── Main Component ── */
const CausalGraph = ({ productId }: Props) => {
  const [graph, setGraph] = useState<CausalGraphType | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulation, setSimulation] = useState<FixSimulation | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState("");

  useEffect(() => {
    api.getCausalGraph(productId)
      .then(setGraph)
      .catch(() => setGraph(null))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSimulate = async (aspect: string) => {
    setSimulating(true);
    setSimulation(null);
    setSimError("");
    try {
      const res = await api.simulateFix(productId, aspect);
      setSimulation(res);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Simulation failed";
      setSimError(typeof detail === "string" ? detail : JSON.stringify(detail));
      setSimulation(null);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl border border-gray-100 dark:border-slate-700 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-xl" />
              <div>
                <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-50 dark:bg-slate-700/50 rounded w-48" />
              </div>
            </div>
            <div className="h-20 bg-gray-50 dark:bg-slate-700/50 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0 || graph.edges.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center border border-gray-100 dark:border-slate-700">
          <svg className="w-6 h-6 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">No causal data yet</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">Upload reviews and wait for pipeline processing</p>
      </div>
    );
  }

  const { chains, nodeMap } = buildChains(graph.edges, graph.nodes);

  // Key insights from top edges
  const insights = graph.edges
    .filter(e => e.strength > 0.2)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="metric-card text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Root causes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">{chains.length}</p>
        </div>
        <div className="metric-card text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Causal links</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">{graph.edges.length}</p>
        </div>
        <div className="metric-card text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Aspects affected</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">{graph.nodes.length}</p>
        </div>
      </div>

      {/* Key Insights */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/25 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Key causal insights</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">Statistically significant cause-effect relationships</p>
          </div>
        </div>
        <div className="space-y-2">
          {insights.map((e, i) => {
            const str = strengthLabel(e.strength);
            return (
              <div key={i} className="flex items-center gap-3 bg-white/60 dark:bg-slate-800/40 border border-gray-100/80 dark:border-slate-700/40 rounded-xl px-4 py-3 animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}>
                <span className="text-[10px] font-bold text-gray-300 dark:text-slate-600 w-5 tabular-nums">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-gray-900 dark:text-slate-100">{label(e.from)}</span>
                    <svg className="inline w-3.5 h-3.5 text-gray-300 dark:text-slate-600 mx-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5" />
                    </svg>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">{label(e.to)}</span>
                  </p>
                </div>
                {/* Strength indicator */}
                <div className="flex items-center gap-2 min-w-[120px] justify-end">
                  <div className="w-16 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${str.color === 'text-red-600 dark:text-red-400' ? 'bg-red-500' : str.color === 'text-amber-600 dark:text-amber-400' ? 'bg-amber-500' : 'bg-gray-400'}`}
                      style={{ width: Math.round(e.strength * 100) + '%' }} />
                  </div>
                  <span className={`text-[10px] font-semibold tabular-nums ${str.color}`}>
                    {Math.round(e.strength * 100)}%
                  </span>
                </div>
                {e.method.includes('granger') && (
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-800/40">
                    time-validated
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Root Cause Cards */}
      {chains.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/25 flex items-center justify-center border border-red-200/60 dark:border-red-800/40">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Root cause analysis</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500">Issues at the top of the causal chain — fix these first for maximum impact</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {chains.map((c, i) => (
              <RootCauseCard key={i} rootId={c.root} chain={c.steps} nodeMap={nodeMap} onSimulate={handleSimulate} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Simulation loading */}
      {simulating && (
        <div className="rounded-2xl border border-primary-200/40 dark:border-primary-700/30 bg-primary-50/50 dark:bg-primary-900/10 p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <div className="h-4 bg-primary-100 dark:bg-primary-800/30 rounded w-48 mb-2 animate-pulse" />
              <div className="h-3 bg-primary-100/60 dark:bg-primary-800/20 rounded w-36 animate-pulse" />
            </div>
          </div>
          <p className="text-xs text-primary-500 dark:text-primary-400">Running counterfactual simulation...</p>
        </div>
      )}

      {/* Simulation error */}
      {simError && !simulating && (
        <div className="rounded-2xl border border-red-200/60 dark:border-red-800/40 bg-red-50/80 dark:bg-red-900/15 p-5 animate-fade-in">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Simulation failed</p>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 ml-[42px]">{simError}</p>
        </div>
      )}

      {/* Simulation result */}
      {simulation && !simulating && <SimulationResult sim={simulation} />}
    </div>
  );
};

export default CausalGraph;
