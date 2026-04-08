# Insights AI — Product & Research Document

## 1. Executive Summary

**Insights AI** is a full-stack AI-powered product intelligence platform that transforms raw customer reviews into actionable, evidence-backed insights. Unlike conventional sentiment analysis tools that stop at "positive/negative" labels, Insights AI introduces **causal inference** and **counterfactual fix estimation** — enabling product teams to answer not just *what* customers think, but *why* they think it and *what to fix first*.

The system combines:
- **Aspect-Based Sentiment Analysis (ABSA)** using DeBERTa-v3
- **Causal Discovery** via the PC Algorithm and Granger Causality
- **Structural Causal Models (SCM)** for counterfactual "what-if" simulation
- **LLM-based edge validation** to filter spurious correlations
- **Retrieval-Augmented Generation (RAG)** for natural-language querying

This positions the project at the intersection of **NLP**, **causal inference**, and **product analytics** — a combination that is largely unexplored in both industry and academia.

---

## 2. System Architecture

### 2.1 High-Level Pipeline

```
                    ┌──────────────────────────────────────────┐
                    │           Review Ingestion               │
                    │   (CSV / JSON / Excel per product)       │
                    └──────────────┬───────────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────────┐
                    │         Preprocessing                     │
                    │   Text cleaning, validation, dedup        │
                    └──────────────┬───────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
  ┌───────────▼──────────┐ ┌──────▼──────────┐ ┌───────▼───────────┐
  │  Semantic Embedding   │ │  ABSA Extraction │ │  (Future: Entity  │
  │  all-MiniLM-L6-v2    │ │  DeBERTa-v3-base │ │   Recognition)    │
  │  → Qdrant Vector DB  │ │  → PostgreSQL    │ │                   │
  └───────────┬──────────┘ └──────┬──────────┘ └───────────────────┘
              │                    │
              │         ┌─────────▼──────────────────────┐
              │         │     Pattern Detection           │
              │         │  Co-occurrence, conditional     │
              │         │  probability, contrast signals  │
              │         └─────────┬──────────────────────┘
              │                   │
              │         ┌─────────▼──────────────────────┐
              │         │     Causal Discovery            │
              │         │  PC Algorithm + Granger         │
              │         │  → Causal edge graph            │
              │         └─────────┬──────────────────────┘
              │                   │
              │         ┌─────────▼──────────────────────┐
              │         │  Structural Causal Model (SCM)  │
              │         │  Counterfactual simulation       │
              │         │  Fix ranking by impact           │
              │         └─────────┬──────────────────────┘
              │                   │
  ┌───────────▼───────────────────▼──────────────────────┐
  │          RAG Query Engine                             │
  │  Semantic retrieval + pattern context + LLM answer    │
  │  (Mistral via Ollama)                                 │
  └──────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Vite |
| **API Gateway** | FastAPI (Python), JWT authentication |
| **ABSA Model** | `yangheng/deberta-v3-base-absa-v1.1` (HuggingFace) |
| **Embeddings** | `all-MiniLM-L6-v2` (Sentence Transformers) |
| **Vector DB** | Qdrant (semantic retrieval) |
| **LLM** | Mistral 7B via Ollama (local, private) |
| **Database** | PostgreSQL (relational data + ABSA outputs) |
| **Task Queue** | Celery + Redis (async pipeline) |
| **Causal Engine** | Custom Python (NumPy, SciPy) |

### 2.3 Microservice Architecture

```
Port 8000  →  API Gateway (FastAPI)       — Auth, routing, CORS
Port 8001  →  Ingestion Service           — Review upload, storage
Port 8002  →  Query Service               — RAG pipeline, LLM answers
Port 6333  →  Qdrant                      — Vector similarity search
Port 6379  →  Redis                       — Celery message broker
Port 5432  →  PostgreSQL                  — Persistent storage
Port 11434 →  Ollama                      — Local LLM inference
```

---

## 3. Core NLP Pipeline

### 3.1 Aspect-Based Sentiment Analysis (ABSA)

**Model:** DeBERTa-v3-base fine-tuned for ABSA (`yangheng/deberta-v3-base-absa-v1.1`)

**Process:**
1. For each review, identify mentions of predefined aspect categories (e.g., BATTERY_LIFE, HEATING, DISPLAY, CAMERA, PERFORMANCE, BUILD_QUALITY, PRICE_VALUE, etc.)
2. For each detected aspect, construct an ABSA prompt: `[CLS] {review_text} [SEP] {aspect_keyword} [SEP]`
3. The model classifies sentiment as **positive**, **negative**, or **neutral** with a confidence score
4. Results are stored in the `absa_outputs` table with per-review, per-aspect granularity

**Output Schema:**
```
absa_outputs: review_id, product_id, aspect_category, sentiment, confidence
```

This per-review, per-aspect structure is what enables the downstream causal analysis — we can observe which aspects co-occur as negative within the same review, forming the basis for causal discovery.

### 3.2 Semantic Embedding & Retrieval

**Model:** `all-MiniLM-L6-v2` (384-dimensional embeddings)

Each review is embedded and stored in Qdrant with metadata (product_id, rating, source). At query time, the user's question is embedded and the top-k semantically similar reviews are retrieved, providing grounded evidence for LLM answers.

### 3.3 Pattern Detection

Three types of statistical patterns are computed from ABSA outputs:

| Pattern Type | Formula | Interpretation |
|-------------|---------|----------------|
| **Co-occurrence** | P(A=neg ∧ B=neg) / N | How often two aspects are both negative in the same review |
| **Conditional probability** | P(B=neg \| A=neg) | When A is negative, how often is B also negative? |
| **Contrast** | \|P(pos) - P(neg)\| | How polarized sentiment is for a single aspect |

These patterns serve dual purposes: (1) direct evidence for RAG answers, and (2) input signals for causal discovery.

---

## 4. Causal Inference Engine — The Novel Contribution

### 4.1 Motivation & Research Gap

Standard ABSA tools tell you *what* customers feel about each product feature. But product teams need to know:
- **Why** is battery sentiment declining? (Root cause identification)
- **Which** fix would improve the overall score the most? (Intervention planning)
- **How much** would fixing heating improve battery sentiment? (Counterfactual estimation)

These are fundamentally **causal** questions that correlation-based analysis cannot answer. Insights AI bridges this gap by applying formal causal inference methods to NLP outputs — a combination that is largely absent from existing literature and tools.

### 4.2 Causal Discovery: PC Algorithm

The **Peter-Clark (PC) Algorithm** discovers the causal graph structure from observational data. Our implementation operates on the binary aspect-sentiment matrix derived from ABSA outputs.

**Phase 1 — Skeleton Learning:**
```
Input: N_reviews × N_aspects binary matrix (1 = aspect negative in review)

