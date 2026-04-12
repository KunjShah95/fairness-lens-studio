import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any, Tuple
from scipy.stats import pearsonr
from sqlalchemy.orm import Session
from app.db.models import AuditRun, AuditStatus

logger = logging.getLogger(__name__)

async def compute_core_metrics(
    df: pd.DataFrame,
    label_col: str,
    protected_attr: str,
    privileged_val: int = 1
) -> Dict[str, Any]:
    """
    Compute demographic parity, equal opportunity, and disparate impact using AIF360.
    
    Args:
        df: DataFrame with data
        label_col: Column name for binary outcome
        protected_attr: Protected attribute column name
        privileged_val: Value representing privileged group (default: 1)
    
    Returns:
        Dict with comprehensive metrics for this attribute
    """
    try:
        from aif360.datasets import BinaryLabelDataset
        from aif360.metrics import BinaryLabelDatasetMetric
        
        # Validate columns exist
        if label_col not in df.columns:
            raise ValueError(f"Label column '{label_col}' not found")
        if protected_attr not in df.columns:
            raise ValueError(f"Protected attribute '{protected_attr}' not found")
        
        # Prepare data - ensure binary
        df_copy = df.copy()
        df_copy[label_col] = pd.to_numeric(df_copy[label_col], errors='coerce').fillna(0).astype(int)
        df_copy[protected_attr] = pd.to_numeric(df_copy[protected_attr], errors='coerce').fillna(0).astype(int)
        
        # Create AIF360 dataset
        dataset = BinaryLabelDataset(
            df=df_copy,
            label_names=[label_col],
            protected_attribute_names=[protected_attr]
        )
        
        # Compute metrics
        metric = BinaryLabelDatasetMetric(
            dataset,
            privileged_groups=[{protected_attr: privileged_val}],
            unprivileged_groups=[{protected_attr: 0}]
        )
        
        # Extract all key metrics
        dp_difference = float(metric.mean_difference())
        dp_ratio = float(metric.disparate_impact())
        eo_difference = float(metric.equal_opportunity_difference())
        
        # Calculate group-level outcomes for visualization
        privileged_positive_rate = metric.num_positives(privileged=True) / max(metric.num_instances(privileged=True), 1)
        unprivileged_positive_rate = metric.num_positives(privileged=False) / max(metric.num_instances(privileged=False), 1)
        
        return {
            "demographic_parity_difference": round(dp_difference, 4),
            "demographic_parity_ratio": round(dp_ratio, 4),
            "equal_opportunity_difference": round(eo_difference, 4),
            "privileged_positive_rate": round(privileged_positive_rate, 4),
            "unprivileged_positive_rate": round(unprivileged_positive_rate, 4),
            "flagged": abs(dp_difference) > 0.10 or dp_ratio < 0.80
        }
    
    except Exception as e:
        logger.error(f"Error computing metrics for {protected_attr}: {e}", exc_info=True)
        return {
            "demographic_parity_difference": None,
            "demographic_parity_ratio": None,
            "equal_opportunity_difference": None,
            "privileged_positive_rate": None,
            "unprivileged_positive_rate": None,
            "flagged": False,
            "error": str(e)
        }

