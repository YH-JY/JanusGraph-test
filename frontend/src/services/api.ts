import axios from 'axios';
import {
  Asset,
  QueryRequest,
  QueryResponse,
  GraphData,
  AttackPath,
  HealthStatus,
  GraphStats
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Health check
export const checkHealth = async (): Promise<HealthStatus> => {
  const response = await api.get('/health');
  return response.data;
};

// Collect K8s assets
export const collectAssets = async (): Promise<any> => {
  const response = await api.post('/collect');
  return response.data;
};

// Get assets
export const getAssets = async (assetType?: string): Promise<Asset[]> => {
  const response = await api.get('/assets', {
    params: { asset_type: assetType }
  });
  return response.data;
};

// Query graph
export const queryGraph = async (request: QueryRequest): Promise<QueryResponse> => {
  const response = await api.post('/query', request);
  return response.data;
};

// Get attack paths
export const getAttackPaths = async (
  source?: string,
  target?: string
): Promise<{ paths: AttackPath[] }> => {
  const response = await api.get('/attack-paths', {
    params: { source, target }
  });
  return response.data;
};

// Get graph statistics
export const getGraphStats = async (): Promise<GraphStats> => {
  const response = await api.get('/graph/stats');
  return response.data;
};

// Clear graph
export const clearGraph = async (): Promise<any> => {
  const response = await api.delete('/graph');
  return response.data;
};

// Get graph visualization data
export const getGraphVisualizationData = async (): Promise<GraphData> => {
  // Query to get nodes and edges for visualization
  const nodesQuery = `
    g.V().valueMap(true).limit(1000).toList()
  `;
  
  const edgesQuery = `
    g.E().valueMap(true).limit(2000).toList()
  `;
  
  const [nodesResult, edgesResult] = await Promise.all([
    queryGraph({ query: nodesQuery }),
    queryGraph({ query: edgesQuery })
  ]);
  
  // Transform data into GraphData format
  const nodes: GraphData['nodes'] = nodesResult.data.map((node: any) => ({
    id: node.id[0],
    label: node.name?.[0] || node.id[0],
    type: Object.keys(node).find(k => k !== 'id' && k !== 'name') || 'Unknown',
    properties: node,
    color: getNodeColor(node),
    size: getNodeSize(node)
  }));
  
  const edges: GraphData['edges'] = edgesResult.data.map((edge: any) => ({
    id: edge.id[0],
    source: edge.outV[0],
    target: edge.inV[0],
    label: edge.label?.[0] || 'connected',
    properties: edge,
    color: getEdgeColor(edge)
  }));
  
  return { nodes, edges };
};

// Helper functions for visualization
const getNodeColor = (node: any): string => {
  const type = Object.keys(node).find(k => k !== 'id' && k !== 'name') || 'Unknown';
  const colorMap: Record<string, string> = {
    'Pod': '#61dafb',
    'Service': '#8884d8',
    'Deployment': '#82ca9d',
    'Namespace': '#ffc658',
    'Node': '#ff7c7c',
    'Secret': '#d084d0',
    'ConfigMap': '#ffb347',
    'Role': '#8dd1e1',
    'RoleBinding': '#d084d0',
    'ClusterRole': '#87ceeb',
    'ClusterRoleBinding': '#dda0dd',
    'ServiceAccount': '#f0e68c',
    'Ingress': '#98fb98'
  };
  return colorMap[type] || '#cccccc';
};

const getNodeSize = (node: any): number => {
  const type = Object.keys(node).find(k => k !== 'id' && k !== 'name') || 'Unknown';
  const sizeMap: Record<string, number> = {
    'Pod': 8,
    'Service': 10,
    'Deployment': 12,
    'Namespace': 15,
    'Node': 14,
    'Secret': 6,
    'ConfigMap': 6,
    'Role': 8,
    'RoleBinding': 8,
    'ClusterRole': 10,
    'ClusterRoleBinding': 10,
    'ServiceAccount': 7,
    'Ingress': 10
  };
  return sizeMap[type] || 8;
};

const getEdgeColor = (edge: any): string => {
  const label = edge.label?.[0] || 'connected';
  const colorMap: Record<string, string> = {
    'runs_on': '#ff9999',
    'uses': '#99ccff',
    'selects': '#99ff99',
    'manages': '#ffcc99',
    'in_namespace': '#cccccc',
    'references': '#ff99cc',
    'grants_to': '#ccffcc',
    'routes_to': '#ffccff'
  };
  return colorMap[label] || '#cccccc';
};