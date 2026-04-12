"""
Pytest configuration and fixtures for backend testing.
"""

import pytest
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import tempfile
import os

# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def db_engine():
    """Create in-memory test database."""
    from app.db.models import Base
    
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provide a database session for tests."""
    TestingSessionLocal = sessionmaker(bind=db_engine)
    session = TestingSessionLocal()
    
    yield session
    
    session.rollback()
    session.close()

@pytest.fixture
def sample_dataset():
    """Create a sample dataset for testing."""
    return pd.DataFrame({
        "id": range(100),
        "income": [50000 + i * 1000 for i in range(100)],
        "age": [25 + i % 40 for i in range(100)],
        "gender": [1 if i % 2 == 0 else 0 for i in range(100)],
        "race": [1 if i % 3 == 0 else 0 for i in range(100)],
        "approved": [1 if i % 2 == 0 else 0 for i in range(100)]
    })

@pytest.fixture
def temp_csv_file(sample_dataset):
    """Create a temporary CSV file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        sample_dataset.to_csv(f.name, index=False)
        yield f.name
    
    # Cleanup
    os.unlink(f.name)

@pytest.fixture
def test_client():
    """Create a FastAPI test client."""
    from fastapi.testclient import TestClient
    from app.main import app
    
    return TestClient(app)