async def detect_proxy_features(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    correlation_threshold: float = 0.70
) -> List[Dict[str, Any]]:
    """
    Detect proxy features using correlation with protected attributes.
    
    A feature is a proxy if it:
    1. Correlates strongly with a protected attribute (correlation >= threshold)
    2. Appears to influence outcomes (high variance)
    
    Args:
        df: DataFrame with data
        label_col: Label column name
        protected_attrs: List of protected attributes
        correlation_threshold: Minimum correlation to flag as proxy (default: 0.70)
    
    Returns:
        List of detected proxy features
    """
    try:
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        proxies = []
        
        # For each protected attribute
        for protected_attr in protected_attrs:
            if protected_attr not in df_numeric.columns:
                continue
            
            protected_values = pd.to_numeric(df_numeric[protected_attr], errors='coerce').fillna(0)
            
            # Check all other features
            for feature in df_numeric.columns:
                if feature in [label_col] + protected_attrs:
                    continue
                
                feature_values = pd.to_numeric(df_numeric[feature], errors='coerce').fillna(0)
                
                # Skip constant features
                if feature_values.std() == 0:
                    continue
                
                # Compute correlation
                try:
                    corr, p_value = pearsonr(feature_values, protected_values)
                    
                    if abs(corr) >= correlation_threshold and p_value < 0.05:
                        proxies.append({
                            "feature": feature,
                            "protected_attribute": protected_attr,
                            "correlation": round(float(corr), 3),
                            "p_value": round(float(p_value), 4),
                            "severity": "high" if abs(corr) > 0.85 else "medium"
                        })
                except Exception as e:
                    logger.debug(f"Could not compute correlation for {feature}: {e}")
                    continue
        
        return sorted(proxies, key=lambda x: abs(x["correlation"]), reverse=True)
    
    except Exception as e:
        logger.error(f"Error detecting proxy features: {e}")
        return []

async def compute_intersectional_bias(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    min_group_size: int = 30
) -> List[Dict[str, Any]]:
    """
    Detect intersectional bias for two-way combinations of protected attributes.
    
    Args:
        df: DataFrame with data
        label_col: Label column name
        protected_attrs: List of protected attributes
        min_group_size: Minimum group size for statistical validity (default: 30)
    
    Returns:
        List of intersectional bias findings
    """
    try:
        if len(protected_attrs) < 2:
            return []
        
        df_copy = df.copy()
        df_copy[label_col] = pd.to_numeric(df_copy[label_col], errors='coerce').fillna(0).astype(int)
        
        results = []
        overall_rate = df_copy[label_col].mean()
        
        # Two-way intersections only
        for i in range(len(protected_attrs)):
            for j in range(i + 1, len(protected_attrs)):
                attr_a, attr_b = protected_attrs[i], protected_attrs[j]
                
                if attr_a not in df_copy.columns or attr_b not in df_copy.columns:
                    continue
                
                # Group by both attributes
                grouped = df_copy.groupby([attr_a, attr_b])[label_col].agg(["mean", "count"])
                
                for (val_a, val_b), row in grouped.iterrows():
                    count = int(row["count"])
                    if count < min_group_size:
                        continue
                    
                    positive_rate = float(row["mean"])
                    disparity = positive_rate - overall_rate
                    
                    results.append({
                        "group": f"{attr_a}={val_a}, {attr_b}={val_b}",
                        "n": count,
                        "positive_rate": round(positive_rate, 4),
                        "disparity_from_average": round(disparity, 4),
                        "flagged": abs(disparity) > 0.10
                    })
        
        return sorted(results, key=lambda x: abs(x["disparity_from_average"]), reverse=True)
    
    except Exception as e:
        logger.error(f"Error computing intersectional bias: {e}")
        return []

