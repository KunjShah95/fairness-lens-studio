# CONTEXT.md — EquityLens

> This file is the single source of truth for anyone joining the EquityLens project. It explains the problem, the product decisions, the system design reasoning, and how every piece connects. Read this before touching the codebase.

---

## 1. Why EquityLens Exists

AI systems are making life-changing decisions — especially in **healthcare triage, risk scoring, prior authorization, and treatment prioritization** — at massive scale. These models learn from historical data, and historical data is full of human bias. The result: automated systems that can systematically disadvantage patients based on gender, race, age, location, disability, and dozens of other proxies.

Existing tools like IBM AIF360 and Microsoft Fairlearn are powerful but aimed at data scientists. They answer "is there bias?" but not:

- **Why** does this bias exist? (root cause)
- **Who** is affected, and by how much? (human impact)
- **What** should we do about it? (actionable mitigation)
- **How** do we prove we fixed it to regulators? (compliance)
- **Can** the person who was harmed understand and challenge it? (individual rights)

EquityLens exists to answer all five questions in one platform — and to make those answers accessible to clinicians, hospital administrators, affected individuals, and regulators — not just ML engineers.

---

## 2. Target Users and Their Needs

### Analysts / Data Scientists

- Need to run bias audits quickly on healthcare models and datasets
- Want SHAP/LIME explanations to understand feature contributions
- Need before/after comparisons when mitigation is applied
- Comfortable with technical dashboards and metric tables

### Compliance / Legal Teams

- Need to know specifically which healthcare regulations and policies are at risk
- Want audit-ready PDF reports they can hand to regulators
- Need an immutable record of what was found and what was done
- Do not want to interpret raw fairness scores — they want traffic-light indicators

### Hospital / Operations Leaders

- Want a single Fairness Score they can track over time
- Need ROI framing: "fixing this reduces clinical and legal risk"
- Want the Bias Nutrition Label to communicate status to leadership
- Need the Fairness Committee workflow to route accountability properly

### Affected Individuals (Public Users)

- Do not have accounts — must be able to access the portal without login
- Want a plain-language explanation of why a decision was made about them
- Need a clear, structured way to challenge a decision they believe was unfair
- Must not be confronted with statistical jargon

---

## 3. The Eight System Stages — Design Rationale

### Stage 1 — Data Ingestion

**What:** CSV uploads, trained model files (Pickle/ONNX), and direct plug-in connectors to healthcare systems and clinical workflows.

**Why these connectors matter:** Adoption of fairness tools dies when integration is hard. If a hospital team can connect a clinical workflow in one click and audit their triage model in 10 minutes, they will. If they have to export CSVs and write transformation scripts, they won't. The connectors are a strategic adoption wedge.

**Key design decision:** We store raw uploaded data and metadata separately. Raw data is stored in PostgreSQL with row-level encryption. Metadata (column names, schema, detected sensitive attributes) is indexed for fast audit configuration.

---

### Stage 2 — Technical Bias Detection

**What:** AIF360 and Fairlearn compute three core metrics. SHAP detects proxy variables. LIME generates local explanations per decision.

**The three core metrics:**

| Metric | What it measures | Threshold for concern |
|--------|-----------------|----------------------|
| Demographic Parity | Are approval rates equal across groups? | < 0.80 |
| Equal Opportunity | Are true positive rates equal? | < 0.80 |
| Disparate Impact | Ratio of selection rates between groups | < 0.80 (EEOC 4/5ths rule) |

**Proxy bias detection:** SHAP values reveal which features drive decisions. We compute Pearson correlation between each high-importance feature and each protected attribute. A correlation above 0.70 triggers a proxy bias flag. Example: postal code correlating 0.81 with race means postal code is acting as a racial proxy.

**Key design decision:** We run all three metrics simultaneously in async tasks (FastAPI BackgroundTasks) so a large dataset audit doesn't block the API. Results are stored in PostgreSQL and streamed to the frontend via Server-Sent Events.

