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
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 inline-block rounded" /><span className="text-xs text-gray-500 dark:text-slate-400">Positive %</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" /><span className="text-xs text-gray-500 dark:text-slate-400">Negative %</span></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {yLabels.map(v => (
          <g key={v}>
            <line x1={PL} y1={yPos(v)} x2={W - PR} y2={yPos(v)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={v === 50 ? "0" : "3,3"} />
            <text x={PL - 4} y={yPos(v) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
          </g>
        ))}
        <path d={posArea} fill="#22c55e" fillOpacity="0.08" />
        <polyline points={negLine} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={posLine} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {posValues.map((v, i) => (
          <circle key={i} cx={PL + i * xStep} cy={yPos(v)} r="3" fill="#22c55e" />
        ))}
        {trend.map((t, i) => (
          <text key={i} x={PL + i * xStep} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
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

  const sentimentColor = negP > 60 ? 'text-red-600 dark:text-red-400' : negP > 30 ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400';
  const sentimentBg    = negP > 60 ? 'bg-red-50 dark:bg-red-900/40' : negP > 30 ? 'bg-amber-50 dark:bg-amber-900/40' : 'bg-green-50 dark:bg-green-900/40';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto border border-gray-100 dark:border-slate-700"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold dark:text-slate-100">{aspect}</h3>
              {data && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sentimentBg} ${sentimentColor}`}>
                {negP > 60 ? `${negP}% negative` : `${posP}% positive`}
              </span>}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">{data?.total ?? '—'} mentions · confidence {data ? (data.avg_confidence * 100).toFixed(0) : '—'}%</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xl leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-5 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />)}
          </div>
        ) : !data ? (
          <p className="p-6 text-sm text-gray-400 dark:text-slate-500">Failed to load aspect data.</p>
        ) : (
          <div className="p-6 space-y-5">
            {/* Sentiment bar */}
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-2">Sentiment breakdown</p>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
                <div className="bg-green-500 transition-all" style={{ width: posP + '%' }} />
                <div className="bg-gray-200 dark:bg-slate-600 transition-all" style={{ width: neuP + '%' }} />
                <div className="bg-red-400 transition-all" style={{ width: negP + '%' }} />
              </div>
              <div className="flex gap-5">
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">{posP}% positive ({data.positive})</span>
                <span className="text-xs text-gray-400 dark:text-slate-500">{neuP}% neutral ({data.neutral})</span>
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">{negP}% negative ({data.negative})</span>
              </div>
            </div>

            {/* Trend chart */}
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium mb-3">Sentiment trend over time</p>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <TrendChart trend={data.trend} />
              </div>
            </div>

            {/* Tabs */}
            <div>
              <div className="flex gap-1 border-b border-gray-100 dark:border-slate-700 mb-4">
                {(['overview', 'reviews'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={"px-4 py-2 text-sm -mb-px border-b-2 transition-colors capitalize " +
                      (tab === t
                        ? "text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 font-medium"
                        : "text-gray-400 dark:text-slate-500 border-transparent hover:text-gray-600 dark:hover:text-slate-300")}>
                    {t === 'overview' ? 'Patterns & signals' : 'Reviews'}
                  </button>
                ))}
              </div>

              {tab === 'overview' && (
                <div>
                  {data.patterns.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-slate-500">No pattern signals detected yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.patterns.map((p, i) => {
                        const label = p.type === 'conditional_prob' ? 'Conditional probability' : p.type === 'co_occurrence' ? 'Co-occurrence' : 'Contrast signal';
                        const bg = p.type === 'conditional_prob' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400'
                          : p.type === 'co_occurrence' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                          : 'bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400';
                        return (
                          <div key={i} className="flex items-start gap-3 border border-gray-100 dark:border-slate-700 rounded-xl p-3">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 ${bg}`}>{label}</span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-700 dark:text-slate-300">
                                <span className="font-medium">{p.aspect}</span>
                                <span className="text-gray-400 dark:text-slate-500 mx-1.5">↔</span>
                                <span className="font-medium">{p.related_issue}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1 bg-gray-100 dark:bg-slate-600 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full" style={{ width: p.score + '%' }} />
                                </div>
                                <span className="text-xs font-medium text-gray-600 dark:text-slate-400">{p.score}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-3">
                  {data.reviews.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-slate-500">No reviews found for this aspect.</p>
                  ) : data.reviews.map((r, i) => (
                    <div key={i} className={`rounded-xl p-3.5 border ${
                      r.sentiment === 'positive' ? 'border-green-100 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/20'
                      : r.sentiment === 'negative' ? 'border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/20'
                      : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {r.rating !== null && (
                            <span className="text-amber-500 text-xs">
                              {"★".repeat(Math.round(r.rating))}{"☆".repeat(5 - Math.round(r.rating))}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">{r.source}</span>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          r.sentiment === 'positive' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                          : r.sentiment === 'negative' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                        }`}>
                          {r.sentiment} · {(r.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">"{r.body}"</p>
                    </div>
                  ))}
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
