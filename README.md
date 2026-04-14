# EquityLens

> **A healthcare-first AI fairness platform that detects bias, explains its human impact, and helps organizations and patients act on it.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.68%2B-green)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18%2B-blue)](https://reactjs.org/)

EquityLens is a comprehensive platform that makes AI bias detection accessible to everyone - from data scientists to affected individuals to regulators. Our mission is to ensure artificial intelligence serves humanity fairly by providing tools for transparency, accountability, and recourse.

This project is submitted to the [Google Solution Challenge 2026](https://developers.google.com/community/gdg/groups/solution-challenge), addressing bias in AI systems as a critical challenge for equitable technology development.

## What EquityLens Does

EquityLens is focused on **healthcare AI** — triage, risk scoring, prior authorization, treatment prioritization, and care allocation.

It helps teams:

- audit models for demographic parity, equal opportunity, disparate impact, proxy bias, and intersectional harm
- explain outcomes in plain language for affected patients
- package appeals and review evidence for clinicians, compliance teams, and auditors
- export model cards, transparency reports, and fairness labels

## Why Healthcare

Healthcare is one of the highest-stakes sectors for AI fairness because biased decisions can delay or deny care. EquityLens is built to help reduce that risk and make algorithmic decision-making more transparent and accountable.

## Core Flows

1. Upload a healthcare dataset or model output
2. Run a fairness audit
3. Review bias metrics and proxy features
4. Open the public portal for patient-facing explanations
5. File and track appeals
6. Export compliance-ready reports

## Key Features

### Affected Person Portal

Experience our public portal at `/portal` - no login required. Enter your profile details to receive:

- Plain-language explanation of decisions about you
- Key factors influencing your outcome
- Potential bias concerns in the system
- What changes would improve your result

### Structured Appeals Workflow

When you believe a decision was unfair:

1. File an appeal through our simple form
2. Our system packages evidence automatically
3. Track your appeal status in real-time
4. Receive structured responses from reviewing teams

### Comprehensive Bias Detection

Our engine detects multiple types of bias:

- **Demographic Parity**: Equal approval rates across groups
- **Equal Opportunity**: Equal true positive rates across groups
- **Disparate Impact**: Selection rate ratios meeting EEOC guidelines
- **Proxy Bias**: Features correlating with protected attributes
- **Intersectional Bias**: Multi-dimensional fairness analysis

### Human Impact Simulator

Translate statistical bias into human stories:

- Population-level impact estimates
- Individual counterfactual explanations
- Scenario modeling for what-if analysis
- ROI framing for business cases

### Compliance & Governance

Built for regulatory environments:

- Regulation mapper for GDPR, EEOC, and more
- Immutable audit trail with hash chaining
- Fairness committee workflow for sign-offs
- Department-level threshold configuration

### Transparency Outputs

Generate professional documentation:

- Bias Nutrition Labels (food label-inspired summaries)
- Public Model Cards for transparency commitments
- PDF Compliance Reports for regulatory submission
- Developer API for integration into MLOps pipelines

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind
- **Backend**: FastAPI, PostgreSQL, Redis, Celery
- **Fairness / explainability**: AIF360, SHAP, DoWhy, DiCE-ML

### Backend

- **FastAPI**: High-performance Python web framework
- **PostgreSQL**: Primary data storage
- **MongoDB**: Immutable audit trail storage
- **Redis**: Task queue and caching
- **Celery**: Asynchronous task processing
- **IBM AIF360**: Industry-standard fairness metrics
- **Microsoft FairLearn**: Additional bias detection methods
- **SHAP**: Feature importance and proxy detection
- **DiCE-ML**: Counterfactual explanation generation

### Frontend

- **React 18**: Modern component-based UI
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first styling framework
- **Vite**: Fast development server
- **TanStack Query**: Server state management
- **Lucide React**: Beautiful icon library

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/[your-username]/fairness-lens-studio.git
cd fairness-lens-studio
```

1. **Start backend services**

```bash
# Start database and Redis
docker-compose up -d

# Install Python dependencies
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\/scripts\test.exe
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload
```

1. **Start frontend**

```bash
# In a new terminal
cd ../frontend
npm install
npm run dev
```

1. **Access the application**

- Frontend: <http://localhost:5173>
- Backend API Docs: <http://localhost:8000/docs>
- Affected Person Portal: <http://localhost:5173/portal>

### Environment Configuration

Create `.env` files in both `backend/` and `frontend/` directories:

**backend/.env**

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/equitylens
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
DEBUG=True
API_HOST=localhost
API_PORT=8000
CORS_ORIGINS=http://localhost:5173
```

**frontend/.env**

```bash
VITE_API_URL=http://localhost:8000
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Public User   │    │  Organization    │
└─────────┬───────┘    └────────┬─────────┘
          │                     │
┌─────────▼─────────────────────▼─────────┐
│           Frontend (React)             │
│  ┌─────────────┐ ┌───────────────────┐ │
│  │ Upload Page │ │Analysis Dashboard │ │
│  ├─────────────┤ ├───────────────────┤ │
│  │Portal Page  │ │Mitigation Panel   │ │
│  ├─────────────┤ ├───────────────────┤ │
│  │Appeal Form  │ │Simulator UI       │ │
│  └─────────────┘ └───────────────────┘ │
└─────────┬───────────────────────────────┘
          │
┌─────────▼───────────────────────────────┐
│           Backend (FastAPI)            │
│  ┌─────────────┐ ┌───────────────────┐ │
│  │   Routers   │ │    Services       │ │
│  │             │ │                   │ │
│  │ ┌─────────┐ │ │ ┌───────────────┐ │ │
│  │ │Dataset  │ │ │ │Bias Detection │ │ │
│  │ │Audit    │ │ │ │Mitigation     │ │ │
│  │ │Portal   │ │ │ │Simulation     │ │ │
│  │ │Reports  │ │ │ │Governance     │ │ │
│  │ └─────────┘ │ │ └───────────────┘ │ │
│  └─────────────┘ └───────────────────┘ │
└─────────┬───────────────────────────────┘
          │
┌─────────▼───────────────────────────────┐
│           Data Layer                   │
│  ┌─────────────┐ ┌───────────────────┐ │
│  │ PostgreSQL  │ │    MongoDB        │ │
│  │(Structured  │ │(Audit Trail)      │ │
│  │ Data)       │ │                   │ │
│  └─────────────┘ └───────────────────┘ │
│           │                             │
│  ┌────────▼──────────────────────────┐  │
│  │         Redis (Queue/Cache)      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Project Structure

```
fairness-lens-studio/
├── backend/
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── db/          # Database integration
│   │   └── main.py      # Application entrypoint
│   ├── tests/           # Unit and integration tests
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/         # API client
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── App.tsx     # Main application component
│   └── package.json     # Node.js dependencies
├── docker-compose.yml   # Development infrastructure
└── README.md           # This file
```

## Testing

### Running Tests

**Backend Tests**

```bash
cd backend
pytest tests/ -v
```

**Frontend Tests**

```bash
cd frontend
npm run test
```

### Quick Verification

```bash
# Backend health check
curl http://localhost:8000/api/demo/health

# Sample audit data
curl http://localhost:8000/api/demo/sample-audit
```

## Deployment

For detailed deployment instructions, see `DEPLOYMENT.md`:

- Google Cloud Run (recommended for GSC)
- Google App Engine
- Self-hosted Docker environments

### Environment Variables for Production

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
SECRET_KEY=your-production-secret-key
DEBUG=False
CORS_ORIGINS=https://yourdomain.com
```

## Contributing

We welcome contributions from the community!

### Ways to Contribute

1. **Bug Reports**: File issues for bugs you encounter
2. **Feature Requests**: Suggest enhancements via GitHub issues
3. **Code Contributions**: Fork, modify, and submit pull requests
4. **Documentation**: Improve guides and examples
5. **Translation**: Help localize the platform for different regions

### Code Style Guidelines

- Follow existing code patterns
- Write clear, descriptive commit messages
- Include tests for new features
- Keep pull requests focused on single changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

### Libraries and Tools

- [FastAPI](https://fastapi.tiangolo.com/) - High-performance Python web framework
- [IBM AIF360](https://github.com/IBM/AIF360) - AI Fairness 360 toolkit
- [Microsoft FairLearn](https://fairlearn.github.io/) - Fairness assessment and mitigation toolkit
- [SHAP](https://github.com/slundberg/shap) - SHapley Additive exPlanations
- [DiCE-ML](https://github.com/interpretml/DiCE) - Diverse Counterfactuals toolkit
- [React](https://reactjs.org/) - JavaScript library for building user interfaces
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### Inspiration

- [Google AI Principles](https://ai.google/principles/)
- [EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [Algorithmic Justice League](https://www.ajl.org/)
- [Partnership on AI](https://www.partnershiponai.org/)

### Research Foundations

- *Fairness and Machine Learning* by Solon Barocas, Moritz Hardt, Arvind Narayanan
- *Weapons of Math Destruction* by Cathy O'Neil
- *Automating Inequality* by Virginia Eubanks

## Contact

For questions, feedback, or collaboration opportunities:

- **GitHub Issues**: [Repository Issues](https://github.com/[your-username]/fairness-lens-studio/issues)

---

*Made with ❤️ for the Google Developer Community and the Google Solution Challenge 2026*

[Google Developer Groups](https://developers.google.com/community/gdg) | [Solution Challenge](https://developers.google.com/community/gdg/groups/solution-challenge)
