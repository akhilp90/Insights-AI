import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import { api } from "../services/api";
import type { AspectSummary, ProductScore, ProductSummary, StatusLevel, QueryResponse } from "../types";

interface Overview {
  product_id: number;
  product_name: string;
  sku: string;
  review_count: number;
  summary: string;
  strengths: { aspect: string; total: number; positive_pct: number; negative_pct: number }[];
  weaknesses: { aspect: string; total: number; positive_pct: number; negative_pct: number }[];
  patterns: { aspect: string; related_issue: string; type: string; score: number }[];
  recent_reviews: { body: string; rating: number | null }[];
}

const exampleQuestions = ["What are the top complaints?", "What do users love most?", "Why is sentiment negative?"];

const ProductDetail = () => {
  const { id }                      = useParams();
  const navigate                    = useNavigate();
  const [summary, setSummary]       = useState<ProductSummary | null>(null);
  const [scoreData, setScoreData]   = useState<ProductScore | null>(null);
  const [overview, setOverview]     = useState<Overview | null>(null);
  const [loading, setLoading]       = useState(true);
  const [question, setQuestion]     = useState("");
  const [answer, setAnswer]         = useState<QueryResponse | null>(null);
  const [querying, setQuerying]     = useState(false);
  const [queryError, setQueryError] = useState("");
  const productId                   = Number(id);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSummary(productId).catch(() => null),
      api.getProductScore(productId).catch(() => null),
      api.getProductOverview(productId).catch(() => null),
    ]).then(([sum, sc, ov]) => { setSummary(sum); setScoreData(sc); setOverview(ov); })
      .finally(() => setLoading(false));
  }, [productId]);

  const handleQuery = async (q?: string) => {
    const text = q || question;
    if (!text.trim()) return;
    setQuestion(text);
    setQuerying(true);
    setQueryError("");
    setAnswer(null);
    try {
      const res = await api.askQuery(text, productId);
      setAnswer(res);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Query failed";
      setQueryError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setQuerying(false);
    }
  };

  const aspects: AspectSummary[] = summary?.aspect_summary ?? [];
  const score        = scoreData?.score ?? 0;
  const status       = (scoreData?.status ?? 'Moderate') as StatusLevel;
  const reviewCount  = scoreData?.review_count ?? 0;
  const totalAspects = scoreData?.total_aspects ?? 0;
  const posPercent   = totalAspects > 0 ? Math.round((scoreData!.positive_count / totalAspects) * 100) : 0;
  const negPercent   = totalAspects > 0 ? Math.round((scoreData!.negative_count / totalAspects) * 100) : 0;

  const sideItems = ["Overview", "Deep dive", "Reviews"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <div className="flex">
        <aside className="w-52 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-700 min-h-screen pt-6">
          <div className="px-5 pb-4 border-b border-gray-100 dark:border-slate-700 mb-2 cursor-pointer text-primary-600 dark:text-primary-400 text-sm"
            onClick={() => navigate("/dashboard")}>← Back</div>
          {sideItems.map((item, i) => (
            <div key={i} onClick={() => i === 1 && navigate("/product/" + id + "/deepdive")}
              className={i === 0
                ? "px-5 py-2.5 text-sm cursor-pointer text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 font-medium"
                : "px-5 py-2.5 text-sm cursor-pointer text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}>
              {item}
            </div>
          ))}
        </aside>

        <main className="flex-1 p-7">
          {loading ? (
            <div className="space-y-4">
              <div className="h-6 bg-gray-100 dark:bg-slate-700 rounded w-64 animate-pulse" />
              <div className="grid grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}
              </div>
              <div className="h-32 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-medium mb-0.5 dark:text-slate-100">{overview?.product_name || 'Product overview'}</h2>
                  <p className="text-sm text-gray-400 dark:text-slate-500">{overview?.sku} · {reviewCount} reviews analyzed</p>
                </div>
                {score > 0 && <StatusBadge status={status} />}
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Overall score", value: score > 0 ? score.toFixed(1) : '—', color: "text-primary-600 dark:text-primary-400" },
                  { label: "Total reviews", value: String(reviewCount), color: "dark:text-slate-100" },
                  { label: "Positive", value: totalAspects > 0 ? posPercent + '%' : '—', color: "text-green-700 dark:text-green-400" },
                  { label: "Negative", value: totalAspects > 0 ? negPercent + '%' : '—', color: "text-red-600 dark:text-red-400" },
                ].map((m, i) => (
                  <div key={i} className="metric-card">
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{m.label}</p>
                    <p className={"text-2xl font-medium " + m.color}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Summary card */}
              <div className="card mb-4">
                <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-2">Summary</p>
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                  {overview?.summary || 'No data available yet. Upload reviews to generate insights.'}
                </p>
                {overview && (overview.strengths.length > 0 || overview.weaknesses.length > 0) && (
                  <div className="flex gap-6 mt-4 pt-3 border-t border-gray-50 dark:border-slate-700">
                    {overview.strengths.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] text-green-700 dark:text-green-400 font-medium uppercase tracking-wide mb-2">Strengths</p>
                        <div className="space-y-1.5">
                          {overview.strengths.slice(0, 4).map((s, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 dark:text-slate-400">{s.aspect}</span>
                              <span className="text-xs font-medium text-green-700 dark:text-green-400">{s.positive_pct}% positive</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {overview.weaknesses.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wide mb-2">Pain points</p>
                        <div className="space-y-1.5">
                          {overview.weaknesses.slice(0, 4).map((w, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 dark:text-slate-400">{w.aspect}</span>
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">{w.negative_pct}% negative</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {overview && overview.patterns.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-700">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wide mb-2">Top pattern signals</p>
                    <div className="flex flex-wrap gap-2">
                      {overview.patterns.slice(0, 4).map((p, i) => (
                        <span key={i} className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-lg">
                          {p.aspect} → {p.related_issue}: {p.score}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Aspect sentiment + Recent reviews */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="card">
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-3">Aspect sentiment</p>
                  {aspects.length > 0 ? aspects.map((a, i) => {
                    const posW = Math.round((a.positive / a.total) * 100);
                    const negW = Math.round((a.negative / a.total) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
                        <span className="text-xs w-28 text-gray-600 dark:text-slate-400 font-medium truncate">{a.aspect}</span>
                        <div className="flex-1 flex gap-1">
                          <div className="h-1.5 rounded-full bg-green-100 dark:bg-green-900/30 overflow-hidden" style={{ flex: posW }}>
                            <div className="h-full bg-green-600 rounded-full" />
                          </div>
                          <div className="h-1.5 rounded-full bg-red-100 dark:bg-red-900/30 overflow-hidden" style={{ flex: negW }}>
                            <div className="h-full bg-red-500 rounded-full" />
                          </div>
                        </div>
                        <span className={"text-xs font-medium " + (negW > 50 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400")}>
                          {negW > 50 ? negW + "%" : posW + "%"}
                        </span>
                      </div>
                    );
                  }) : <p className="text-xs text-gray-400 dark:text-slate-500">No aspect data yet</p>}
                </div>
                <div className="card">
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-3">Recent reviews</p>
                  {overview && overview.recent_reviews.length > 0 ? (
                    <div className="space-y-2.5">
                      {overview.recent_reviews.slice(0, 4).map((r, i) => (
                        <div key={i} className="pb-2.5 border-b border-gray-50 dark:border-slate-700 last:border-0">
                          {r.rating !== null && (
                            <span className="text-amber-500 text-xs mb-0.5 inline-block">
                              {"★".repeat(Math.round(r.rating))}{"☆".repeat(5 - Math.round(r.rating))}
                            </span>
                          )}
                          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">"{r.body}"</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-gray-400 dark:text-slate-500">No reviews yet</p>}
                </div>
              </div>

              {/* Ask Insights */}
              <div className="card mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium dark:text-slate-100">Ask Insights</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Answers grounded in review data and pattern signals</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {exampleQuestions.map((q, i) => (
                    <button key={i} onClick={() => handleQuery(q)}
                      className="text-xs border border-gray-200 dark:border-slate-600 rounded-full px-3 py-1.5 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                    placeholder="Ask anything about this product..."
                    className="input-base flex-1" />
                  <button onClick={() => handleQuery()} disabled={querying} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                    {querying ? "..." : "Ask →"}
                  </button>
                </div>
                {querying && (
                  <div className="mt-4 space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
                  </div>
                )}
                {queryError && <p className="text-xs text-red-500 mt-3">{queryError}</p>}
                {answer && !querying && (
                  <div className="mt-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl p-5">
                    <p className="text-xs font-medium text-primary-800 dark:text-primary-400 mb-2 uppercase tracking-wide">Insights answer</p>
                    <p className="text-sm text-primary-900 dark:text-primary-300 leading-relaxed mb-3">{answer.answer}</p>
                    {answer.evidence && answer.evidence.length > 0 && (
                      <div>
                        <p className="text-xs text-primary-700 dark:text-primary-400 mb-2 font-medium">Supporting evidence</p>
                        {answer.evidence.slice(0, 3).map((ev, i) => (
                          <div key={i} className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 mb-1.5 text-xs text-gray-600 dark:text-slate-400">
                            "{ev.text}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button className="btn-primary px-6 py-2.5 text-sm" onClick={() => navigate("/product/" + id + "/deepdive")}>
                Deep dive analysis →
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductDetail;
