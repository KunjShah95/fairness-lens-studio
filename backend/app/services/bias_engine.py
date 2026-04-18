import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any, Optional
from scipy.stats import pearsonr, ks_2samp
from scipy.stats import pearsonr
from sqlalchemy.orm import Session
from app.db.models import AuditRun, AuditStatus
from app.services.ai_insight_engine import insight_engine

logger = logging.getLogger(__name__)


def _safe_binary(series: pd.Series) -> pd.Series:
    """Convert any series to a safe 0/1 numeric series."""
    numeric = pd.to_numeric(series, errors="coerce").fillna(0)
    return (numeric > 0).astype(int)


def _manual_core_metrics(
    df: pd.DataFrame,
    label_col: str,
    protected_attr: str,
    privileged_val: int = 1,
) -> Dict[str, Any]:
    """Pure-pandas fallback metrics when optional fairness libs are unavailable."""
    label = _safe_binary(df[label_col])
    protected = _safe_binary(df[protected_attr])

    privileged_mask = protected == int(privileged_val)
    unprivileged_mask = protected != int(privileged_val)

    priv_n = int(privileged_mask.sum())
    unpriv_n = int(unprivileged_mask.sum())

    if priv_n == 0 or unpriv_n == 0:
        return {
            "demographic_parity_difference": None,
            "demographic_parity_ratio": None,
            "equal_opportunity_difference": None,
            "privileged_positive_rate": None,
            "unprivileged_positive_rate": None,
            "flagged": False,
            "warning": "Insufficient group support to compute fairness metrics",
            "method": "manual",
        }

    privileged_positive_rate = float(label[privileged_mask].mean())
    unprivileged_positive_rate = float(label[unprivileged_mask].mean())

    dp_difference = privileged_positive_rate - unprivileged_positive_rate
    dp_ratio = unprivileged_positive_rate / max(privileged_positive_rate, 1e-9)

    return {
        "demographic_parity_difference": round(dp_difference, 4),
        "demographic_parity_ratio": round(dp_ratio, 4),
        # With only outcomes available, EO is approximated by positive-rate gap.
        "equal_opportunity_difference": round(dp_difference, 4),
        "privileged_positive_rate": round(privileged_positive_rate, 4),
        "unprivileged_positive_rate": round(unprivileged_positive_rate, 4),
        "flagged": abs(dp_difference) > 0.10 or dp_ratio < 0.80,
        "method": "manual",
    }

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
        if label_col not in df.columns:
            raise ValueError(f"Label column '{label_col}' not found")
        if protected_attr not in df.columns:
            raise ValueError(f"Protected attribute '{protected_attr}' not found")

        df_copy = df.copy()
        df_copy[label_col] = _safe_binary(df_copy[label_col])
        df_copy[protected_attr] = _safe_binary(df_copy[protected_attr])

        # Hybrid strategy: attempt AIF360 first, then deterministic manual fallback.
        try:
            from aif360.datasets import BinaryLabelDataset
            from aif360.metrics import BinaryLabelDatasetMetric

            dataset = BinaryLabelDataset(
                df=df_copy,
                label_names=[label_col],
                protected_attribute_names=[protected_attr],
            )

            metric = BinaryLabelDatasetMetric(
                dataset,
                privileged_groups=[{protected_attr: privileged_val}],
                unprivileged_groups=[{protected_attr: 0}],
            )

            dp_difference = float(metric.mean_difference())
            dp_ratio = float(metric.disparate_impact())

            privileged_positive_rate = float(
                metric.num_positives(privileged=True)
                / max(metric.num_instances(privileged=True), 1)
            )
            unprivileged_positive_rate = float(
                metric.num_positives(privileged=False)
                / max(metric.num_instances(privileged=False), 1)
            )

            # EO requires predictions + labels. We approximate from observed outcome gap
            # in this phase and preserve a stable field for downstream consumers.
            eo_difference = dp_difference

            return {
                "demographic_parity_difference": round(dp_difference, 4),
                "demographic_parity_ratio": round(dp_ratio, 4),
                "equal_opportunity_difference": round(eo_difference, 4),
                "privileged_positive_rate": round(privileged_positive_rate, 4),
                "unprivileged_positive_rate": round(unprivileged_positive_rate, 4),
                "flagged": abs(dp_difference) > 0.10 or dp_ratio < 0.80,
                "method": "aif360_hybrid",
            }
        except Exception as lib_exc:
            logger.warning(
                f"AIF360 metric path unavailable for '{protected_attr}', falling back to manual metrics: {lib_exc}"
            )
            fallback = _manual_core_metrics(
                df_copy,
                label_col=label_col,
                protected_attr=protected_attr,
                privileged_val=privileged_val,
            )
            fallback["fallback_reason"] = str(lib_exc)
            return fallback

    except Exception as e:
        logger.error(f"Error computing metrics for {protected_attr}: {e}", exc_info=True)
        return {
            "demographic_parity_difference": None,
            "demographic_parity_ratio": None,
            "equal_opportunity_difference": None,
            "privileged_positive_rate": None,
            "unprivileged_positive_rate": None,
            "flagged": False,
            "error": str(e),
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
        
        # Multivariate Proxy Detection using Random Forest
        for protected_attr in protected_attrs:
            if protected_attr not in df_numeric.columns:
                continue
            
            y_prox = pd.to_numeric(df_numeric[protected_attr], errors='coerce').fillna(0).astype(int)
            X_prox = df_numeric.drop(columns=[col for col in (protected_attrs + [label_col]) if col in df_numeric.columns])
            
            if len(X_prox.columns) > 0 and len(X_prox) >= 50:
                try:
                    from sklearn.ensemble import RandomForestClassifier
                    from sklearn.model_selection import cross_val_score
                    
                    # Check if classes are strictly 0 and 1 or multi-class but we can just use RF
                    rf = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
                    scores = cross_val_score(rf, X_prox, y_prox, cv=3, scoring='accuracy')
                    mean_acc = scores.mean()
                    
                    if mean_acc > 0.75: # Predictable protected attribute! We have multivariate proxies.
                        rf.fit(X_prox, y_prox)
                        importances = rf.feature_importances_
                        
                        for idx, feature in enumerate(X_prox.columns):
                            imp = importances[idx]
                            if imp > 0.10: # Significant contributor
                                existing = next((p for p in proxies if p["feature"] == feature and p["protected_attribute"] == protected_attr), None)
                                if existing:
                                    existing["multivariate_importance"] = round(float(imp), 3)
                                    existing["severity"] = "high" if imp > 0.20 else existing["severity"]
                                else:
                                    proxies.append({
                                        "feature": feature,
                                        "protected_attribute": protected_attr,
                                        "correlation": 0.0,
                                        "p_value": 0.0,
                                        "multivariate_importance": round(float(imp), 3),
                                        "severity": "high" if imp > 0.20 else "medium",
                                        "note": "Detected via Random Forest proxy modeling"
                                    })
                except Exception as rf_exc:
                    logger.debug(f"Could not compute multivariate proxies for {protected_attr}: {rf_exc}")

        deduped: Dict[tuple, Dict[str, Any]] = {}
        for item in proxies:
            key = (item["feature"], item["protected_attribute"])
            current = deduped.get(key)
            if current is None or abs(item.get("correlation", 0)) > abs(current.get("correlation", 0)) or item.get("multivariate_importance", 0) > current.get("multivariate_importance", 0):
                deduped[key] = item

        # Sort by correlation or multivariate importance
        return sorted(deduped.values(), key=lambda x: max(abs(x.get("correlation", 0)), x.get("multivariate_importance", 0)), reverse=True)
    
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

async def compute_individual_fairness_consistency(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    n_neighbors: int = 5
) -> Dict[str, Any]:
    """
    Compute individual fairness (Consistency metric).
    Measures how similar outcomes are for similar individuals (excluding protected attributes).
    """
    try:
        from sklearn.neighbors import NearestNeighbors
        from sklearn.preprocessing import StandardScaler
        
        logger.info("Computing Individual Fairness (Consistency)")
        
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        X = df_numeric.drop(columns=[col for col in (protected_attrs + [label_col]) if col in df_numeric.columns])
        
        if len(X.columns) == 0 or len(X) < n_neighbors + 1:
            return {"consistency_score": None, "error": "Not enough data for individual fairness"}
            
        y = pd.to_numeric(df_numeric[label_col], errors='coerce').fillna(0).values
        
        # Scale features
        X_scaled = StandardScaler().fit_transform(X)
        
        # Find k-nearest neighbors
        nbrs = NearestNeighbors(n_neighbors=n_neighbors + 1, algorithm='ball_tree').fit(X_scaled)
        distances, indices = nbrs.kneighbors(X_scaled)
        
        # Compute consistency
        consistency = 0.0
        for i in range(len(X)):
            neighbors_idx = indices[i][1:]
            consistency += np.sum(np.abs(y[i] - y[neighbors_idx]))
            
        consistency_score = 1.0 - (consistency / (len(X) * n_neighbors))
        
        return {
            "consistency_score": round(float(consistency_score), 4),
            "interpretation": "High" if consistency_score > 0.8 else "Low",
            "method": "knn_consistency"
        }
    except Exception as e:
        logger.error(f"Error computing individual fairness: {e}")
        return {"error": str(e)}

async def compute_counterfactual_fairness(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str]
) -> Dict[str, Any]:
    """
    Compute Counterfactual Fairness metrics.
    Simulates flipping the protected attribute and measuring the change in outcome.
    If the outcome changes significantly when only the protected attribute is flipped,
    the system exhibits counterfactual bias.
    """
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.preprocessing import LabelEncoder
        
        logger.info("Computing Counterfactual Fairness")
        
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        X = df_numeric.drop(columns=[label_col])
        y = pd.to_numeric(df_numeric[label_col], errors='coerce').fillna(0).astype(int)
        
        if len(X) < 50 or not protected_attrs:
            return {"error": "Insufficient data or missing protected attributes for counterfactual analysis"}
            
        # Train a surrogate model if actual model predictions aren't provided
        # We assume the label_col is the actual decision to audit
        model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
        model.fit(X, y)
        
        original_preds = model.predict(X)
        
        results = {}
        for attr in protected_attrs:
            if attr not in X.columns:
                continue
                
            # Flip the protected attribute (assumed binary 0/1 for simplicity in this metric)
            X_cf = X.copy()
            # If 0 make 1, if >0 make 0
            X_cf[attr] = (X_cf[attr] == 0).astype(int)
            
            cf_preds = model.predict(X_cf)
            
            # Counterfactual Fairness is violated if original_preds != cf_preds
            violations = np.sum(original_preds != cf_preds)
            violation_rate = violations / len(X)
            
            results[attr] = {
                "violations": int(violations),
                "violation_rate": round(float(violation_rate), 4),
                "flagged": violation_rate > 0.05,  # Flag if >5% of outcomes flip
                "interpretation": f"{violation_rate*100:.1f}% of individuals would receive a different outcome if their {attr} changed."
            }
            
        return {
            "metrics": results,
            "overall_flagged": any(r["flagged"] for r in results.values()),
            "method": "surrogate_counterfactual"
        }
    except Exception as e:
        logger.error(f"Error computing counterfactual fairness: {e}")
        return {"error": str(e)}

