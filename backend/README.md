# EquityLens Backend

FastAPI-based backend for AI bias detection and fairness platform.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Set Up PostgreSQL and Redis

Using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults should work locally)
```

### 4. Run the Server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

- Docs: `http://localhost:8000/docs`
- OpenAPI: `http://localhost:8000/openapi.json`

### 5. Run Tests

```bash
pytest
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── db/
│   │   ├── models.py        # SQLAlchemy models
│   │   └── session.py       # DB session
│   ├── models/
│   │   ├── dataset.py       # Pydantic request/response
│   │   └── audit.py         # Audit models
│   ├── services/
│   │   ├── dataset_service.py  # Dataset logic
│   │   └── bias_engine.py      # ML bias detection
│   ├── routers/
│   │   ├── datasets.py      # Upload endpoints
│   │   └── audit.py         # Audit endpoints
│   ├── utils/
│   │   └── auth.py          # Auth stubs
│   └── tasks/
│       └── audit_tasks.py   # Celery tasks
├── tests/                   # Test suite
├── requirements.txt
├── .env.example
└── README.md
```

## API Endpoints

### Datasets

- `POST /api/datasets/upload` - Upload CSV dataset
- `GET /api/datasets` - List datasets
- `GET /api/datasets/{id}` - Get dataset info

### Audit

- `POST /api/audit/run` - Trigger bias audit
- `GET /api/audit/{id}` - Get audit results
- `GET /api/audit` - List audits

### Health

- `GET /health` - Health check
- `GET /` - API info

## Development

### Adding a New Route

1. Create endpoint in `app/routers/`
2. Import in `app/main.py`
3. Register: `app.include_router(router)`

### Adding a New Service

1. Create function in `app/services/`
2. Import in routers
3. Use dependency injection via `Depends()`

### Database Migrations

Tables are auto-created on startup from SQLAlchemy models. For schema changes:

1. Edit models in `app/db/models.py`
2. Restart the application

## Next Steps

- Phase 2: Implement full AIF360 + SHAP integration
- Phase 3-8: Add intelligence, simulator, portal, and compliance layers

---

*For issues or questions, open an issue on GitHub.*
