import json
from typing import List, Dict, Any, Optional
import weaviate
import weaviate.classes as wvc
from app.config import settings
from app.db.models import Dataset, AuditRun

class VectorService:
    def __init__(self):
        # Initialize the Weaviate client
        # Depending on configuration, this might need auth. For now, simple URL connection.
        self.client = weaviate.use_async_with_local() # Just a placeholder, let's use standard sync client for backend
        
        # Weaviate v4 connection
        # If we have an API key, we could use it, but let's assume local dev for now
        self.client = weaviate.connect_to_local(
            port=8080,
            grpc_port=50051
        )
        
    def __enter__(self):
        self.client.connect()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()

    def connect(self):
        if not self.client.is_ready():
            self.client.connect()

    def disconnect(self):
        self.client.close()

    def initialize_schema(self):
        """Initialize the necessary Weaviate collections."""
        self.connect()
        
        # Dataset Collection
        if not self.client.collections.exists("Dataset"):
            self.client.collections.create(
                name="Dataset",
                description="Metadata about uploaded datasets",
                properties=[
                    wvc.config.Property(name="dataset_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="name", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="schema_info", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="protected_attributes", data_type=wvc.config.DataType.TEXT_ARRAY),
                    wvc.config.Property(name="row_count", data_type=wvc.config.DataType.INT),
                ],
                # Let Weaviate handle vectorization with its default module
            )

        # AuditRun Collection
        if not self.client.collections.exists("AuditRun"):
            self.client.collections.create(
                name="AuditRun",
                description="Results of fairness audits",
                properties=[
                    wvc.config.Property(name="audit_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="dataset_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="domain", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="status", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="fairness_score", data_type=wvc.config.DataType.INT),
                    wvc.config.Property(name="mitigation_applied", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="metrics_summary", data_type=wvc.config.DataType.TEXT),
                ]
            )

    def ingest_dataset(self, dataset: Dataset):
        """Ingest a dataset's metadata into Weaviate."""
        self.connect()
        collection = self.client.collections.get("Dataset")
        
        schema_str = json.dumps(dataset.schema) if dataset.schema else ""
        
        collection.data.insert(
            properties={
                "dataset_id": dataset.id,
                "name": dataset.name,
                "schema_info": schema_str,
                "protected_attributes": dataset.detected_protected_attrs or [],
                "row_count": dataset.row_count or 0,
            }
        )

    def ingest_audit_run(self, audit: AuditRun):
        """Ingest an audit run's results into Weaviate."""
        self.connect()
        collection = self.client.collections.get("AuditRun")
        
        metrics_str = json.dumps(audit.metrics) if audit.metrics else ""
        
        collection.data.insert(
            properties={
                "audit_id": audit.id,
                "dataset_id": audit.dataset_id,
                "domain": audit.domain,
                "status": audit.status,
                "fairness_score": audit.fairness_score or 0,
                "mitigation_applied": audit.mitigation_applied or "None",
                "metrics_summary": metrics_str,
            }
        )

    def search_datasets(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Perform semantic search over datasets."""
        self.connect()
        collection = self.client.collections.get("Dataset")
        response = collection.query.near_text(
            query=query,
            limit=limit
        )
        
        results = []
        for obj in response.objects:
            results.append(obj.properties)
        return results

    def search_audit_runs(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Perform semantic search over audit runs."""
        self.connect()
        collection = self.client.collections.get("AuditRun")
        response = collection.query.near_text(
            query=query,
            limit=limit
        )
        
        results = []
        for obj in response.objects:
            results.append(obj.properties)
        return results

vector_service = VectorService()