For conditioning_set_size = 0, 1, 2:
  For each pair of aspects (i, j) with an existing edge:
    For each subset S of common neighbors of size cond_size:
      Perform conditional independence test: X_i ⊥ X_j | S
      If independent (p > α):
        Remove edge i—j
        Record separation set: sep[i][j] = S
```

**Conditional Independence Testing:**
- Uses chi-squared test for marginal independence (no conditioning set)
- For conditional tests: stratifies observations by conditioning variables, performs chi-squared within each stratum, and combines p-values using **Fisher's method**
- Falls back to Fisher's exact test when expected cell frequencies < 5
- Significance level α = 0.05

**Phase 2 — V-Structure Detection:**
```
For each triple (X, Z, Y) where X—Z—Y and X ∤ Y:
  If Z ∉ sep[X, Y]:
    Orient as X → Z ← Y  (collider/v-structure)
```

V-structures are the key mechanism for discovering causal direction from observational data — they represent situations where two independent causes share a common effect.

**Phase 3 — Edge Orientation (Meek's Rules):**
```
If X → Z — Y and X ∤ Y:
  Orient as Z → Y  (avoids creating new v-structures)
```

**Edge Strength — Average Treatment Effect (ATE):**
```
ATE(A → B) = P(B=neg | A=neg) − P(B=neg | A≠neg)
```

This measures the causal effect: how much does A being negative *increase* the probability of B being negative, beyond B's baseline rate. Only edges with ATE ≥ 0.05, minimum support of 10 negative reviews, and minimum co-occurrence of 5 are retained.

### 4.3 Temporal Causal Validation: Granger Causality

When sufficient temporal data exists (≥ 6 months), the system applies **Granger causality tests** as a secondary validation:

```
For each aspect pair (A, B):
  Construct monthly time series: neg_ratio_A(t), neg_ratio_B(t)
  
  Restricted model:  B(t) = α + β₁·B(t-1)
  Unrestricted model: B(t) = α + β₁·B(t-1) + β₂·A(t-1)
  
  F-test: Does including A's history significantly improve prediction of B?
  If p < 0.10: temporal causal evidence found
