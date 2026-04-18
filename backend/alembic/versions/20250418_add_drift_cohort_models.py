"""add drift cohort models

Revision ID: add_drift_cohort_models
Revises:
Create Date: 2025-04-18

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_drift_cohort_models"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add drift, cohort, and model version tables."""
    # DriftMonitorConfig
    op.create_table(
        "drift_monitor_configs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "dataset_id", sa.String(), sa.ForeignKey("datasets.id"), nullable=False
        ),
        sa.Column("enabled", sa.Boolean(), default=True),
        sa.Column("schedule_cron", sa.String(), default="0 0 1 * *"),
        sa.Column("alert_threshold", sa.Float(), default=0.05),
        sa.Column("last_checked", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    # DriftAlert
    op.create_table(
        "drift_alerts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "config_id",
            sa.String(),
            sa.ForeignKey("drift_monitor_configs.id"),
            nullable=False,
        ),
        sa.Column("previous_score", sa.Integer(), nullable=False),
        sa.Column("current_score", sa.Integer(), nullable=False),
        sa.Column("score_delta", sa.Float(), nullable=False),
        sa.Column("metric_that_drifted", sa.String(), nullable=True),
        sa.Column("status", sa.String(), default="open"),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    # TemporalCohort
    op.create_table(
        "temporal_cohorts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "dataset_id", sa.String(), sa.ForeignKey("datasets.id"), nullable=False
        ),
        sa.Column("cohort_label", sa.String(), nullable=False),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("fairness_score", sa.Integer(), nullable=True),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )

    # ModelVersion
    op.create_table(
        "model_versions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "dataset_id", sa.String(), sa.ForeignKey("datasets.id"), nullable=False
        ),
        sa.Column("version_label", sa.String(), nullable=False),
        sa.Column(
            "audit_run_id", sa.String(), sa.ForeignKey("audit_runs.id"), nullable=False
        ),
        sa.Column("fairness_score", sa.Integer(), nullable=True),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")
        ),
    )


def downgrade() -> None:
    """Remove drift, cohort, and model version tables."""
    op.drop_table("model_versions")
    op.drop_table("temporal_cohorts")
    op.drop_table("drift_alerts")
    op.drop_table("drift_monitor_configs")