---

### Stage 3 — Intelligence Layer (Differentiator)

**What:** Three capabilities that go beyond what AIF360 and Fairlearn offer out of the box.

**Temporal Drift Monitoring:**
Every model version is stored with its audit timestamp. A cron job (APScheduler) re-runs bias metrics monthly (or on a configurable schedule) against the live model's predictions. If any metric drops more than 5 percentage points from the previous audit, an alert is sent to the Admin role via email and in-app notification. This catches model decay — where a model that passed its initial audit starts drifting as the real-world distribution shifts.

**Intersectional Bias Detection:**
Standard tools measure gender OR race, not gender AND race. EquityLens constructs intersection subgroups (e.g., Black women, older South Asian men) and computes metrics for each subgroup. We use a minimum subgroup size threshold (n=30 by default) to avoid statistical noise on very small groups. Intersectional findings are visually highlighted because they often reveal the worst harm.

**Causal Fairness (DoWhy):**
Correlation-based bias detection has a fundamental weakness: correlation is not causation. A feature might correlate with a protected attribute without causing disparate outcomes. DoWhy lets us build a causal graph (DAG) of the features and test whether removing a protected attribute or its proxies actually changes outcomes. This produces legally stronger evidence: "This feature causally changes loan outcomes for women" is a different claim than "this feature correlates with gender."

---

### Stage 4 — Decision Layer

**What:** The Fairness Score, ROI framing, and automated mitigation.

**Fairness Score (0–100):**
A weighted composite:

- Demographic Parity: 30%
- Equal Opportunity: 30%
- Disparate Impact: 25%
- Proxy bias penalty: -15 points per flagged proxy feature (capped at -30)
- Intersectional disparity penalty: -10 if worst intersectional group is >20% below average

Score bands:

- 80–100: Pass (green)
- 60–79: Marginal (amber) — review recommended
- 0–59: High risk (red) — mitigation required before deployment

**Mitigation Techniques (applied in order of invasiveness):**

1. **Reweighting** — adjusts sample weights so underrepresented groups have more influence in training. Least invasive; does not change model architecture.
2. **Feature removal / transformation** — removes flagged proxy features or replaces with fairness-aware alternatives (e.g., replacing postal code with income decile).
3. **Adversarial debiasing** — trains a secondary model to predict the protected attribute; the primary model is penalized for making that prediction easier. Most powerful but requires retraining.

The system always presents a before/after comparison so teams can assess the accuracy trade-off (fairness often costs a small amount of predictive accuracy — this must be visible and explicitly accepted).

---

### Stage 5 — Human Impact Simulator (Core USP)

**What:** Translates statistical bias into human stories and scenarios.

**Population-level impact:**
Given a detected bias, we estimate how many people in the dataset were affected. We compute: "Of the N people rejected, how many would have been approved under a debiased model?" This is done by re-running the debiased model predictions on the original dataset and comparing decision changes per demographic group.

**Individual-level what-if:**
Using DiCE-ML (Diverse Counterfactual Explanations), we generate the minimum feature changes needed to flip an individual's decision. Example output: "If your postal code had been 400001 instead of 400015, your application would have been approved." This is the most emotionally resonant output in the platform — it makes an abstract statistical problem personal and concrete.

**Scenario modeling:**
Users can ask system-level questions:

- "What if gender was removed from the model entirely?"
- "What if we applied reweighting only?"
- "What if the model only used income and credit score?"

Each scenario re-runs the model on the full dataset and returns updated Fairness Scores and population impact estimates.

**Key design decision:** The Simulator is compute-intensive. All simulation runs are queued via a task queue (Celery + Redis) and results are returned asynchronously. The frontend polls for results and shows a progress indicator.

---

### Stage 6 — Trust Layer

**What:** The Affected Person Portal and Appeals Workflow.

**Affected Person Portal:**
Accessible without login at `/portal`. A person enters their profile details (age, location, symptoms category, other non-sensitive fields the org has configured as allowable) and receives:

1. A plain-language explanation of how the model treated their profile
2. Which features drove the decision most heavily
3. Whether any of those features are flagged as bias proxies
4. What their outcome would have been under the debiased model

**Privacy design:** The portal never stores the individual's data. Each query is stateless — profile data is processed in memory and discarded. No PII is logged. The org configures which fields the portal accepts; EquityLens enforces that protected attributes (race, religion, caste) cannot be query inputs.

**Appeals Workflow:**
Structured four-step process:

1. Person submits appeal with reason (free text + supporting document upload)
2. EquityLens automatically runs a bias audit scoped to that individual's decision, packages the SHAP explanation and proxy flags as evidence
3. Legal team reviews the packaged evidence inside the platform (no need to query the ML team)
4. Decision: upheld (with reason) or overturned (with corrective action logged)

Every step is timestamped and stored in the immutable audit trail.

---

### Stage 7 — Compliance & Governance Layer

**What:** Regulation mapper, audit trail, fairness committee workflow, and department-level thresholds.

**Regulation Mapper:**
A manually curated mapping table links each fairness metric + threshold + healthcare workflow to specific regulatory clauses. When an audit completes, the system looks up which regulations apply and whether each metric meets the required threshold for that regulation.

Key regulations covered:

- EU AI Act Articles 9, 10, 13 (high-risk AI systems)
- GDPR Article 22 (automated decision-making rights)
- Healthcare privacy and automated decision guidance
- Hospital policy and healthcare governance requirements

**Immutable Audit Trail:**
Every audit run, mitigation application, committee decision, and appeals outcome is logged with:

- ISO 8601 timestamp
- Actor (user ID + role)
- Action type
- SHA-256 hash of the audit result snapshot
- Hash of the previous log entry (forming a hash chain)

This produces a tamper-evident log that can be presented to regulators as evidence of due diligence. Stored in MongoDB (append-only collection with write protection enforced at the application layer).

**Fairness Committee Workflow:**
Before a debiased model can be marked "approved for deployment," it must pass through a configurable sign-off chain. Default chain:

1. Analyst confirms mitigation results
2. Legal reviews regulation mapping
3. CISO reviews data security implications
4. Admin gives final deployment approval

Each step is gated — the next approver cannot act until the previous step is complete. The full chain is stored in the audit trail.

**Department-Level Thresholds:**
Different clinical workflows have different risk tolerances and regulatory contexts. An emergency triage team faces different rules than a claims review team. Admins can configure per-department fairness thresholds (e.g., Triage requires Demographic Parity ≥ 0.85; Prior Authorization requires Disparate Impact ≥ 0.80).

---

### Stage 8 — Transparency Outputs

**What:** The customer-facing and public-facing outputs of the platform.

**Bias Nutrition Label:**
A standardized one-page summary modeled on food nutrition labels. Designed to be readable by a board member in 30 seconds. Contains: Fairness Score, protected attributes audited, last audit date, number of appeals filed/resolved, and a public link. Generated as a styled PDF and as an embeddable HTML widget.

**Public Model Card:**
Accessible at `/public/modelcard/{model_id}` without authentication. Contains the same information as the Nutrition Label plus a brief explanation of the model's purpose, its training data description, known limitations, and the appeals contact. Shareable link is intended for organizations to publish on their website as a transparency commitment.

**PDF Compliance Reports:**
Full audit reports formatted for regulatory submission. Generated via WeasyPrint (server-side HTML-to-PDF). Includes all metric tables, SHAP visualizations, regulation mapping tables, mitigation before/after, and the full audit trail excerpt.

**Developer API:**
Full REST API documented via OpenAPI (auto-generated by FastAPI). Allows organizations to integrate EquityLens into their existing MLOps pipelines — triggering audits automatically on every model training run.

**Feedback Loop:**
Public portal users and affected individuals can rate whether the explanation they received was accurate and understandable. This feedback is aggregated and surfaced to Analysts to help them improve explanation quality. It also feeds back into threshold calibration for the proxy bias detection sensitivity.