```

**Edge Merging Strategy:**
- PC algorithm edges are primary (cross-sectional evidence)
- Granger edges provide secondary temporal evidence
- Edges found by both methods receive a 15% strength boost and are marked `pc+granger`

### 4.4 LLM-Based Causal Validation

Statistical tests can discover spurious correlations (e.g., two aspects both mentioned frequently in premium product reviews). To filter these, the system uses **LLM-based semantic validation**:

```
Prompt: "In a {product_category}, can issues with {Aspect A} physically 
or logically CAUSE issues with {Aspect B}?"

Rules:
- Only YES if there is a direct or well-known indirect causal mechanism
- Correlation alone is NOT causation
- Consider physical, engineering, and user-experience causal pathways
```

**Example validation:**
```
HEATING → BATTERY_LIFE:
  VERDICT: YES
  REASON: Excessive heat degrades lithium battery chemistry and 
  accelerates capacity loss, reducing effective battery life.

PACKAGING → DISPLAY_QUALITY:
  VERDICT: NO
  REASON: Packaging and display quality are independent product 
  attributes with no causal mechanism.
```

Validated edges are marked `edge_type='causal'`; rejected edges are demoted to `edge_type='correlated'` but retained for reference. This creates a **hybrid statistical-semantic causal graph**.

### 4.5 Structural Causal Model & Counterfactual Simulation

The most novel contribution: once the causal graph is discovered, the system builds a **Structural Causal Model (SCM)** to answer counterfactual "what-if" questions.

**Intervention: do(Aspect = fully positive)**

The simulation implements Pearl's **do-operator** to estimate what would happen if a specific aspect's issues were completely resolved:

```
Step 1: Intervene on target aspect
  Set neg_ratio(target) = 0
  Move all negative reviews to positive

Step 2: Propagate downstream effects (BFS, 3 hops, decay=0.6)
  For each downstream aspect B connected by edge A → B:
    reduction = ATE_coefficient(A→B) × decay_factor
    B.negative -= B.negative × reduction
    B.positive += recovered reviews
    
  2nd-order effects dampened by 0.6× per hop
  3rd-order effects dampened by 0.36×

Step 3: Compute predicted score
  predicted_score = (total_positive / total_reviews) × 10
  score_delta = predicted_score − current_score

Step 4: Confidence estimation
  confidence = min(0.95, base_sample_confidence + edge_bonus)
```

**Fix Ranking:**

The system simulates fixing every aspect with >15% negative ratio and ranks them by predicted score improvement. This directly answers: *"If we could only fix one thing, what should it be?"*

**Example output:**
```
#1: Fix HEATING     → Score: 6.8 → 7.9 (+1.1 pts, 82% confidence)
    Also improves: BATTERY_LIFE, PERFORMANCE

#2: Fix BATTERY_LIFE → Score: 6.8 → 7.4 (+0.6 pts, 78% confidence)

#3: Fix PRICE_VALUE  → Score: 6.8 → 7.1 (+0.3 pts, 65% confidence)
```

---

## 5. RAG Query Engine

### 5.1 Multi-Source Evidence Retrieval

When a user asks a question like *"Why is battery sentiment declining?"*, the system retrieves:

1. **Semantically similar reviews** from Qdrant (vector similarity search)
2. **Statistical pattern signals** from the pattern_results table (co-occurrence, conditional probability)
3. **Aspect sentiment summary** aggregated from ABSA outputs

### 5.2 Context-Augmented Prompt

All three evidence sources are combined into a structured prompt for the LLM:

```
You are a product intelligence analyst. Answer the question using ONLY 
the data provided below.

=== ASPECT SENTIMENT SUMMARY ===
- HEATING: 60 positive, 82 negative out of 90 mentions
- BATTERY_LIFE: 17 positive, 103 negative out of 120 mentions
...

