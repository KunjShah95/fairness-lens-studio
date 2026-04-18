from pydantic import BaseModel
from typing import Optional


class CounterfactualRequest(BaseModel):
    dataset_id: str
    instance_index: int
    label_column: str
    num_counterfactuals: Optional[int] = 3


class ExplanationRequest(BaseModel):
    dataset_id: str
    instance_index: int
    label_column: str
    num_features: Optional[int] = 5
