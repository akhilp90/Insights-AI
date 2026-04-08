import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import AspectDetailModal from "../components/AspectDetailModal";
import CausalGraph from "../components/CausalGraph";
import { api } from "../services/api";
import type { AspectSummary, PatternSignal, ProductSummary, QueryResponse, Review } from "../types";

const examples = ["Why is battery draining?", "What do users love?", "Main issues this month?", "Compare camera vs display sentiment"];

const SideIcon = ({ d }: { d: string }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
);

const DeepDive = () => {
  const { id }                      = useParams();
  const navigate                    = useNavigate();
  const productId                   = Number(id);
  const [summary, setSummary]       = useState<ProductSummary | null>(null);
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [question, setQuestion]     = useState("");
  const [answer, setAnswer]         = useState<QueryResponse | null>(null);
  const [querying, setQuerying]     = useState(false);
  const [queryError, setQueryError] = useState("");
  const [activeTab, setActiveTab]   = useState(0);
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);

  const [reviewFilter, setReviewFilter] = useState<'all' | 'positive' | 'negative'>('all');

  useEffect(() => {
    api.getSummary(productId).then(setSummary).catch(() => {});
    api.getReviews(productId, 30).then(setReviews).catch(() => {});
  }, [productId]);

  const handleQuery = async (q?: string) => {
    const text = q || question;
    if (!text.trim()) return;
    setQuerying(true);
    setQuestion(text);
    setActiveTab(3);
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
  const patterns                 = summary?.top_patterns   ?? [];

  const sideItems = [
    { label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", active: false },
    { label: "Deep dive", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", active: true },
    { label: "Reviews", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", active: false },
  ];

  const tabs = ["Aspects", "Root Causes", "Evidence", "Ask Insights"];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-transparent">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-r border-gray-100/60 dark:border-slate-700/40 min-h-screen pt-6 flex flex-col">
          <div className="px-5 pb-4 border-b border-gray-100/60 dark:border-slate-700/40 mb-2">
            <button className="nav-item nav-item-inactive w-full text-xs" onClick={() => navigate("/product/" + id)}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Overview
            </button>
          </div>
          <div className="px-3 space-y-1">
            {sideItems.map((item, i) => (
              <div key={i} onClick={() => i === 0 && navigate("/product/" + id)}
                className={`nav-item ${item.active ? 'nav-item-active' : 'nav-item-inactive'}`}>
                <SideIcon d={item.icon} />
                {item.label}
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 max-w-[1200px]">
          <div className="mb-6 animate-fade-in">
            <h2 className="text-xl font-semibold mb-1 dark:text-slate-100 tracking-tight">Deep dive</h2>
            <p className="text-sm text-gray-400 dark:text-slate-500">Aspect analysis · root causes · evidence · query</p>
          </div>

          {/* Tab bar */}
          <div className="tab-bar mb-6 inline-flex animate-fade-in delay-100">
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className={"tab-item " + (activeTab === i ? "tab-active" : "tab-inactive")}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── Aspects tab ── */}
          {activeTab === 0 && (
            <div className="animate-fade-in">
              {aspects.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Click any aspect card for trend & details</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                {aspects.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500">No aspect data yet. Upload reviews and wait for processing.</p>
                ) : aspects.map((a, i) => {
                  const negRatio = Math.round((a.negative / a.total) * 100);
                  const posRatio = Math.round((a.positive / a.total) * 100);
                  const related  = patterns.filter((p: PatternSignal) => p.aspect === a.aspect && p.pattern_type === "conditional_prob");
                  return (
                    <div key={i} className="card cursor-pointer hover:border-primary-300/80 dark:hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-900/5 transition-all duration-300 group"
                      onClick={() => setSelectedAspect(a.aspect)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold group-hover:text-primary-600 dark:text-slate-100 dark:group-hover:text-primary-400 transition-colors">{a.aspect}</span>
                        <div className="flex items-center gap-2">
                          <span className={"text-xs font-semibold px-3 py-1 rounded-full " +
                            (negRatio > 60 ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                              : negRatio > 30 ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                              : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400")}>
                            {negRatio > 60 ? negRatio + "% neg" : posRatio + "% pos"}
                          </span>
                          <svg className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 rounded-l-full" style={{ flex: posRatio }} />
                        <div className="bg-red-400 rounded-r-full" style={{ flex: negRatio }} />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                        {a.total} mentions · confidence {(a.avg_confidence * 100).toFixed(0)}%
                      </p>
                      {related.length > 0 && (
                        <div>
                          <p className="section-label">Root cause signals</p>
                          {related.slice(0, 2).map((p: PatternSignal, j: number) => (
                            <div key={j} className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg mb-1.5 border border-amber-100/60 dark:border-amber-800/30">
                              {p.related_issue} → {a.aspect}: {Math.round(p.score * 100)}% conditional prob
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-primary-500 dark:text-primary-400 mt-3 font-medium">View trend & details</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Causal Map tab ── */}
          {activeTab === 1 && (
            <div className="animate-fade-in">
              <CausalGraph productId={productId} />
            </div>
          )}

          {/* ── Evidence tab ── */}
          {activeTab === 2 && (() => {
            const avgRating = reviews.length > 0
              ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
              : 0;
            const positiveCount = reviews.filter(r => (r.rating ?? 0) >= 4).length;
            const negativeCount = reviews.filter(r => (r.rating ?? 0) <= 2).length;
            const neutralCount = reviews.length - positiveCount - negativeCount;
            const filteredReviews = reviewFilter === 'all' ? reviews
              : reviewFilter === 'positive' ? reviews.filter(r => (r.rating ?? 0) >= 4)
              : reviews.filter(r => (r.rating ?? 0) <= 2);

            return (
              <div className="animate-fade-in space-y-4">
                {reviews.length === 0 ? (
                  <div className="card text-center py-12">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center border border-gray-100 dark:border-slate-700">
                      <svg className="w-6 h-6 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mb-1">No reviews loaded yet</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Upload reviews to see customer evidence</p>
                  </div>
                ) : (
                  <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="metric-card text-center">
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">{reviews.length}</p>
                      </div>
                      <div className="metric-card text-center">
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Avg rating</p>
                        <p className="text-2xl font-bold text-amber-500 tabular-nums">{avgRating.toFixed(1)}</p>
                      </div>
                      <div className="metric-card text-center cursor-pointer hover:border-green-300 dark:hover:border-green-700 transition-colors"
                        onClick={() => setReviewFilter(reviewFilter === 'positive' ? 'all' : 'positive')}>
                        <p className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Positive</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{positiveCount}</p>
                      </div>
                      <div className="metric-card text-center cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors"
                        onClick={() => setReviewFilter(reviewFilter === 'negative' ? 'all' : 'negative')}>
                        <p className="text-[10px] text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">Negative</p>
                        <p className="text-2xl font-bold text-red-500 dark:text-red-400 tabular-nums">{negativeCount}</p>
                      </div>
                    </div>

                    {/* Sentiment distribution bar */}
                    <div className="card">
                      <p className="section-label mb-2">Sentiment distribution</p>
                      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-2">
                        {positiveCount > 0 && <div className="bg-green-500 transition-all rounded-l-full" style={{ flex: positiveCount }} />}
                        {neutralCount > 0 && <div className="bg-gray-300 dark:bg-slate-600 transition-all" style={{ flex: neutralCount }} />}
                        {negativeCount > 0 && <div className="bg-red-400 transition-all rounded-r-full" style={{ flex: negativeCount }} />}
                      </div>
                      <div className="flex gap-4 text-[10px]">
                        <span className="text-green-600 dark:text-green-400 font-medium">{reviews.length > 0 ? Math.round(positiveCount / reviews.length * 100) : 0}% positive</span>
                        <span className="text-gray-400 dark:text-slate-500">{reviews.length > 0 ? Math.round(neutralCount / reviews.length * 100) : 0}% neutral</span>
                        <span className="text-red-500 dark:text-red-400 font-medium">{reviews.length > 0 ? Math.round(negativeCount / reviews.length * 100) : 0}% negative</span>
                      </div>
                    </div>

                    {/* Filter bar */}
                    <div className="flex items-center justify-between">
                      <div className="tab-bar inline-flex">
                        {([
                          { key: 'all' as const, label: `All (${reviews.length})` },
                          { key: 'positive' as const, label: `Positive (${positiveCount})` },
                          { key: 'negative' as const, label: `Negative (${negativeCount})` },
                        ]).map(f => (
                          <button key={f.key} onClick={() => setReviewFilter(f.key)}
                            className={"tab-item text-xs " + (reviewFilter === f.key ? "tab-active" : "tab-inactive")}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">
                        Showing {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Review cards */}
                    <div className="space-y-3">
                      {filteredReviews.map((r, i) => {
                        const rating = r.rating ?? 0;
                        const isPositive = rating >= 4;
                        const isNegative = rating <= 2;
                        const accentColor = isPositive
                          ? 'border-l-green-500'
                          : isNegative
                            ? 'border-l-red-400'
                            : 'border-l-gray-300 dark:border-l-slate-600';
                        return (
                          <div key={i}
                            className={`card border-l-[3px] ${accentColor} animate-fade-in`}
                            style={{ animationDelay: `${i * 40}ms` }}>
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-3">
                                {/* Rating display */}
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums ${
                                  isPositive ? 'bg-green-50 dark:bg-green-900/25 text-green-600 dark:text-green-400 border border-green-100/60 dark:border-green-800/40'
                                  : isNegative ? 'bg-red-50 dark:bg-red-900/25 text-red-500 dark:text-red-400 border border-red-100/60 dark:border-red-800/40'
                                  : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-700'
                                }`}>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  {rating.toFixed(1)}
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider">{r.source}</span>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : isNegative ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                                : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500'
                              }`}>
                                {isPositive ? 'Positive' : isNegative ? 'Negative' : 'Neutral'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">"{r.body}"</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── Ask Insights tab ── */}
          {activeTab === 3 && (
            <div className="card animate-fade-in">
              <p className="text-sm font-semibold mb-1 dark:text-slate-100">Ask Insights</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">Answers grounded in your review data and pattern signals</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {examples.map((ex, i) => (
                  <button key={i} onClick={() => handleQuery(ex)}
                    className="text-xs border border-gray-200/80 dark:border-slate-600/50 rounded-full px-3.5 py-1.5 text-gray-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-200 dark:hover:border-primary-700/50 transition-all">
                    {ex}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-5">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                  placeholder="Ask anything about this product..."
                  className="input-base flex-1" />
                <button onClick={() => handleQuery()} disabled={querying} className="btn-primary px-5 py-2.5 text-sm">
                  {querying ? "..." : "Ask"}
                </button>
              </div>
              {querying && (
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-2.5">
                  <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-1/2 animate-pulse" />
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Analyzing reviews and generating insight...</p>
                </div>
              )}
              {queryError && !querying && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100/60 dark:border-red-800/30">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Query failed</p>
                  <p className="text-xs text-red-500 dark:text-red-400">{queryError}</p>
                </div>
              )}
              {answer && !querying && (
                <div className="bg-primary-50/80 dark:bg-primary-900/20 rounded-xl p-5 border border-primary-100/60 dark:border-primary-800/30 animate-fade-in">
                  <p className="text-[10px] font-semibold text-primary-700 dark:text-primary-400 mb-3 uppercase tracking-wider">Insights answer</p>
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
                  {answer.patterns_used && answer.patterns_used.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-primary-100/60 dark:border-primary-800/30">
                      <p className="text-xs text-primary-600 dark:text-primary-400 mb-2 font-medium">Patterns referenced</p>
                      <div className="flex flex-wrap gap-1.5">
                        {answer.patterns_used.slice(0, 4).map((p, i) => (
                          <span key={i} className="text-[10px] bg-primary-100/60 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-lg font-medium">
                            {p.aspect} → {p.related_issue} ({Math.round(p.score * 100)}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {selectedAspect && (
        <AspectDetailModal productId={productId} aspect={selectedAspect} onClose={() => setSelectedAspect(null)} />
      )}
    </div>
  );
};

export default DeepDive;
