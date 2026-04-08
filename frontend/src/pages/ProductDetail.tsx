import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import FixSimulator from "../components/FixSimulator";
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

const SideIcon = ({ d }: { d: string }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
);

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

  const sideItems = [
    { label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", active: true },
    { label: "Deep dive", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", active: false },
    { label: "Reviews", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", active: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-transparent">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-r border-gray-100/60 dark:border-slate-700/40 min-h-screen pt-6 flex flex-col">
          <div className="px-5 pb-4 border-b border-gray-100/60 dark:border-slate-700/40 mb-2">
            <button className="nav-item nav-item-inactive w-full text-xs" onClick={() => navigate("/dashboard")}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to products
            </button>
          </div>
          <div className="px-3 space-y-1">
            {sideItems.map((item, i) => (
              <div key={i} onClick={() => i === 1 && navigate("/product/" + id + "/deepdive")}
                className={`nav-item ${item.active ? 'nav-item-active' : 'nav-item-inactive'}`}>
                <SideIcon d={item.icon} />
                {item.label}
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 max-w-[1200px]">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-7 bg-gray-100 dark:bg-slate-700 rounded-lg w-64" />
              <div className="grid grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-700 rounded-xl" />)}
              </div>
              <div className="h-40 bg-gray-100 dark:bg-slate-700 rounded-xl" />
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1 dark:text-slate-100 tracking-tight">{overview?.product_name || 'Product overview'}</h2>
                  <p className="text-sm text-gray-400 dark:text-slate-500">{overview?.sku} · {reviewCount.toLocaleString()} reviews analyzed</p>
                </div>
                {score > 0 && <StatusBadge status={status} />}
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Overall score", value: score > 0 ? score.toFixed(1) : '—', color: "text-primary-600 dark:text-primary-400" },
                  { label: "Total reviews", value: reviewCount.toLocaleString(), color: "dark:text-slate-100" },
                  { label: "Positive", value: totalAspects > 0 ? posPercent + '%' : '—', color: "text-green-600 dark:text-green-400" },
                  { label: "Negative", value: totalAspects > 0 ? negPercent + '%' : '—', color: "text-red-500 dark:text-red-400" },
                ].map((m, i) => (
                  <div key={i} className="metric-card">
                    <p className="section-label mb-1.5">{m.label}</p>
                    <p className={"text-2xl font-semibold tabular-nums " + m.color}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Summary card */}
              <div className="card mb-5">
                <p className="section-label">Summary</p>
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                  {overview?.summary || 'No data available yet. Upload reviews to generate insights.'}
                </p>
                {overview && (overview.strengths.length > 0 || overview.weaknesses.length > 0) && (
                  <div className="flex gap-8 mt-5 pt-4 border-t border-gray-50 dark:border-slate-700/50">
                    {overview.strengths.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider mb-3">Strengths</p>
                        <div className="space-y-2">
                          {overview.strengths.slice(0, 4).map((s, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 dark:text-slate-400 font-medium">{s.aspect}</span>
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums">{s.positive_pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {overview.weaknesses.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold uppercase tracking-wider mb-3">Pain points</p>
                        <div className="space-y-2">
                          {overview.weaknesses.slice(0, 4).map((w, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 dark:text-slate-400 font-medium">{w.aspect}</span>
                              <span className="text-xs font-semibold text-red-500 dark:text-red-400 tabular-nums">{w.negative_pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {overview && overview.patterns.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-50 dark:border-slate-700/50">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-3">Top pattern signals</p>
                    <div className="flex flex-wrap gap-2">
                      {overview.patterns.slice(0, 4).map((p, i) => (
                        <span key={i} className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-100/80 dark:border-amber-800/30 font-medium">
                          {p.aspect} → {p.related_issue}: {p.score}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Aspect sentiment + Recent reviews */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="card">
                  <p className="section-label">Aspect sentiment</p>
                  {aspects.length > 0 ? aspects.map((a, i) => {
                    const posW = Math.round((a.positive / a.total) * 100);
                    const negW = Math.round((a.negative / a.total) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                        <span className="text-xs w-28 text-gray-600 dark:text-slate-400 font-medium truncate">{a.aspect}</span>
                        <div className="flex-1 flex gap-1 h-2 rounded-full overflow-hidden">
                          <div className="bg-green-500 rounded-l-full" style={{ flex: posW }} />
                          <div className="bg-red-400 rounded-r-full" style={{ flex: negW }} />
                        </div>
                        <span className={"text-xs font-semibold tabular-nums " + (negW > 50 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                          {negW > 50 ? negW + "%" : posW + "%"}
                        </span>
                      </div>
                    );
                  }) : <p className="text-xs text-gray-400 dark:text-slate-500">No aspect data yet</p>}
                </div>
                <div className="card">
                  <p className="section-label">Recent reviews</p>
                  {overview && overview.recent_reviews.length > 0 ? (
                    <div className="space-y-3">
                      {overview.recent_reviews.slice(0, 4).map((r, i) => (
                        <div key={i} className="pb-3 border-b border-gray-50 dark:border-slate-700/50 last:border-0 last:pb-0">
                          {r.rating !== null && (
                            <span className="text-amber-500 text-xs mb-1 inline-block">
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

              {/* Fix ROI Predictor */}
              <div className="mb-5">
                <FixSimulator productId={productId} />
              </div>

              {/* Ask Insights */}
              <div className="card mb-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold dark:text-slate-100">Ask Insights</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Answers grounded in review data and pattern signals</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {exampleQuestions.map((q, i) => (
                    <button key={i} onClick={() => handleQuery(q)}
                      className="text-xs border border-gray-200/80 dark:border-slate-600/50 rounded-full px-3.5 py-1.5 text-gray-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-200 dark:hover:border-primary-700/50 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                    placeholder="Ask anything about this product..."
                    className="input-base flex-1" />
                  <button onClick={() => handleQuery()} disabled={querying} className="btn-primary px-5 py-2.5 text-sm">
                    {querying ? "..." : "Ask"}
                  </button>
                </div>
                {querying && (
                  <div className="mt-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-2.5">
                    <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-1/2 animate-pulse" />
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Analyzing reviews and generating insight...</p>
                  </div>
                )}
                {queryError && <p className="text-xs text-red-500 mt-3">{queryError}</p>}
                {answer && !querying && (
                  <div className="mt-4 bg-primary-50/80 dark:bg-primary-900/20 rounded-xl p-5 border border-primary-100/60 dark:border-primary-800/30 animate-fade-in">
                    <p className="text-[10px] font-semibold text-primary-700 dark:text-primary-400 mb-2.5 uppercase tracking-wider">Insights answer</p>
                    <p className="text-sm text-primary-900 dark:text-primary-200 leading-relaxed mb-4">{answer.answer}</p>
                    {answer.evidence && answer.evidence.length > 0 && (
                      <div>
                        <p className="text-xs text-primary-600 dark:text-primary-400 mb-2 font-medium">Supporting evidence</p>
                        {answer.evidence.slice(0, 3).map((ev, i) => (
                          <div key={i} className="bg-white dark:bg-slate-800/60 rounded-lg px-3.5 py-2.5 mb-1.5 text-xs text-gray-600 dark:text-slate-400 border border-primary-100/40 dark:border-slate-700/30">
                            "{ev.text}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button className="btn-primary px-6 py-3 text-sm" onClick={() => navigate("/product/" + id + "/deepdive")}>
                Deep dive analysis
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductDetail;