async def run_full_audit_pipeline(
    audit_id: str,
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    domain: str,
    db: Session
) -> Dict[str, Any]:
    """
    Main async audit function. Runs comprehensive bias detection.
    
    Steps:
    1. Validate data
    2. Compute core metrics for each protected attribute
    3. Detect proxy features
    4. Compute intersectional bias
    5. Calculate fairness score (basic version for Phase 2)
    6. Store results
    
    Args:
        audit_id: Unique audit identifier
        df: DataFrame to audit
        label_col: Outcome column name
        protected_attrs: List of protected attributes to check
        domain: Business domain (hiring, lending, healthcare)
        db: Database session
    
    Returns:
        Dict with full audit results
    """
    try:
        logger.info(f"[Audit {audit_id}] Starting full audit pipeline on {len(df)} rows")
        
        results = {
            "audit_id": audit_id,
            "metrics": {},
            "proxy_features": [],
            "intersectional_results": [],
            "feature_importance": [],
            "causal_analysis": {},
            "fairness_score": 0,
            "status": "complete"
        }
        
        # Validate data quality
        if len(df) < 100:
            logger.warning(f"[Audit {audit_id}] Small dataset: {len(df)} rows (recommend >= 100)")
        
        if label_col not in df.columns:
            raise ValueError(f"Label column '{label_col}' not found in dataset")
        
        for attr in protected_attrs:
            if attr not in df.columns:
                raise ValueError(f"Protected attribute '{attr}' not found in dataset")
        
        # Step 1: Compute core metrics for each protected attribute
        logger.info(f"[Audit {audit_id}] Computing core metrics for {len(protected_attrs)} attributes")
        for attr in protected_attrs:
            try:
                metrics = await compute_core_metrics(df, label_col, attr)
                results["metrics"][attr] = metrics
                logger.debug(f"[Audit {audit_id}] {attr}: {metrics}")
            except Exception as e:
                logger.error(f"[Audit {audit_id}] Error computing metrics for {attr}: {e}")
                results["metrics"][attr] = {"error": str(e)}
        
        # Step 2: Detect proxy features
        logger.info(f"[Audit {audit_id}] Detecting proxy features")
        try:
            proxies = await detect_proxy_features(df, label_col, protected_attrs)
            results["proxy_features"] = proxies
            logger.info(f"[Audit {audit_id}] Found {len(proxies)} proxy feature(s)")
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error detecting proxies: {e}")
        
        # Step 3: Compute intersectional bias
        logger.info(f"[Audit {audit_id}] Computing intersectional bias")
        try:
            intersectional = await compute_intersectional_bias(df, label_col, protected_attrs)
            results["intersectional_results"] = intersectional
            if intersectional:
                logger.info(f"[Audit {audit_id}] Found {len(intersectional)} intersectional groups")
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error computing intersectional bias: {e}")
        
        # Step 4: SHAP Feature Importance (Phase 3)
        logger.info(f"[Audit {audit_id}] Computing feature importance with SHAP")
        try:
            shap_analysis = await compute_feature_importance_shap(df, label_col, protected_attrs)
            if "error" not in shap_analysis:
                results["feature_importance"] = shap_analysis.get("feature_importance", [])
                logger.info(f"[Audit {audit_id}] SHAP analysis complete. Model accuracy: {shap_analysis.get('model_accuracy')}")
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in SHAP analysis: {e}")
        
        # Step 5: DoWhy Causal Analysis (Phase 3)
        logger.info(f"[Audit {audit_id}] Computing causal fairness with DoWhy")
        try:
            if protected_attrs:
                causal_analysis = await compute_causal_fairness_dowhy(df, label_col, protected_attrs, protected_attrs[0])
                results["causal_analysis"] = causal_analysis
                logger.info(f"[Audit {audit_id}] Causal analysis: {causal_analysis.get('interpretation')}")
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in causal analysis: {e}")
        
        # Step 6: Compute fairness score (Phase 2 version)
        logger.info(f"[Audit {audit_id}] Computing fairness score")
        fairness_score = _compute_fairness_score_phase2(
            results["metrics"],
            len(results["proxy_features"]),
            results["intersectional_results"]
        )
        results["fairness_score"] = fairness_score
        logger.info(f"[Audit {audit_id}] Fairness Score: {fairness_score}")
        
        # Step 7: Update database
        logger.info(f"[Audit {audit_id}] Saving results to database")
        audit_run = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if audit_run:
            audit_run.status = AuditStatus.complete
            audit_run.metrics = results["metrics"]
            audit_run.fairness_score = fairness_score
            audit_run.proxy_features = results["proxy_features"]
            audit_run.intersectional_results = results["intersectional_results"]
            
            # Phase 3: Store new intelligence findings
            from sqlalchemy.dialects.postgresql import JSON as PGJSON
            if hasattr(audit_run, 'feature_importance'):
                audit_run.feature_importance = results["feature_importance"]
            if hasattr(audit_run, 'causal_analysis'):
                audit_run.causal_analysis = results["causal_analysis"]
            
            db.commit()
            logger.info(f"[Audit {audit_id}] ✅ Audit complete. Score: {fairness_score}")
        
        return results
    
    except Exception as e:
        logger.error(f"[Audit {audit_id}] ❌ Error in audit pipeline: {e}", exc_info=True)
        
        # Update database with error
        try:
            audit_run = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
            if audit_run:
                audit_run.status = AuditStatus.failed
                audit_run.error_message = str(e)
                db.commit()
        except Exception as db_err:
            logger.error(f"[Audit {audit_id}] Failed to update error status: {db_err}")
        
        raise