---

## 4. Data Flow Summary

```
External Source (CSV / API / Model file)
        │
        ▼
    Ingestion Layer (FastAPI /ingest)
        │  stores raw data + metadata
        ▼
    Bias Engine (AIF360 + Fairlearn + SHAP + DoWhy)
        │  async task queue (Celery + Redis)
        ▼
    Results DB (PostgreSQL)
        │
        ├──► Decision Layer (Fairness Score + Mitigation)
        │         │
        │         ▼
        │    Simulation Engine (DiCE-ML counterfactuals)
        │
        ├──► Compliance Layer (Regulation Mapper + Audit Trail)
        │
        └──► Transparency Layer (Reports + Model Cards + Portal)
```

---

## 5. Key Design Decisions and Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| FastAPI over Flask | Async support for long-running ML tasks; auto OpenAPI docs | Steeper learning curve for pure Python devs |
| PostgreSQL as primary store | Structured audit data with strong consistency guarantees | Less flexible schema evolution than MongoDB |
| MongoDB for audit trail | Append-only document model maps naturally to immutable logs | Requires application-layer enforcement of immutability |
| Celery for simulation tasks | Prevents simulation from blocking the API under load | Adds infrastructure complexity (Redis broker required) |
| DiCE-ML for counterfactuals | Best-in-class diverse counterfactual library; model-agnostic | Slower than simple feature perturbation approaches |
| No PII storage in the portal | Legal and ethical requirement — portal users must not be profiled | Stateless design complicates debugging portal issues |
| Hash chain for audit trail | Tamper-evidence without blockchain complexity | Chain is only as secure as the application layer enforcing append-only |

---

## 6. Sensitive Areas and Constraints

- **Protected attributes** (race, religion, caste, gender, age, disability, pregnancy) must never be used as input features in the portal. The list is configurable per jurisdiction.
- **Minimum subgroup size** for intersectional analysis defaults to n=30. Below this, results are marked "insufficient data" to avoid misleading small-sample statistics.
- **Accuracy vs. fairness trade-off** must always be surfaced explicitly when mitigation is applied. The platform must not hide accuracy drops.
- **Appeals data** is subject to GDPR right-to-erasure. The system must support deleting an individual's appeal submission on request while preserving the anonymized audit evidence.
- **Regulation mapping is jurisdiction-specific.** The platform ships with mappings for EU, US, and India. Adding new jurisdictions requires a PR to the regulation mapping table — do not hardcode regulatory logic into business logic.

---

## 7. Glossary

| Term | Definition |
|------|-----------|
| **Demographic Parity** | Positive outcome rates should be equal across demographic groups |
| **Equal Opportunity** | True positive rates should be equal across groups |
| **Disparate Impact** | Ratio of selection rates between two groups; EEOC requires ≥ 0.80 |
| **Proxy Bias** | A non-protected feature (e.g., postal code) that correlates with a protected attribute and smuggles discrimination into the model |
| **Intersectional Bias** | Bias experienced by people who belong to multiple disadvantaged groups simultaneously |
| **Causal Fairness** | Fairness assessed through causal (not just correlational) relationships between features and outcomes |
| **Counterfactual** | A minimum-change scenario: "what is the nearest alternative world in which this person gets a different outcome?" |
| **Fairness Score** | EquityLens's composite 0–100 score combining all fairness metrics |
| **Nutrition Label** | A standardized one-page model summary inspired by food nutrition labels |
| **Model Card** | A public-facing, shareable document describing a model's fairness properties |
| **Audit Trail** | An immutable, hash-chained log of all platform actions for regulatory evidence |
| **Temporal Drift** | The degradation of a model's fairness properties over time as real-world data distributions shift |
| **Fairness Committee** | The multi-stakeholder human sign-off workflow required before a debiased model can be deployed |

---

*Last updated: April 2026. Maintained by the EquityLens core team.*
