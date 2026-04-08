export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
}

export interface ProductScore {
  product_id: number;
  score: number;
  review_count: number;
  status: StatusLevel;
  total_aspects: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  top_negative: { aspect: string; count: number }[];
  top_positive: { aspect: string; count: number }[];
}

export interface AspectSummary {
  aspect: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  avg_confidence: number;
}

export interface PatternSignal {
  aspect: string;
  related_issue: string;
  pattern_type: string;
  score: number;
}

export interface Review {
  id: number;
  body: string;
  rating: number;
  source: string;
}

export interface QueryResponse {
  question: string;
  answer: string;
  evidence: { text: string; rating: number; score: number }[];
  patterns_used: PatternSignal[];
  aspect_summary: AspectSummary[];
}

export type StatusLevel = 'Critical' | 'Moderate' | 'Stable';

export interface ProductSummary {
  aspect_summary: AspectSummary[];
  top_patterns: PatternSignal[];
}

// ── Causal inference types ──
export interface CausalNode {
  id: string;
  label: string;
  total: number;
  neg_ratio: number;
  pos_ratio: number;
}

export interface CausalEdge {
  from: string;
  to: string;
  edge_type: string;
  strength: number;
  method: string;
  validated: boolean;
  reason: string;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface FixSimulation {
  aspect_fixed: string;
  current_score: number;
  predicted_score: number;
  score_delta: number;
  confidence: number;
  affected_chain: string[];
  details: Record<string, { neg_ratio_before: number; neg_ratio_after: number }>;
}

export interface FixRankings {
  rankings: FixSimulation[];
}

export const getStatus = (score: number): StatusLevel => {
  if (score < 6.5) return 'Critical';
  if (score < 7.5) return 'Moderate';
  return 'Stable';
};
