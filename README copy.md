# EquityLens

> **An AI fairness platform that detects bias, explains its human impact, and provides actionable solutions to fix it before it harms lives.**

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [User Roles](#user-roles)
- [Key Features](#key-features)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

EquityLens is a multi-layer AI fairness platform built for organizations that use machine learning in high-stakes domains — hiring, finance, and healthcare. It goes beyond statistical bias detection to explain *why* bias occurs, show *who* is affected at an individual level, simulate *real-world impact*, and provide *actionable mitigation*.

The platform operates in eight stages:

1. **Data Ingestion** — CSV, API connectors (Workday, Salesforce, lending platforms), ML model files
2. **Bias Detection** — Fairness metrics via AIF360 and Fairlearn, SHAP/LIME root cause analysis
3. **Intelligence Layer** — Temporal drift monitoring, intersectional bias, causal fairness (DoWhy)
4. **Decision Layer** — Fairness Risk Score (0–100), ROI analysis, automated mitigation engine
5. **Human Impact Simulator** — Counterfactual what-if scenarios, population-level impact visualization
6. **Trust Layer** — Affected person portal, plain-language explanations, structured appeals workflow
7. **Compliance & Governance** — Regulation mapper (EU AI Act, EEOC, GDPR), immutable audit trail, fairness committee workflow
8. **Transparency Outputs** — Bias Nutrition Label, public model cards, PDF/CSV exports, developer API

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                         │
│           React.js + Vite + Tailwind + ShadCN           │
│   Recharts / D3.js / Chart.js for visualizations        │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼────────────────────────────────┐
│                        Backend                          │
│              FastAPI (Python 3.11+)                     │
│   Auth: Firebase Auth / JWT   Role-based access control │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼───┐ ┌───▼──────────┐
  │  Bias  │ │ SHAP / │ │Mitiga-│ │  Simulation  │
  │ Engine │ │  LIME  │ │ tion  │ │   Engine     │
  │AIF360  │ │ DoWhy  │ │Engine │ │Counterfactual│
  │Fairlrn │ │        │ │       │ │  Analysis    │
  └────────┘ └────────┘ └───────┘ └──────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                      Data Layer                         │
│   PostgreSQL (structured)   MongoDB (flexible/logs)     │
│               Redis (caching / sessions)                │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| React.js + Vite | SPA framework with fast HMR |
| Tailwind CSS + ShadCN UI | Component library and utility styling |
| Recharts / D3.js / Chart.js | Bias metric charts and drift visualizations |
| Zustand | Lightweight global state management |
| Service Workers | PWA support — offline-ready dashboards |

### Backend
| Tool | Purpose |
|------|---------|
| FastAPI (Python 3.11+) | REST API with automatic OpenAPI docs |
| Uvicorn | ASGI server |
| SQLAlchemy | ORM for PostgreSQL |
| Motor | Async MongoDB driver |
| Redis (aioredis) | Session caching and rate limiting |

### ML & Bias Detection
| Library | Purpose |
|---------|---------|
| AIF360 (IBM) | Demographic parity, equal opportunity, disparate impact |
| Fairlearn (Microsoft) | Additional fairness metrics and reductions |
| SHAP | Feature importance and proxy bias detection |
| LIME | Local decision explanations |
| DoWhy | Causal fairness analysis beyond correlation |
| scikit-learn | Model training, evaluation, pipeline |
| pandas / numpy | Data processing |

### Simulation Engine
| Tool | Purpose |
|------|---------|
| Custom counterfactual engine | What-if scenario modeling |
| DiCE-ML | Diverse counterfactual explanations |

### Infrastructure
| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Containerization |
| GitHub Actions | CI/CD pipeline |
| Vercel / Netlify | Frontend deployment |
| Render / Railway / AWS | Backend deployment |
| Firebase Auth | Authentication |

---

## Project Structure

```
equitylens/
├── frontend/                   # React.js application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/      # Org analytics dashboard
│   │   │   ├── simulator/      # Human Impact Simulator UI
│   │   │   ├── portal/         # Affected person portal
│   │   │   ├── compliance/     # Regulation mapper views
│   │   │   └── shared/         # Reusable UI components
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Audit.jsx
│   │   │   ├── Simulator.jsx
│   │   │   ├── Portal.jsx      # Public-facing individual portal
│   │   │   ├── Compliance.jsx
│   │   │   └── ModelCard.jsx   # Public shareable model card
│   │   ├── store/              # Zustand state stores
│   │   ├── api/                # API client functions
│   │   ├── hooks/
│   │   └── utils/
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── config.py           # Settings and env vars
│   │   ├── routers/
│   │   │   ├── ingest.py       # Data ingestion endpoints
│   │   │   ├── audit.py        # Bias detection endpoints
│   │   │   ├── simulate.py     # Human Impact Simulator endpoints
│   │   │   ├── mitigate.py     # Mitigation engine endpoints
│   │   │   ├── compliance.py   # Regulation mapper endpoints
│   │   │   ├── portal.py       # Affected person portal endpoints
│   │   │   ├── reports.py      # PDF/CSV export endpoints
│   │   │   └── auth.py         # Auth and role management
│   │   ├── services/
│   │   │   ├── bias_engine.py  # AIF360 + Fairlearn orchestrator
│   │   │   ├── explainer.py    # SHAP + LIME explainability
│   │   │   ├── causal.py       # DoWhy causal fairness
│   │   │   ├── drift.py        # Temporal drift monitoring
│   │   │   ├── mitigation.py   # Reweighting, debiasing logic
│   │   │   ├── simulator.py    # Counterfactual engine
│   │   │   ├── regulation.py   # EU AI Act / EEOC / GDPR mapper
│   │   │   └── audit_trail.py  # Immutable log management
│   │   ├── models/             # SQLAlchemy + Pydantic models
│   │   ├── db/                 # Database connection and migrations
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── ml/                         # Standalone ML experimentation
│   ├── notebooks/              # Jupyter notebooks for research
│   ├── sample_datasets/        # Example hiring / lending datasets
│   └── model_examples/         # Pre-trained models for demo
│
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
├── CONTEXT.md
└── SKILLS.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/equitylens.git
cd equitylens
```

### 2. Start with Docker (recommended)

```bash
docker-compose up --build
```

This starts PostgreSQL, MongoDB, Redis, the FastAPI backend, and the React frontend simultaneously.

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### 3. Manual setup (development)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in `/backend` and `/frontend`:

**`/backend/.env`**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/equitylens
MONGODB_URL=mongodb://localhost:27017/equitylens_logs
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-jwt-secret-key
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
ENVIRONMENT=development
```

**`/frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project
```

---

## Running the Application

| Command | Description |
|---------|-------------|
| `docker-compose up` | Start all services |
| `docker-compose up --build` | Rebuild and start |
| `uvicorn app.main:app --reload` | Backend dev server |
| `npm run dev` | Frontend dev server |
| `npm run build` | Production frontend build |
| `pytest` | Run backend tests |
| `npm run test` | Run frontend tests |

---

## API Reference

Full Swagger documentation is available at `/docs` when the backend is running. Key endpoint groups:

| Prefix | Description |
|--------|-------------|
| `POST /api/ingest/upload` | Upload CSV dataset or model file |
| `POST /api/ingest/connect` | Connect external API (Workday, Salesforce) |
| `POST /api/audit/run` | Run full bias audit on uploaded data |
| `GET  /api/audit/{audit_id}` | Retrieve audit results |
| `POST /api/simulate/whatif` | Run counterfactual what-if scenario |
| `POST /api/simulate/individual` | Check an individual's decision |
| `POST /api/mitigate/apply` | Apply mitigation technique |
| `GET  /api/compliance/map/{audit_id}` | Get regulation compliance mapping |
| `GET  /api/reports/pdf/{audit_id}` | Download compliance PDF report |
| `GET  /api/portal/explain` | Individual plain-language explanation |
| `POST /api/portal/appeal` | Submit an appeal for a decision |
| `GET  /api/public/modelcard/{model_id}` | Public shareable model card (no auth) |

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full platform access — configure thresholds, deploy models, manage committee workflow, view all audits |
| **Analyst** | Run audits, view reports, apply mitigations, export data |
| **Public / Affected Person** | Access individual portal, view plain-language explanation, file appeals, view public model cards |

---

## Key Features

- **Fairness Score (0–100)** — single composite score combining all metrics
- **Bias Nutrition Label** — shareable summary card for any model
- **Human Impact Simulator** — population-level and individual counterfactual analysis
- **Temporal Drift Monitoring** — continuous fairness tracking with alerting
- **Intersectional Bias Detection** — compound group analysis (race × gender × age)
- **Causal Fairness (DoWhy)** — moves beyond correlation to causal evidence
- **Affected Person Portal** — individual explainability without login requirement
- **Appeals Workflow** — structured challenge path with legal evidence packaging
- **Regulation Mapper** — automatic EU AI Act / EEOC / GDPR compliance checking
- **Immutable Audit Trail** — SHA-256 signed, append-only log of all decisions
- **Fairness Committee Workflow** — multi-stakeholder sign-off before model deployment
- **Developer API** — full REST API for integration into existing ML pipelines

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit changes: `git commit -m "feat: describe your change"`
4. Push to branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for the EquityLens Hackathon. Making AI fairness actionable, explainable, and human.*