async def compute_adversarial_bias_audit(
    df: pd.DataFrame,
    protected_attrs: List[str],
    label_col: str
) -> Dict[str, Any]:
    """
    Differentiating Factor: Adversarial Bias Audit.
    Checks if an 'adversary' (ML model) can reconstruct protected attributes 
    from the features the user thinks are 'safe'.
    High accuracy in reconstruction indicates 'Latent Bias' or 'Redundant Encoding'.
    """
    try:
        from sklearn.ensemble import GradientBoostingClassifier
        from sklearn.metrics import roc_auc_score
        from sklearn.model_selection import train_test_split

        logger.info("Running Adversarial Bias Audit (Latent Reconstruction)")
        
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        X = df_numeric.drop(columns=[col for col in (protected_attrs + [label_col]) if col in df_numeric.columns])
        
        if len(X.columns) < 2 or len(df) < 100:
            return {"error": "Insufficient features or data for adversarial audit"}

        results = {}
        for attr in protected_attrs:
            y = pd.to_numeric(df_numeric[attr], errors='coerce').fillna(0).astype(int)
            if len(y.unique()) < 2:
                continue
            
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
            
            # Simple but effective adversary
            adversary = GradientBoostingClassifier(n_estimators=30, max_depth=3, random_state=42)
            adversary.fit(X_train, y_train)
            
            y_prob = adversary.predict_proba(X_test)[:, 1]
            auc = roc_auc_score(y_test, y_prob)
            
            # AUC of 0.5 is random. 0.8+ is high reconstruction capability.
            results[attr] = {
                "reconstruction_auc": round(float(auc), 4),
                "severity": "CRITICAL" if auc > 0.85 else "HIGH" if auc > 0.75 else "MEDIUM" if auc > 0.65 else "LOW",
                "is_latent_proxy": auc > 0.70,
                "interpretation": f"An adversary can reconstruct '{attr}' with {auc*100:.1f}% accuracy using only 'safe' features."
            }
            
        return {
            "latent_bias_detected": any(r["is_latent_proxy"] for r in results.values()),
            "metrics": results,
            "method": "adversarial_reconstruction"
        }
    except Exception as e:
        logger.error(f"Error in adversarial audit: {e}")
        return {"error": str(e)}

