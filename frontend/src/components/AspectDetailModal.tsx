import { useEffect, useState } from "react";
import { api } from "../services/api";

interface TrendPoint {
  month: string;
  total: number;
  positive: number;
  negative: number;
  pos_pct: number;
}

interface AspectDetail {
  aspect: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  avg_confidence: number;
  trend: TrendPoint[];
  patterns: { aspect: string; related_issue: string; type: string; score: number }[];
  reviews: { body: string; rating: number | null; source: string; sentiment: string; confidence: number }[];
}

interface Props {
  productId: number;
  aspect: string;
  onClose: () => void;
}

const TrendChart = ({ trend }: { trend: TrendPoint[] }) => {
  if (trend.length < 2) {
    return <p className="text-xs text-gray-400 dark:text-slate-500 py-6 text-center">Not enough data for a trend chart yet.</p>;
  }

  const W = 520, H = 140, PL = 32, PR = 16, PT = 12, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const xStep  = chartW / (trend.length - 1);
  const yPos   = (v: number) => PT + chartH - (v / 100) * chartH;
  const toPoint = (i: number, v: number) => `${PL + i * xStep},${yPos(v)}`;

  const posValues = trend.map(t => t.pos_pct);
  const posLine   = posValues.map((v, i) => toPoint(i, v)).join(' ');
  const negLine   = trend.map((t, i) => toPoint(i, 100 - t.pos_pct)).join(' ');

  const posArea = [
    `M ${toPoint(0, posValues[0])}`,
    ...posValues.slice(1).map((v, i) => `L ${toPoint(i + 1, v)}`),
    `L ${PL + (trend.length - 1) * xStep},${PT + chartH}`,
    `L ${PL},${PT + chartH}`, 'Z',
  ].join(' ');

  const yLabels = [0, 25, 50, 75, 100];

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-green-500 inline-block rounded-full" />
          <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Positive %</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-red-400 inline-block rounded-full" />
          <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Negative %</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {yLabels.map(v => (
          <g key={v}>
            <line x1={PL} y1={yPos(v)} x2={W - PR} y2={yPos(v)}
              stroke="currentColor" className="text-gray-100 dark:text-slate-700" strokeWidth="1" strokeDasharray={v === 50 ? "0" : "3,3"} />
            <text x={PL - 6} y={yPos(v) + 3} textAnchor="end" fontSize="9" fill="currentColor" className="text-gray-400 dark:text-slate-500">{v}</text>
          </g>
        ))}
        <path d={posArea} fill="#22c55e" fillOpacity="0.06" />
        <polyline points={negLine} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.6" />
        <polyline points={posLine} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {posValues.map((v, i) => (
          <circle key={i} cx={PL + i * xStep} cy={yPos(v)} r="3.5" fill="#22c55e" stroke="white" strokeWidth="1.5" />
        ))}
        {trend.map((t, i) => (
          <text key={i} x={PL + i * xStep} y={H - 4} textAnchor="middle" fontSize="9" fill="currentColor" className="text-gray-400 dark:text-slate-500">
            {t.month.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
};

const AspectDetailModal = ({ productId, aspect, onClose }: Props) => {
  const [data, setData]       = useState<AspectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'overview' | 'reviews'>('overview');

  useEffect(() => {
    api.getAspectDetail(productId, aspect)
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [productId, aspect]);

  const posP = data && data.total > 0 ? Math.round((data.positive / data.total) * 100) : 0;
  const negP = data && data.total > 0 ? Math.round((data.negative / data.total) * 100) : 0;
  const neuP = data && data.total > 0 ? Math.round((data.neutral  / data.total) * 100) : 0;

  const sentimentColor = negP > 60 ? 'text-red-600 dark:text-red-400' : negP > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400';
  const sentimentBg    = negP > 60 ? 'bg-red-50 dark:bg-red-900/25 border-red-100/60 dark:border-red-800/40' : negP > 30 ? 'bg-amber-50 dark:bg-amber-900/25 border-amber-100/60 dark:border-amber-800/40' : 'bg-green-50 dark:bg-green-900/25 border-green-100/60 dark:border-green-800/40';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in-fast" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto border border-gray-100/80 dark:border-slate-700/50 animate-slide-up"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-100/80 dark:border-slate-700/50">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h3 className="text-lg font-semibold dark:text-slate-100 tracking-tight">{aspect}</h3>
              {data && <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${sentimentBg} ${sentimentColor}`}>
                {negP > 60 ? `${negP}% negative` : `${posP}% positive`}
              </span>}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {data?.total ?? '—'} mentions · {data ? (data.avg_confidence * 100).toFixed(0) : '—'}% confidence
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-all text-lg">&times;</button>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-6 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}
          </div>
        ) : !data ? (
          <p className="p-6 text-sm text-gray-400 dark:text-slate-500">Failed to load aspect data.</p>
        ) : (
          <div className="p-6 space-y-6">
            {/* Sentiment breakdown */}
            <div>
              <p className="section-label mb-2.5">Sentiment breakdown</p>
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-3">
                <div className="bg-green-500 transition-all rounded-l-full" style={{ width: posP + '%' }} />
                <div className="bg-gray-200 dark:bg-slate-600 transition-all" style={{ width: neuP + '%' }} />
                <div className="bg-red-400 transition-all rounded-r-full" style={{ width: negP + '%' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50/80 dark:bg-green-900/15 rounded-xl p-3 text-center border border-green-100/60 dark:border-green-800/30">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">{posP}%</p>
                  <p className="text-[10px] text-green-600/70 dark:text-green-400/70 font-medium">Positive ({data.positive})</p>
                </div>
                <div className="bg-gray-50/80 dark:bg-slate-800/40 rounded-xl p-3 text-center border border-gray-100/60 dark:border-slate-700/30">
                  <p className="text-lg font-bold text-gray-400 dark:text-slate-500 tabular-nums">{neuP}%</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Neutral ({data.neutral})</p>
                </div>
                <div className="bg-red-50/80 dark:bg-red-900/15 rounded-xl p-3 text-center border border-red-100/60 dark:border-red-800/30">
                  <p className="text-lg font-bold text-red-500 dark:text-red-400 tabular-nums">{negP}%</p>
                  <p className="text-[10px] text-red-500/70 dark:text-red-400/70 font-medium">Negative ({data.negative})</p>
                </div>
              </div>
            </div>

            {/* Trend chart */}
            <div>
              <p className="section-label mb-3">Sentiment trend over time</p>
              <div className="bg-gray-50/80 dark:bg-slate-800/40 rounded-xl p-5 border border-gray-100/60 dark:border-slate-700/30">
                <TrendChart trend={data.trend} />
              </div>
            </div>

            {/* Tabs */}
            <div>
              <div className="tab-bar inline-flex mb-5">
                {(['overview', 'reviews'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={"tab-item " + (tab === t ? "tab-active" : "tab-inactive")}>
                    {t === 'overview' ? 'Patterns & signals' : `Reviews (${data.reviews.length})`}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div>
                  {data.patterns.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-slate-500">No pattern signals detected yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {data.patterns.map((p, i) => {
                        const typeLabel = p.type === 'conditional_prob' ? 'Conditional prob.' : p.type === 'co_occurrence' ? 'Co-occurrence' : 'Contrast signal';
                        const typeBg = p.type === 'conditional_prob' ? 'bg-amber-50 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400 border-amber-100/60 dark:border-amber-800/40'
                          : p.type === 'co_occurrence' ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400 border-blue-100/60 dark:border-blue-800/40'
                          : 'bg-purple-50 dark:bg-purple-900/25 text-purple-700 dark:text-purple-400 border-purple-100/60 dark:border-purple-800/40';
                        return (
                          <div key={i} className="flex items-center gap-3 bg-white/60 dark:bg-slate-800/40 border border-gray-100/80 dark:border-slate-700/40 rounded-xl p-4">
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap border ${typeBg}`}>{typeLabel}</span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-700 dark:text-slate-300">
                                <span className="font-semibold">{p.aspect}</span>
                                <svg className="inline w-3 h-3 text-gray-300 dark:text-slate-600 mx-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12" />
                                </svg>
                                <span className="font-semibold">{p.related_issue}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 min-w-[100px] justify-end">
                              <div className="w-14 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: p.score + '%' }} />
                              </div>
                              <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 tabular-nums">{p.score}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-2.5">
                  {data.reviews.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-slate-500">No reviews found for this aspect.</p>
                  ) : data.reviews.map((r, i) => {
                    const isPositive = r.sentiment === 'positive';
                    const isNegative = r.sentiment === 'negative';
                    const accent = isPositive ? 'border-l-green-500' : isNegative ? 'border-l-red-400' : 'border-l-gray-300 dark:border-l-slate-600';
                    return (
                      <div key={i} className={`rounded-xl p-4 border border-gray-100/80 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/40 border-l-[3px] ${accent}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            {r.rating !== null && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold tabular-nums ${
                                isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : isNegative ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                                : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500'
                              }`}>
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {r.rating.toFixed(1)}
                              </div>
                            )}
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider">{r.source}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : isNegative ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                            : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500'
                          }`}>
                            {r.sentiment} · {(r.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">"{r.body}"</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AspectDetailModal;
