import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import AspectDetailModal from "../components/AspectDetailModal";
import { api } from "../services/api";
import type { AspectSummary, PatternSignal, ProductSummary, QueryResponse, Review } from "../types";

const examples = ["Why is battery draining?", "What do users love?", "Main issues this month?", "Compare camera vs display sentiment"];

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

  useEffect(() => {
    api.getSummary(productId).then(setSummary).catch(() => {});
    api.getReviews(productId, 10).then(setReviews).catch(() => {});
  }, [productId]);

  const handleQuery = async (q?: string) => {
    const text = q || question;
    if (!text.trim()) return;
    setQuerying(true);
    setQuestion(text);
    setActiveTab(2);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <div className="flex">
        <aside className="w-52 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-700 min-h-screen pt-6">
          <div className="px-5 pb-4 border-b border-gray-100 dark:border-slate-700 mb-2 cursor-pointer text-primary-600 dark:text-primary-400 text-sm"
            onClick={() => navigate("/product/" + id)}>← Overview</div>
          {["Overview", "Deep dive", "Reviews"].map((item, i) => (
            <div key={i} onClick={() => i === 0 && navigate("/product/" + id)}
              className={i === 1
                ? "px-5 py-2.5 text-sm cursor-pointer text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 font-medium"
                : "px-5 py-2.5 text-sm cursor-pointer text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}>
              {item}
            </div>
          ))}
        </aside>

        <main className="flex-1 p-7">
          <div className="mb-5">
            <h2 className="text-lg font-medium mb-0.5 dark:text-slate-100">Deep dive</h2>
            <p className="text-sm text-gray-400 dark:text-slate-500">Aspect analysis · root causes · evidence · query</p>
          </div>
          <div className="flex gap-1 mb-5 border-b border-gray-100 dark:border-slate-700">
            {["Aspects", "Evidence", "Ask Insights"].map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className={"px-4 py-2 text-sm -mb-px border-b-2 transition-colors " +
                  (activeTab === i
                    ? "text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 font-medium"
                    : "text-gray-400 dark:text-slate-500 border-transparent hover:text-gray-600 dark:hover:text-slate-300")}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── Aspects tab ── */}
          {activeTab === 0 && (
            <>
              {aspects.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Click any aspect card for trend & details</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                {aspects.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500">No aspect data yet. Upload reviews and wait for processing.</p>
                ) : aspects.map((a, i) => {
                  const negRatio = Math.round((a.negative / a.total) * 100);
                  const posRatio = Math.round((a.positive / a.total) * 100);
                  const related  = patterns.filter((p: PatternSignal) => p.aspect === a.aspect && p.pattern_type === "conditional_prob");
                  return (
                    <div key={i} className="card cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm transition-all group"
                      onClick={() => setSelectedAspect(a.aspect)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium group-hover:text-primary-600 dark:text-slate-100 dark:group-hover:text-primary-400 transition-colors">{a.aspect}</span>
                        <div className="flex items-center gap-2">
                          <span className={"text-xs font-medium px-2.5 py-1 rounded-full " +
                            (negRatio > 60 ? "bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                              : negRatio > 30 ? "bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                              : "bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400")}>
                            {negRatio > 60 ? negRatio + "% neg" : posRatio + "% pos"}
                          </span>
                          <svg className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3 h-1.5">
                        <div className="rounded-l-full bg-green-500" style={{ flex: posRatio }} />
                        <div className="rounded-r-full bg-red-400"   style={{ flex: negRatio }} />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
                        {a.total} mentions · confidence {(a.avg_confidence * 100).toFixed(0)}%
                      </p>
                      {related.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mb-1.5">Root cause signals</p>
                          {related.slice(0, 2).map((p: PatternSignal, j: number) => (
                            <div key={j} className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-3 py-2 rounded-lg mb-1.5">
                              {p.related_issue} → {a.aspect}: {Math.round(p.score * 100)}% conditional prob
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-primary-500 dark:text-primary-400 mt-2">View trend & details →</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Evidence tab ── */}
          {activeTab === 1 && (
            <div className="card">
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-4">Customer reviews</p>
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500">No reviews loaded yet.</p>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-700">
                  {reviews.map((r, i) => (
                    <div key={i} className="py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-amber-500 text-sm">
                          {"★".repeat(Math.round(r.rating ?? 0))}{"☆".repeat(5 - Math.round(r.rating ?? 0))}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{r.rating}/5 · {r.source}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-slate-300">"{r.body}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Ask Insights tab ── */}
          {activeTab === 2 && (
            <div className="card">
              <p className="text-sm font-medium mb-1 dark:text-slate-100">Ask Insights</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Answers grounded in your review data and pattern signals</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {examples.map((ex, i) => (
                  <button key={i} onClick={() => handleQuery(ex)}
                    className="text-xs border border-gray-200 dark:border-slate-600 rounded-full px-3 py-1.5 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-5">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                  placeholder="Ask anything about this product..."
                  className="input-base flex-1" />
                <button onClick={() => handleQuery()} disabled={querying} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  {querying ? "..." : "Ask →"}
                </button>
              </div>
              {querying && (
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-5 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-slate-600 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-100 dark:bg-slate-600 rounded w-1/2 animate-pulse" />
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Analyzing reviews and generating insight...</p>
                </div>
              )}
              {queryError && !querying && (
                <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Query failed</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{queryError}</p>
                </div>
              )}
              {answer && !querying && (
                <div className="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-5">
                  <p className="text-xs font-medium text-primary-800 dark:text-primary-400 mb-3 uppercase tracking-wide">Insights answer</p>
                  <p className="text-sm text-primary-900 dark:text-primary-300 leading-relaxed mb-4">{answer.answer}</p>
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
                  {answer.patterns_used && answer.patterns_used.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-primary-100 dark:border-primary-800">
                      <p className="text-xs text-primary-700 dark:text-primary-400 mb-1.5 font-medium">Patterns referenced</p>
                      <div className="flex flex-wrap gap-1.5">
                        {answer.patterns_used.slice(0, 4).map((p, i) => (
                          <span key={i} className="text-[10px] bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-400 px-2 py-1 rounded">
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