async def discover_multivariate_subgroups(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str],
    max_depth: int = 3
) -> List[Dict[str, Any]]:
    """
    Differentiating Factor: Multivariate Subgroup Discovery.
    Uses a decision tree to automatically find the most 'disadvantaged' or 'advantaged'
    subgroups across multiple dimensions.
    """
    try:
        from sklearn.tree import DecisionTreeClassifier, _tree
        
        logger.info("Discovering multivariate high-disparity subgroups")
        
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        X = df_numeric.drop(columns=[label_col])
        y = pd.to_numeric(df_numeric[label_col], errors='coerce').fillna(0).astype(int)
        
        # Train a shallow tree to find segments with high/low positive rates
        tree = DecisionTreeClassifier(max_depth=max_depth, min_samples_leaf=20)
        tree.fit(X, y)
        
        overall_rate = y.mean()
        subgroups = []
        
        def recurse(node, depth, path):
            if tree.tree_.feature[node] != _tree.TREE_UNDEFINED:
                name = X.columns[tree.tree_.feature[node]]
                threshold = tree.tree_.threshold[node]
                # Left child
                recurse(tree.tree_.children_left[node], depth + 1, path + [f"{name} <= {threshold:.2f}"])
                # Right child
                recurse(tree.tree_.children_right[node], depth + 1, path + [f"{name} > {threshold:.2f}"])
            else:
                # Leaf node
                n_samples = tree.tree_.n_node_samples[node]
                values = tree.tree_.value[node][0]
                pos_rate = values[1] / sum(values)
                disparity = pos_rate - overall_rate
                
                if abs(disparity) > 0.15: # Significant segment
                    # Only include if it involves at least one protected attribute or proxy
                    is_relevant = any(attr in " ".join(path) for attr in protected_attrs)
                    if is_relevant:
                        subgroups.append({
                            "description": " AND ".join(path),
                            "size": int(n_samples),
                            "positive_rate": round(float(pos_rate), 4),
                            "disparity": round(float(disparity), 4),
                            "risk_level": "CRITICAL" if abs(disparity) > 0.30 else "HIGH"
                        })

        recurse(0, 1, [])
        return sorted(subgroups, key=lambda x: abs(x["disparity"]), reverse=True)[:5]
        
    except Exception as e:
        logger.error(f"Error in multivariate discovery: {e}")
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
            "individual_fairness": {},
            "counterfactual_fairness": {},
            "adversarial_audit": {},
            "multivariate_subgroups": [],
            "feature_importance": [],
            "causal_analysis": {},
            "calibration_fairness": {},
            "distributional_representativeness": {},
            "fairness_score": 0,
            "ai_insights": {},
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
            
        # Step 5.5: Individual Fairness Consistency
        logger.info(f"[Audit {audit_id}] Computing individual fairness")
        try:
            consistency = await compute_individual_fairness_consistency(df, label_col, protected_attrs)
            results["individual_fairness"] = consistency
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in individual fairness: {e}")
            
        # Step 5.6: Counterfactual Fairness
        logger.info(f"[Audit {audit_id}] Computing counterfactual fairness")
        try:
            cf = await compute_counterfactual_fairness(df, label_col, protected_attrs)
            results["counterfactual_fairness"] = cf
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in counterfactual fairness: {e}")

        # Step 5.7: Adversarial Bias Audit (Differentiator)
        logger.info(f"[Audit {audit_id}] Running adversarial reconstruction audit")
        try:
            adv = await compute_adversarial_bias_audit(df, protected_attrs, label_col)
            results["adversarial_audit"] = adv
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in adversarial audit: {e}")

        # Step 5.8: Multivariate Subgroup Discovery (Differentiator)
        logger.info(f"[Audit {audit_id}] Discovering multivariate subgroups")
        try:
            subgroups = await discover_multivariate_subgroups(df, label_col, protected_attrs)
            results["multivariate_subgroups"] = subgroups
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in subgroup discovery: {e}")

        # Step 5.9: Calibration Fairness (Outstanding Differentiator)
        logger.info(f"[Audit {audit_id}] Computing calibration fairness")
        try:
            results["calibration_fairness"] = await compute_calibration_fairness(df, label_col, protected_attrs)
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in calibration: {e}")

        # Step 5.10: Distributional Representativeness (Outstanding Differentiator)
        logger.info(f"[Audit {audit_id}] Computing distributional drift")
        try:
            results["distributional_representativeness"] = await compute_distributional_drift_representativeness(df, protected_attrs)
        except Exception as e:
            logger.error(f"[Audit {audit_id}] Error in distributional drift: {e}")
        
        # Step 6: Compute fairness score (advanced version)
        logger.info(f"[Audit {audit_id}] Computing fairness score")
        fairness_score = _compute_fairness_score_phase3(
            results["metrics"],
            len(results["proxy_features"]),
            results["intersectional_results"],
            results.get("individual_fairness", {}),
            results.get("counterfactual_fairness", {}),
            results.get("adversarial_audit", {}),
            results.get("calibration_fairness", {}),
            results.get("distributional_representativeness", {})
        )
        results["fairness_score"] = fairness_score
        logger.info(f"[Audit {audit_id}] Fairness Score: {fairness_score}")
        
        # Step 6.5: Generate AI Insights
        logger.info(f"[Audit {audit_id}] Generating AI Insights")
        results["ai_insights"] = insight_engine.analyze(results)
        
        # Step 7: Update database
        logger.info(f"[Audit {audit_id}] Saving results to database")
        audit_run = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
        if audit_run:
            audit_run.status = AuditStatus.complete
            audit_run.metrics = results["metrics"]
            audit_run.fairness_score = fairness_score
            audit_run.proxy_features = results["proxy_features"]
            audit_run.intersectional_results = results["intersectional_results"]
            
            
            if hasattr(audit_run, 'feature_importance'):
                audit_run.feature_importance = results["feature_importance"]
            if hasattr(audit_run, 'causal_analysis'):
                audit_run.causal_analysis = results["causal_analysis"]
            
            # Save insights if we have a field for it, else stick it in metrics
            if hasattr(audit_run, 'ai_insights'):
                audit_run.ai_insights = results["ai_insights"]
            else:
                from sqlalchemy.orm.attributes import flag_modified
                if audit_run.metrics is None:
                    audit_run.metrics = {}
                else:
                    # Create a new dict to ensure SQLAlchemy detects the change
                    audit_run.metrics = dict(audit_run.metrics)
                
                audit_run.metrics["ai_insights"] = results["ai_insights"]
                audit_run.metrics["counterfactual_fairness"] = results["counterfactual_fairness"]
                audit_run.metrics["adversarial_audit"] = results["adversarial_audit"]
                audit_run.metrics["multivariate_subgroups"] = results["multivariate_subgroups"]
                flag_modified(audit_run, "metrics")
            
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