def _compute_fairness_score_phase2(
    metrics: Dict[str, Dict],
    proxy_count: int,
    intersectional_results: List[Dict]
) -> int:
    """
    Phase 2: Basic fairness score (0-100).
    
    Weights:
    - Demographic Parity: 40%
    - Disparate Impact: 40%
    - Proxy features: -10 per proxy (capped at -30)
    - Intersectional disparity: -10 if any group > 20% disparity
    
    Args:
        metrics: Dict of attribute -> metrics dict
        proxy_count: Number of detected proxy features
        intersectional_results: Intersectional bias findings
    
    Returns:
        Score 0-100
    """
    try:
        if not metrics:
            return 50  # Default for no data
        
        # Collect valid metric values
        dp_values = []
        di_values = []
        
        for attr, m in metrics.items():
            if isinstance(m, dict) and "error" not in m:
                if m.get("demographic_parity_ratio") is not None:
                    di_values.append(m["demographic_parity_ratio"])
                if m.get("demographic_parity_difference") is not None:
                    dp_diff = abs(m["demographic_parity_difference"])
                    dp_values.append(min(1.0, 1.0 - dp_diff))  # Convert to similarity score
        
        if not dp_values and not di_values:
            return 50
        
        # Average scores
        dp_score = (sum(dp_values) / len(dp_values)) * 40 if dp_values else 0
        di_score = (sum(di_values) / len(di_values)) * 40 if di_values else 0
        
        base_score = dp_score + di_score
        
        # Apply penalties
        proxy_penalty = min(proxy_count * 10, 30)
        
        intersectional_penalty = 0
        if intersectional_results:
            worst_disparity = max(
                abs(r.get("disparity_from_average", 0))
                for r in intersectional_results
            )
            if worst_disparity > 0.20:
                intersectional_penalty = 10
        
        score = int(max(0, base_score - proxy_penalty - intersectional_penalty))
        return min(score, 100)
    
    except Exception as e:
        logger.error(f"Error computing fairness score: {e}")
        return 50

async def compute_feature_importance_shap(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    top_n: int = 10
) -> Dict[str, Any]:
    """
    Compute feature importance using SHAP (SHapley Additive exPlanations).
    
    SHAP values explain how much each feature contributes to pushing the prediction
    away from the base value. This helps identify which features drive bias.
    
    Args:
        df: DataFrame with data
        label_col: Outcome column name
        protected_attrs: List of protected attributes
        top_n: Number of top features to return per attribute
    
    Returns:
        Dict with SHAP-based feature importance for each protected attribute
    """
    try:
        from sklearn.ensemble import RandomForestClassifier
        import shap
        
        logger.info("Computing SHAP feature importance")
        
        results = {}
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        
        # Train a model to explain
        X = df_numeric.drop(columns=[col for col in (protected_attrs + [label_col]) if col in df_numeric.columns])
        
        if len(X.columns) == 0:
            logger.warning("No numeric features found for SHAP analysis")
            return {"error": "No numeric features to analyze"}
        
        y = pd.to_numeric(df_numeric[label_col], errors='coerce').fillna(0).astype(int)
        
        if len(X) < 50:
            logger.warning(f"Dataset too small for SHAP ({len(X)} rows), skipping")
            return {"note": "Dataset too small for SHAP analysis"}
        
        # Train model
        model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
        model.fit(X, y)
        
        # Compute SHAP values
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)
        
        # Handle binary classification (shap_values is list of 2 arrays)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Use positive class
        
        # Compute mean absolute SHAP values per feature
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        
        # Rank features
        feature_importance = []
        for idx, feature in enumerate(X.columns):
            feature_importance.append({
                "feature": feature,
                "shap_importance": round(float(mean_abs_shap[idx]), 4),
                "mean_value": round(float(X[feature].mean()), 4),
                "std_value": round(float(X[feature].std()), 4)
            })
        
        feature_importance = sorted(feature_importance, key=lambda x: x["shap_importance"], reverse=True)[:top_n]
        
        results["feature_importance"] = feature_importance
        results["model_accuracy"] = round(float(model.score(X, y)), 4)
        
        logger.info(f"SHAP analysis complete. Top features: {[f['feature'] for f in feature_importance[:3]]}")
        
        return results
    
    except Exception as e:
        logger.error(f"Error computing SHAP feature importance: {e}", exc_info=True)
        return {"error": str(e)}

