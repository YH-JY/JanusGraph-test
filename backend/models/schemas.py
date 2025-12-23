from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

# Asset Models
class AssetBase(BaseModel):
    name: str
    namespace: Optional[str] = None
    kind: str
    labels: Optional[Dict[str, str]] = None
    annotations: Optional[Dict[str, str]] = None

class AssetResponse(AssetBase):
    id: str
    properties: Optional[Dict[str, Any]] = None
    created_at: datetime
    relationships: Optional[List[Dict[str, Any]]] = None

# Query Models
class QueryRequest(BaseModel):
    query: str
    parameters: Optional[Dict[str, Any]] = None

class QueryResponse(BaseModel):
    data: List[Dict[str, Any]]
    total: int

# Graph Models
class NodeModel(BaseModel):
    id: str
    label: str
    type: str
    properties: Dict[str, Any]
    x: Optional[float] = None
    y: Optional[float] = None

class EdgeModel(BaseModel):
    id: str
    source: str
    target: str
    label: str
    properties: Dict[str, Any]

class GraphData(BaseModel):
    nodes: List[NodeModel]
    edges: List[EdgeModel]

# Attack Path Models
class AttackStep(BaseModel):
    node_id: str
    node_type: str
    node_name: str
    description: str
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    exploited_vulnerability: Optional[str] = None

class AttackPath(BaseModel):
    id: str
    source: str
    target: str
    steps: List[AttackStep]
    total_risk: str
    likelihood: float  # 0.0 to 1.0

# Collection Models
class CollectionStatus(BaseModel):
    status: str  # RUNNING, COMPLETED, FAILED
    started_at: datetime
    completed_at: Optional[datetime] = None
    resources_collected: int
    errors: List[str] = []

# K8s Specific Models
class PodAsset(AssetBase):
    kind: str = "Pod"
    pod_ip: Optional[str] = None
    host_ip: Optional[str] = None
    phase: Optional[str] = None
    container_images: Optional[List[str]] = None
    service_account: Optional[str] = None
    node_name: Optional[str] = None

class ServiceAsset(AssetBase):
    kind: str = "Service"
    cluster_ip: Optional[str] = None
    external_ips: Optional[List[str]] = None
    ports: Optional[List[Dict[str, Any]]] = None
    selector: Optional[Dict[str, str]] = None
    type: Optional[str] = None

class DeploymentAsset(AssetBase):
    kind: str = "Deployment"
    replicas: Optional[int] = None
    ready_replicas: Optional[int] = None
    selector: Optional[Dict[str, str]] = None
    strategy: Optional[str] = None
    template_labels: Optional[Dict[str, str]] = None

class NamespaceAsset(AssetBase):
    kind: str = "Namespace"
    status: Optional[str] = None
    resource_quotas: Optional[Dict[str, Any]] = None

class NodeAsset(AssetBase):
    kind: str = "Node"
    node_ip: Optional[str] = None
    os_image: Optional[str] = None
    kernel_version: Optional[str] = None
    container_runtime: Optional[str] = None
    taints: Optional[List[Dict[str, Any]]] = None
    labels: Dict[str, str] = {}

class SecretAsset(AssetBase):
    kind: str = "Secret"
    type: Optional[str] = None
    data_keys: Optional[List[str]] = None  # Don't store actual secret data

class ConfigMapAsset(AssetBase):
    kind: str = "ConfigMap"
    data_keys: Optional[List[str]] = None

class RoleAsset(AssetBase):
    kind: str = "Role"
    rules: Optional[List[Dict[str, Any]]] = None

class RoleBindingAsset(AssetBase):
    kind: str = "RoleBinding"
    role_ref: Optional[Dict[str, str]] = None
    subjects: Optional[List[Dict[str, Any]]] = None

class ClusterRoleAsset(AssetBase):
    kind: str = "ClusterRole"
    rules: Optional[List[Dict[str, Any]]] = None

class ClusterRoleBindingAsset(AssetBase):
    kind: str = "ClusterRoleBinding"
    role_ref: Optional[Dict[str, str]] = None
    subjects: Optional[List[Dict[str, Any]]] = None

class ServiceAccountAsset(AssetBase):
    kind: str = "ServiceAccount"
    secrets: Optional[List[str]] = None
    image_pull_secrets: Optional[List[str]] = None