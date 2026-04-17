import weaviate
import weaviate.classes as wvc
from weaviate.collections.classes.config import Configure, Property, DataType
import logging
import os
from app.config import settings

logger = logging.getLogger(__name__)


class WeaviateManager:
    """Manages connection and schema setup for Weaviate Vector DB."""

    def __init__(self):
        self.client = None

    def connect(self):
        # Skip if Weaviate URL not configured
        if not settings.weaviate_url or settings.weaviate_url.strip() == "":
            logger.info("Weaviate not configured, skipping connection")
            return

        try:
            if settings.weaviate_api_key:
                # Use WCS (Weaviate Cloud Service) or authenticated local instance
                self.client = weaviate.connect_to_custom(
                    http_host=settings.weaviate_url.replace("https://", "").replace(
                        "http://", ""
                    ),
                    http_port=443 if "https" in settings.weaviate_url else 8080,
                    http_secure=True if "https" in settings.weaviate_url else False,
                    grpc_host=settings.weaviate_url.replace("https://", "").replace(
                        "http://", ""
                    ),
                    grpc_port=50051,
                    grpc_secure=True if "https" in settings.weaviate_url else False,
                    auth_credentials=weaviate.auth.AuthApiKey(
                        settings.weaviate_api_key
                    ),
                )
            else:
                # Use local, unauthenticated instance
                self.client = weaviate.connect_to_local(
                    host="localhost", port=8080, grpc_port=50051
                )

            logger.info(f"Connected to Weaviate at {settings.weaviate_url}")
            self.init_schema()
        except Exception as e:
            logger.warning(f"Weaviate connection failed (non-critical): {e}")

    def init_schema(self):
        """Initialize Weaviate schema (collections) if they do not exist."""
        if not self.client:
            return

        try:
            # AuditReport Collection
            if not self.client.collections.exists("AuditReport"):
                self.client.collections.create(
                    name="AuditReport",
                    vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_openai(),
                    properties=[
                        Property(name="audit_run_id", data_type=DataType.TEXT),
                        Property(name="dataset_id", data_type=DataType.TEXT),
                        Property(name="summary", data_type=DataType.TEXT),
                        Property(name="fairness_score", data_type=DataType.NUMBER),
                        Property(name="created_at", data_type=DataType.DATE),
                    ],
                )
                logger.info("Created Weaviate collection: AuditReport")

            # Appeal Collection
            if not self.client.collections.exists("AppealRecord"):
                self.client.collections.create(
                    name="AppealRecord",
                    vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_openai(),
                    properties=[
                        Property(name="appeal_id", data_type=DataType.TEXT),
                        Property(name="audit_run_id", data_type=DataType.TEXT),
                        Property(name="reason", data_type=DataType.TEXT),
                        Property(name="status", data_type=DataType.TEXT),
                        Property(name="resolution_notes", data_type=DataType.TEXT),
                    ],
                )
                logger.info("Created Weaviate collection: AppealRecord")

        except Exception as e:
            logger.error(f"Error initializing Weaviate schema: {e}")

    def close(self):
        if self.client:
            self.client.close()


weaviate_manager = WeaviateManager()
