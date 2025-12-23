// Asset Types
export interface Asset {
  id: string;
  name: string;
  namespace?: string;
  kind: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  properties?: Record<string, any>;
  created_at: string;
  relationships?: Array<Record<string, any>>;
}

// Query Types
export interface QueryRequest {
  query: string;
  parameters?: Record<string, any>;
}

export interface QueryResponse {
  data: Array<Record<string, any>>;
  total: number;
}

// Graph Visualization Types
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  color?: string;
  size?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties: Record<string, any>;
  color?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Attack Path Types
export interface AttackStep {
  node_id: string;
  node_type: string;
  node_name: string;
  description: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  exploited_vulnerability?: string;
}

export interface AttackPath {
  id: string;
  source: string;
  target: string;
  steps: AttackStep[];
  total_risk: string;
  likelihood: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Health Check Type
export interface HealthStatus {
  status: string;
  janusgraph_connected: boolean;
  k8s_connected: boolean;
}

// Graph Statistics Type
export interface GraphStats {
  vertex_count: number;
  edge_count: number;
  label_counts: Record<string, number>;
}

// Collection Status Type
export interface CollectionStatus {
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  resources_collected: number;
  errors: string[];
}

// K8s Asset Types
export interface PodAsset extends Asset {
  kind: 'Pod';
  pod_ip?: string;
  host_ip?: string;
  phase?: string;
  container_images?: string[];
  service_account?: string;
  node_name?: string;
}

export interface ServiceAsset extends Asset {
  kind: 'Service';
  cluster_ip?: string;
  external_ips?: string[];
  ports?: Array<Record<string, any>>;
  selector?: Record<string, string>;
  type?: string;
}

export interface DeploymentAsset extends Asset {
  kind: 'Deployment';
  replicas?: number;
  ready_replicas?: number;
  selector?: Record<string, string>;
  strategy?: string;
  template_labels?: Record<string, string>;
}

export interface NamespaceAsset extends Asset {
  kind: 'Namespace';
  status?: string;
  resource_quotas?: Record<string, any>;
}

export interface NodeAsset extends Asset {
  kind: 'Node';
  node_ip?: string;
  os_image?: string;
  kernel_version?: string;
  container_runtime?: string;
  taints?: Array<Record<string, any>>;
}

export interface SecretAsset extends Asset {
  kind: 'Secret';
  type?: string;
  data_keys?: string[];
}

export interface ConfigMapAsset extends Asset {
  kind: 'ConfigMap';
  data_keys?: string[];
}

export interface RoleAsset extends Asset {
  kind: 'Role' | 'ClusterRole';
  rules?: Array<Record<string, any>>;
}

export interface RoleBindingAsset extends Asset {
  kind: 'RoleBinding' | 'ClusterRoleBinding';
  role_ref?: Record<string, string>;
  subjects?: Array<Record<string, any>>;
}

export interface ServiceAccountAsset extends Asset {
  kind: 'ServiceAccount';
  secrets?: string[];
  image_pull_secrets?: string[];
}