=== STATISTICAL PATTERNS (Root Cause Signals) ===
- When HEATING is negative, BATTERY_LIFE is also negative 75% of the time
- HEATING and BATTERY_LIFE co-occur in 45% of negative reviews
...

=== SUPPORTING CUSTOMER REVIEWS ===
[1.0/5.0] "Phone gets extremely hot during gaming, battery dies in 2 hours..."
[2.0/5.0] "Battery drain and overheating are terrible after the update..."
...

QUESTION: Why is battery sentiment declining?
```

### 5.3 Evidence-Grounded Answers

The LLM generates answers backed by real data — not hallucinations. Every answer includes:
- The statistical insight (e.g., "75% conditional probability")
- Supporting review quotes as evidence
- Pattern signals that were used in reasoning

---

## 6. Frontend & User Experience

### 6.1 Application Pages

| Page | Purpose |
|------|---------|
| **Landing** | Product marketing page with feature showcase |
| **Dashboard** | Multi-product overview with scores and status |
| **Product Detail** | Per-product metrics, summary, strengths/weaknesses, Ask Insights |
| **Deep Dive** | Four-tab analysis: Aspects, Root Causes, Evidence, Ask Insights |

### 6.2 Key UI Features

- **Aspect Sentiment Cards** — Click to see trend over time, patterns, and related reviews
- **Root Cause Analysis** — Visual causal chains showing which issues cause which downstream effects, with severity indicators and strength bars
- **Fix Simulator** — "What if you fix X?" counterfactual predictions with score delta and cascade effects
- **Fix Priority Rankings** — Automated ranking of all possible fixes by predicted impact
- **Ask Insights** — Natural language query interface with evidence-backed answers
- **Dark Mode** — Full theme support with glassmorphism design system

---

## 7. Novelty & Research Contribution

### 7.1 What Makes This Novel

| Dimension | Standard ABSA Tools | Insights AI |
|-----------|-------------------|-------------|
| **Output** | Aspect sentiment percentages | Causal relationships + counterfactual interventions |
| **Root cause** | Implicit; requires human interpretation | Explicit; PC algorithm discovers causal mechanisms |
| **Confounders** | Ignored; raw correlation only | Controlled via stratified conditional independence testing |
| **Direction** | No directionality | Discovers A→B vs B→A using v-structures + ATE |
| **Temporal** | Snapshot only | Optional Granger test for sequential patterns |
| **Fix prioritization** | Manual product strategy | Automated SCM simulation with score delta ranking |
| **Validation** | None | LLM validates causal plausibility vs spurious correlation |
| **Actionability** | "Battery is 60% negative" | "Fix HEATING to improve overall score by +1.1 points" |

### 7.2 Positioning in Literature

**Existing work in ABSA** (Pontiki et al., 2016; Zhang et al., 2022) focuses on extraction accuracy — identifying aspects and classifying sentiment. The output is descriptive: what percentage of reviews are positive/negative for each feature.

**Existing work in causal NLP** (Feder et al., 2022; Keith et al., 2020) focuses on estimating causal effects of text features on outcomes (e.g., does review length affect helpfulness?). These operate on text as treatment, not on extracted aspect structures.

**Our contribution bridges these fields:**
1. We use ABSA outputs as **structured observational data** for causal discovery
2. We apply the **PC Algorithm** — a well-established causal discovery method from Spirtes et al. (2000) — to aspect-sentiment co-occurrence matrices
3. We build **Structural Causal Models** over aspect relationships for counterfactual fix estimation
4. We introduce **LLM-based causal validation** as a hybrid statistical-semantic approach to filter spurious edges
5. We integrate causal insights into a **RAG pipeline** for natural-language querying

This combination — **ABSA → Causal Discovery → SCM → Counterfactual Simulation → RAG** — is, to our knowledge, not present in existing literature or commercial tools.

### 7.3 Research Direction: CausalASA

**Proposed paper title:** *CausalASA: Causal Aspect-Based Sentiment Analysis with Counterfactual Fix Estimation*

**Target venues:** EMNLP, ACL, NAACL

**Key contributions for publication:**
1. A pipeline that transforms ABSA outputs into causal graphs using PC Algorithm
2. Counterfactual fix estimation using Structural Causal Models over aspect relationships
3. Hybrid statistical-semantic validation using LLM-based edge filtering
4. Evaluation framework: Does fixing the top-ranked aspect actually improve future scores? (Temporal validation)

---

## 8. Data Flow — End-to-End Example

```
User uploads reviews CSV for "Samsung Galaxy S24"
    │
    ▼