def _compute_fairness_score_phase3(
    metrics: Dict[str, Dict],
    proxy_count: int,
    intersectional_results: List[Dict],
    individual_fairness: Dict[str, Any],
    counterfactual_fairness: Dict[str, Any] = None,
    adversarial_audit: Dict[str, Any] = None,
    calibration_fairness: Dict[str, Any] = None,
    distributional_representativeness: Dict[str, Any] = None
) -> int:
    """
    Advanced fairness score (0-100) combining group and individual metrics.
    
    Weights:
    - Demographic parity quality: 20%
    - Equal opportunity quality: 20%
    - Disparate impact quality: 15%
    - Individual Fairness (Consistency): 15%
    - Probabilistic Calibration: 15%
    - Adversarial Robustness: 15%
    - Proxy features: -5 per proxy (capped at -20)
    - Intersectional disparity: -10 if worst group > 20% disparity
    - Distributional Drift: -5 if significant drift detected
    
    Args:
        metrics: Dict of attribute -> metrics dict
        proxy_count: Number of detected proxy features
        intersectional_results: Intersectional bias findings
        individual_fairness: Consistency metric results
    
    Returns:
        Score 0-100
    """
    try:
        if not metrics:
            return 50  # Default for no data
        
        # Collect valid metric values
        dp_values = []
        eo_values = []
        di_values = []
        
        for attr, m in metrics.items():
            if isinstance(m, dict) and "error" not in m:
                if m.get("demographic_parity_ratio") is not None:
                    di_values.append(min(1.0, max(0.0, float(m["demographic_parity_ratio"]))))
                if m.get("demographic_parity_difference") is not None:
                    dp_diff = abs(float(m["demographic_parity_difference"]))
                    dp_values.append(min(1.0, 1.0 - dp_diff))  # Convert to similarity score
                if m.get("equal_opportunity_difference") is not None:
                    eo_diff = abs(float(m["equal_opportunity_difference"]))
                    eo_values.append(min(1.0, 1.0 - eo_diff))
        
        if not dp_values and not di_values and not eo_values:
            return 50
        
        # Average scores
        dp_score = (sum(dp_values) / len(dp_values)) * 20 if dp_values else 0
        eo_score = (sum(eo_values) / len(eo_values)) * 20 if eo_values else 0
        di_score = (sum(di_values) / len(di_values)) * 15 if di_values else 0
        
        consistency_score = individual_fairness.get("consistency_score")
        if consistency_score is not None:
            indiv_score = min(1.0, float(consistency_score)) * 20
        else:
            indiv_score = 0
            
        adv_score = 25 # Start with full points
        if adversarial_audit and "metrics" in adversarial_audit:
            # Average 1 - AUC (higher AUC = more bias = lower score)
            aucs = [m["reconstruction_auc"] for m in (adversarial_audit.get("metrics") or {}).values()]
            if aucs:
                avg_auc = sum(aucs) / len(aucs)
                # AUC 0.5 is 100%, AUC 1.0 is 0%
                adv_robustness = max(0, 1.0 - ((avg_auc - 0.5) * 2))
                adv_score = adv_robustness * 25
        
        cal_score = 15 # Start with full points
        if calibration_fairness and "metrics" in calibration_fairness:
            disparities = [m["brier_disparity"] for m in (calibration_fairness.get("metrics") or {}).values()]
            if disparities:
                avg_disp = sum(disparities) / len(disparities)
                # Disparity 0.0 is 100%, Disparity 0.5 is 0%
                cal_robustness = max(0, 1.0 - (avg_disp * 2))
                cal_score = cal_robustness * 15

        base_score = dp_score + eo_score + di_score + indiv_score + adv_score + cal_score
        
        # Apply penalties
        proxy_penalty = min(proxy_count * 5, 20)
        
        intersectional_penalty = 0
        if intersectional_results:
            worst_disparity = max(
                (abs(r.get("disparity_from_average", 0)) for r in intersectional_results),
                default=0
            )
            if worst_disparity > 0.20:
                intersectional_penalty = 10
        
        drift_penalty = 0
        if distributional_representativeness and distributional_representativeness.get("findings"):
            drift_count = sum(len(f) for f in distributional_representativeness["findings"].values())
            if drift_count > 3:
                drift_penalty = 10

        # New: Causal & Counterfactual Penalties (Phase 4)
        cf_penalty = 0
        counterfactual = counterfactual_fairness or {}
             
        if counterfactual.get("overall_flagged"):
            cf_penalty = 10
            
        score = int(max(0, base_score - proxy_penalty - intersectional_penalty - cf_penalty - drift_penalty))
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
        
        try:
            import shap

            # Compute SHAP values
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X)

            # Handle binary classification (shap_values is list of 2 arrays)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]  # Use positive class

            # Compute mean absolute SHAP values per feature
            mean_abs_shap = np.abs(shap_values).mean(axis=0)
            method = "shap"
        except Exception as shap_exc:
            logger.warning(f"SHAP unavailable, using model feature_importances_: {shap_exc}")
            mean_abs_shap = model.feature_importances_
            method = "model_importance_fallback"
        
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
        results["method"] = method
        
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
        
        model = CausalModel(
            data=df_copy,
            treatment=treatment_attr,
            outcome=label_col,
            common_causes=confounders
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

async def compute_calibration_fairness(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str]
) -> Dict[str, Any]:
    """
    Outstanding Differentiator: Fairness Calibration Analysis.
    Checks if model confidence is equally reliable across subgroups.
    Uses Brier Score and Expected Calibration Error (ECE) approximation.
    """
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import brier_score_loss
        
        logger.info("Computing Calibration Fairness")
        
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        X = df_numeric.drop(columns=[label_col])
        y = pd.to_numeric(df_numeric[label_col], errors='coerce').fillna(0).astype(int)
        
        if len(X) < 100:
            return {"error": "Insufficient data for calibration analysis"}
            
        model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
        model.fit(X, y)
        
        # Get probabilities
        probs = model.predict_proba(X)[:, 1]
        
        results = {}
        for attr in protected_attrs:
            if attr not in X.columns:
                continue
                
            attr_values = _safe_binary(X[attr])
            
            # Compute metrics per group
            group_metrics = {}
            for val in [0, 1]:
                mask = attr_values == val
                if mask.sum() < 20: continue
                
                group_y = y[mask]
                group_probs = probs[mask]
                
                # Brier score (lower is better)
                brier = brier_score_loss(group_y, group_probs)
                
                # Simple ECE approximation: mean(abs(probs - y))
                ece_approx = np.mean(np.abs(group_probs - group_y))
                
                group_metrics[str(val)] = {
                    "brier_score": round(float(brier), 4),
                    "ece_approx": round(float(ece_approx), 4),
                    "confidence_gap": round(float(np.mean(group_probs) - np.mean(group_y)), 4)
                }
            
            if "0" in group_metrics and "1" in group_metrics:
                brier_diff = abs(group_metrics["1"]["brier_score"] - group_metrics["0"]["brier_score"])
                results[attr] = {
                    "brier_disparity": round(brier_diff, 4),
                    "is_calibrated": brier_diff < 0.05,
                    "interpretation": "High" if brier_diff < 0.05 else "Low",
                    "group_details": group_metrics
                }
                
        return {
            "metrics": results,
            "overall_flagged": any(r.get("brier_disparity", 0) > 0.1 for r in results.values()),
            "method": "probabilistic_calibration"
        }
    except Exception as e:
        logger.error(f"Error in calibration analysis: {e}")
        return {"error": str(e)}