async def compute_causal_fairness_dowhy(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    treatment_attr: str
) -> Dict[str, Any]:
    """
    Compute causal fairness analysis using DoWhy.
    
    Determines if a protected attribute has a causal effect on outcomes,
    controlling for other confounders. Uses propensity score matching.
    
    Args:
        df: DataFrame with data
        label_col: Outcome column name
        protected_attrs: List of protected attributes
        treatment_attr: Which attribute to treat as causal variable (first in list)
    
    Returns:
        Dict with causal effects and recommendations
    """
    try:
        from dowhy import CausalModel
        
        logger.info(f"Computing causal fairness using DoWhy for {treatment_attr}")
        
        results = {}
        df_copy = df.copy()
        
        # Ensure numeric columns
        df_copy[label_col] = pd.to_numeric(df_copy[label_col], errors='coerce').fillna(0).astype(int)
        df_copy[treatment_attr] = pd.to_numeric(df_copy[treatment_attr], errors='coerce').fillna(0).astype(int)
        
        # Drop protected attributes from confounders (we don't want to control for protected attrs)
        confounders = []
        for col in df_copy.select_dtypes(include=[np.number]).columns:
            if col not in (protected_attrs + [label_col, treatment_attr]):
                confounders.append(col)
        
        if len(confounders) == 0:
            logger.warning("No confounders found for causal analysis")
            confounders = [treatment_attr]
        
        # Define causal model
        gml_graph = """
        digraph {
        %s -> %s;
        }
        """ % (treatment_attr, label_col)
        
        model = CausalModel(
            data=df_copy,
            treatment=treatment_attr,
            outcome=label_col,
            common_causes=confounders,
            causal_graph=gml_graph
        )
        
        # Estimate causal effect
        estimate = model.estimate_effect(
            identified_estimand=model.identify_effect(proceed_when_unidentifiable=True),
            method_name="backdoor.propensity_score_matching"
        )
        
        causal_effect = float(estimate.value) if estimate.value is not None else None
        
        results = {
            "treatment": treatment_attr,
            "treatment_effect": round(causal_effect, 4) if causal_effect is not None else None,
            "is_causal": causal_effect is not None and abs(causal_effect) > 0.05,
            "interpretation": None
        }
        
        if causal_effect is not None:
            if abs(causal_effect) > 0.20:
                results["interpretation"] = f"⚠️ Strong causal effect: {treatment_attr} has ~{abs(causal_effect)*100:.1f}% effect on outcomes"
            elif abs(causal_effect) > 0.05:
                results["interpretation"] = f"📊 Moderate causal effect: {treatment_attr} influences outcomes (~{abs(causal_effect)*100:.1f}%)"
            else:
                results["interpretation"] = f"✓ Negligible causal effect: {treatment_attr} has minimal impact on outcomes"
        
        logger.info(f"Causal effect of {treatment_attr}: {causal_effect}")
        
        return results
    
    except Exception as e:
        logger.error(f"Error computing causal fairness: {e}", exc_info=True)
        return {"error": str(e)}

