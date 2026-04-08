import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { FixSimulation } from "../types";

interface Props {
  productId: number;
}

const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const FixSimulator = ({ productId }: Props) => {
  const [rankings, setRankings] = useState<FixSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getFixRankings(productId)
      .then(res => setRankings(res.rankings || []))
      .catch((err) => {
        const detail = err.response?.data?.detail || err.message || "Failed to load fix rankings";
        setError(typeof detail === "string" ? detail : JSON.stringify(detail));
        setRankings([]);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="card">
        <div className="h-5 bg-gray-100 dark:bg-slate-700 rounded w-48 animate-pulse mb-3" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse mb-2" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-2">What should you fix first?</p>
        <div className="bg-red-50 dark:bg-red-900/15 border border-red-100/60 dark:border-red-800/30 rounded-lg px-3 py-2.5">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="card">
        <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-2">What should you fix first?</p>
        <p className="text-sm text-gray-400 dark:text-slate-500">Not enough data to predict fix impact yet.</p>
      </div>
    );
  }

  const best = rankings[0];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-800 dark:text-slate-200">What should you fix first?</p>
        </div>
        <span className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
          AI-powered prediction
        </span>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-4 ml-8">
        Predicted impact of resolving each issue — based on causal analysis of {best.confidence > 0 ? Math.round(best.confidence * 100) + '% confidence' : 'your review data'}
      </p>

      {/* Top recommendation — highlighted */}
      <div className="bg-gradient-to-r from-primary-50 to-green-50 dark:from-primary-900/20 dark:to-green-900/20 border border-primary-100 dark:border-primary-800/40 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] font-bold text-white bg-primary-600 px-2 py-0.5 rounded-full">#1 PRIORITY</span>
          <span className="text-xs font-medium text-gray-400 dark:text-slate-500">Highest impact fix</span>
        </div>
        <p className="text-sm text-gray-800 dark:text-slate-200 mb-3 leading-relaxed">
          Fix <span className="font-bold text-primary-700 dark:text-primary-400">{label(best.aspect_fixed)}</span> to
          improve your score from <span className="font-semibold">{best.current_score}</span> to{' '}
          <span className="font-bold text-green-600 dark:text-green-400">{best.predicted_score}</span>
          <span className="text-green-600 dark:text-green-400 font-semibold"> (+{best.score_delta} points)</span>
        </p>
        {best.affected_chain.length > 1 && (
          <p className="text-[10px] text-gray-500 dark:text-slate-400">
            This will also improve: {best.affected_chain.slice(1).map(a => label(a)).join(', ')}
          </p>
        )}
      </div>

      {/* Other fixes */}
      {rankings.length > 1 && (
        <div className="space-y-2">
          {rankings.slice(1).map((r, i) => {
            const barWidth = best.score_delta > 0 ? Math.round((r.score_delta / best.score_delta) * 100) : 0;
            return (
              <div key={r.aspect_fixed} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg px-3 py-2.5">
                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-slate-400 shrink-0">
                  {i + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Fix {label(r.aspect_fixed)}
                    </span>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      +{r.score_delta} pts → {r.predicted_score}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-green-400 transition-all" style={{ width: barWidth + '%' }} />
                  </div>
                  {r.affected_chain.length > 1 && (
                    <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1">
                      Also improves: {r.affected_chain.slice(1).map(a => label(a)).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FixSimulator;