async def compute_distributional_drift_representativeness(
    df: pd.DataFrame,
    protected_attrs: List[str]
) -> Dict[str, Any]:
    """
    Outstanding Differentiator: Distributional Representativeness.
    Uses Kolmogorov-Smirnov test to detect if features follow different 
    distributions across subgroups (Internal Drift).
    """
    try:
        logger.info("Computing Distributional Representativeness")
        
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        results = {}
        
        for attr in protected_attrs:
            if attr not in df_numeric.columns: continue
            
            attr_values = _safe_binary(df_numeric[attr])
            priv_mask = attr_values == 1
            unpriv_mask = attr_values == 0
            
            if priv_mask.sum() < 30 or unpriv_mask.sum() < 30: continue
            
            attr_results = []
            for feature in df_numeric.columns:
                if feature in protected_attrs: continue
                
                # KS test for distribution difference
                stat, p_val = ks_2samp(df_numeric.loc[priv_mask, feature], df_numeric.loc[unpriv_mask, feature])
                
                if p_val < 0.01: # Statistically significant difference
                    attr_results.append({
                        "feature": feature,
                        "ks_statistic": round(float(stat), 4),
                        "p_value": round(float(p_val), 6),
                        "drift_severity": "High" if stat > 0.3 else "Medium"
                    })
            
            results[attr] = sorted(attr_results, key=lambda x: x["ks_statistic"], reverse=True)[:5]
            
        return {
            "findings": results,
            "interpretation": "Identifies features where subgroups behave differently in the input space.",
            "method": "ks_distribution_check"
        }
    except Exception as e:
        logger.error(f"Error in distributional audit: {e}")
        return {"error": str(e)}