Ingestion: 500 reviews saved to PostgreSQL
    │
    ▼
Preprocessing: Text cleaning, validation (Celery task)
    │
    ▼
Embedding: 500 reviews → 384-dim vectors → Qdrant
    │
    ▼
ABSA: DeBERTa extracts aspects per review
    │  Review #1: HEATING=negative, BATTERY_LIFE=negative
    │  Review #2: CAMERA=positive, DISPLAY=positive
    │  ...
    │  → 1,200 aspect-sentiment records in absa_outputs
    │
    ▼
Pattern Detection:
    │  "When HEATING is negative, BATTERY_LIFE is negative 75% of the time"
    │  "HEATING and PERFORMANCE co-occur in 40% of negative reviews"
    │
    ▼
Causal Discovery (PC Algorithm):
    │  HEATING → BATTERY_LIFE (ATE=0.56, method=pc_algorithm)
    │  HEATING → PERFORMANCE  (ATE=0.38, method=pc_algorithm)
    │  DISPLAY → PRICE_VALUE  (ATE=0.22, method=pc+granger)
    │
    ▼
Structural Causal Model:
    │  "Fix HEATING → Score improves 6.8 → 7.9 (+1.1 pts)"
    │  "Fix BATTERY_LIFE → Score improves 6.8 → 7.4 (+0.6 pts)"
    │
    ▼
User asks: "Why is our score dropping?"
    │
    ▼
RAG Pipeline:
    │  1. Retrieve similar reviews from Qdrant
    │  2. Fetch pattern signals (conditional probability, co-occurrence)
    │  3. Build evidence-augmented prompt
    │  4. LLM generates grounded answer
    │
    ▼
Answer: "The primary driver of score decline is HEATING issues, which 
cause BATTERY_LIFE complaints in 75% of cases and PERFORMANCE issues 
in 40% of cases. Fixing thermal management would improve your overall 
score by approximately 1.1 points."
```

---

## 9. Database Schema

```sql
-- Core tables
products        (id, name, sku, category, client_id)
reviews         (id, product_id, body, rating, source, author, created_at)
clients         (id, name, slug)
users           (id, email, password_hash, role, client_id)

-- NLP outputs
absa_outputs    (id, review_id, product_id, aspect_category, sentiment, confidence)
pattern_results (id, product_id, dataset_id, aspect, related_issue, pattern_type, score)

-- Causal inference
causal_edges    (id, product_id, aspect_from, aspect_to, edge_type, strength, 
                 method, validated, validation_reason, computed_at)
```

---

## 10. Multi-Tenancy & Security

- **JWT-based authentication** with role-based access control
- **Client isolation**: Each organization sees only their own products and data
- **Client scoping**: Every query is filtered by `client_id` at the database level
- **Local LLM**: Mistral 7B runs locally via Ollama — no customer data leaves the server

---

## 11. Celery Task Pipeline

The entire processing pipeline is orchestrated as chained Celery tasks:

```
ingest_task → preprocess_task → embed_task → nlp_task → pattern_task → causal_task
```

Each stage is independently scalable via dedicated Celery queues:
- `ingestion` queue — data import
- `preprocessing` queue — text cleaning
- `embedding` queue — vector generation
- `nlp` queue — ABSA extraction
- `pattern_detection` queue — statistical patterns
- `causal_discovery` queue — causal graph construction

---

## 12. Future Roadmap

1. **Live review scraping** — Reddit (PRAW), Amazon, Flipkart, Twitter integration
2. **Anomaly radar** — Automated alerts when aspect sentiment shifts significantly
3. **Persona segmentation** — Cluster reviewers by behavior patterns
4. **Competitive analysis** — Cross-product causal comparison
5. **Response generation** — AI-drafted replies to negative reviews
6. **Temporal causal tracking** — How causal relationships evolve over time

---

*Insights AI — From reviews to root causes to fixes, powered by causal intelligence.*