async def compute_bias_sensitivity_perturbation(
    df: pd.DataFrame,
    label_col: str,
    protected_attrs: List[str]
) -> Dict[str, Any]:
    """
    Outstanding Differentiator: Bias Sensitivity Analysis.
    Measures how 'stable' the bias is. If removing a single feature collapses the bias,
    that feature is the primary driver of the disparity.
    """
    try:
        logger.info("Computing Bias Sensitivity (Perturbation)")
        
        # Select numeric features for model-based perturbation
        df_numeric = df.select_dtypes(include=[np.number]).copy()
        if len(df_numeric) < 100:
            return {"error": "Insufficient data for sensitivity analysis"}
            
        from sklearn.ensemble import RandomForestClassifier
        
        X = df_numeric.drop(columns=[label_col])
        y = pd.to_numeric(df_numeric[label_col], errors='coerce').fillna(0).astype(int)
        
        # Train a proxy model to understand the relationship
        model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
        model.fit(X, y)
        
        def calculate_disparity(data_x):
            preds = model.predict(data_x)
            disparities = {}
            for attr in protected_attrs:
                if attr not in data_x.columns: continue
                attr_vals = _safe_binary(data_x[attr])
                
                # We use a simple demographic parity disparity (diff in positive rate)
                mask1 = attr_vals == 1
                mask0 = attr_vals == 0
                if mask1.sum() < 5 or mask0.sum() < 5: continue
                
                rate1 = preds[mask1].mean()
                rate0 = preds[mask0].mean()
                disparities[attr] = abs(rate1 - rate0)
            return disparities

        baseline_disparities = calculate_disparity(X)
        sensitivity_results = {}

        # Perturb each feature and see how baseline disparity changes
        for feature in X.columns:
            if feature in protected_attrs: continue
            
            X_perturbed = X.copy()
            # Randomly shuffle the feature to 'remove' its information
            X_perturbed[feature] = np.random.permutation(X_perturbed[feature].values)
            
            perturbed_disparities = calculate_disparity(X_perturbed)
            
            for attr, baseline in baseline_disparities.items():
                if attr not in sensitivity_results: sensitivity_results[attr] = []
                
                new_disparity = perturbed_disparities.get(attr, baseline)
                # Sensitivity is the reduction in disparity when feature is removed
                # If sensitivity is positive, this feature is DRIVING the bias.
                impact = baseline - new_disparity
                
                if abs(impact) > 0.005: # Only record meaningful impacts
                    sensitivity_results[attr].append({
                        "feature": feature,
                        "impact": round(float(impact), 4),
                        "percentage_reduction": round(float(impact / (baseline + 1e-6) * 100), 1)
                    })

        # Sort and pick top drivers for each attribute
        final_sensitivity = {}
        for attr, impacts in sensitivity_results.items():
            # Sort by absolute impact
            sorted_impacts = sorted(impacts, key=lambda x: abs(x["impact"]), reverse=True)
            final_sensitivity[attr] = sorted_impacts[:5]

        return {
            "sensitivity_map": final_sensitivity,
            "interpretation": "Identifies which features, if removed or modified, would most significantly reduce bias.",
            "method": "feature_permutation_perturbation"
        }

    except Exception as e:
        logger.error(f"Error in sensitivity analysis: {e}")
        return {"error": str(e)}

