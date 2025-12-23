import logging
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime

from services.janusgraph_client import JanusGraphClient

logger = logging.getLogger(__name__)

class GraphBuilder:
    def __init__(self, janusgraph_client: JanusGraphClient):
        self.client = janusgraph_client
        
    async def import_assets(self, assets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Import K8s assets into JanusGraph"""
        try:
            # First ensure connection
            await self.client.connect()
            
            # Track created vertices for edge creation
            vertex_map = {}
            created_count = {"vertices": 0, "edges": 0}
            
            # Create vertices for all assets
            for asset in assets:
                vertex_id = await self._create_vertex_from_asset(asset)
                if vertex_id:
                    key = self._get_asset_key(asset)
                    vertex_map[key] = vertex_id
                    created_count["vertices"] += 1
            
            # Create relationships (edges)
            edges_created = await self._create_relationships(assets, vertex_map)
            created_count["edges"] = edges_created
            
            logger.info(f"Successfully imported {created_count['vertices']} vertices and {created_count['edges']} edges")
            return created_count
            
        except Exception as e:
            logger.error(f"Error importing assets: {str(e)}")
            raise
    
    async def _create_vertex_from_asset(self, asset: Dict[str, Any]) -> Optional[str]:
        """Create a vertex from an asset"""
        try:
            # Prepare vertex properties
            properties = {
                "name": asset["name"],
                "namespace": asset.get("namespace"),
                "created_at": datetime.now().isoformat(),
                "import_timestamp": datetime.now().isoformat()
            }
            
            # Add asset-specific properties
            if "properties" in asset:
                for key, value in asset["properties"].items():
                    if value is not None:
                        # Convert complex objects to JSON strings
                        if isinstance(value, (dict, list)):
                            properties[key] = str(value)
                        else:
                            properties[key] = str(value)
            
            # Create vertex
            vertex_id = await self.client.create_vertex(asset["kind"], properties)
            return vertex_id
            
        except Exception as e:
            logger.error(f"Error creating vertex for {asset['kind']} {asset['name']}: {str(e)}")
            return None
    
    def _get_asset_key(self, asset: Dict[str, Any]) -> str:
        """Generate unique key for an asset"""
        if asset.get("namespace"):
            return f"{asset['kind']}:{asset['namespace']}:{asset['name']}"
        return f"{asset['kind']}::{asset['name']}"
    
    async def _create_relationships(self, assets: List[Dict[str, Any]], vertex_map: Dict[str, str]) -> int:
        """Create relationships between assets"""
        edges_created = 0
        batch_size = 100
        edge_tasks = []
        
        # Define relationships to create
        relationships = [
            self._create_pod_relationships,
            self._create_service_relationships,
            self._create_deployment_relationships,
            self._create_rbac_relationships,
            self._create_namespace_relationships,
            self._create_ingress_relationships
        ]
        
        # Collect all edge creation tasks
        for relationship_func in relationships:
            edge_tasks.extend(relationship_func(assets, vertex_map))
        
        # Execute edges in batches
        for i in range(0, len(edge_tasks), batch_size):
            batch = edge_tasks[i:i+batch_size]
            results = await asyncio.gather(*batch, return_exceptions=True)
            
            for result in results:
                if not isinstance(result, Exception) and result:
                    edges_created += 1
        
        return edges_created
    
    def _create_pod_relationships(self, assets: List[Dict[str, Any]], vertex_map: Dict[str, str]) -> List:
        """Create relationships for pods"""
        tasks = []
        
        for asset in assets:
            if asset["kind"] == "Pod":
                pod_key = self._get_asset_key(asset)
                if pod_key not in vertex_map:
                    continue
                
                # Pod -> Node relationship
                if asset["properties"].get("node_name"):
                    node_key = f"Node::{asset['properties']['node_name']}"
                    if node_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[pod_key],
                                vertex_map[node_key],
                                "runs_on"
                            )
                        )
                
                # Pod -> ServiceAccount relationship
                if asset["properties"].get("service_account"):
                    sa_key = f"ServiceAccount:{asset['namespace']}:{asset['properties']['service_account']}"
                    if sa_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[pod_key],
                                vertex_map[sa_key],
                                "uses"
                            )
                        )
                
                # Pod -> Namespace relationship
                if asset.get("namespace"):
                    ns_key = f"Namespace:{asset['namespace']}"
                    if ns_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[pod_key],
                                vertex_map[ns_key],
                                "in_namespace"
                            )
                        )
        
        return tasks
    
    def _create_service_relationships(self, assets: List[Dict[str, Any]], vertex_map: Dict[str, str]) -> List:
        """Create relationships for services"""
        tasks = []
        
        for asset in assets:
            if asset["kind"] == "Service":
                svc_key = self._get_asset_key(asset)
                if svc_key not in vertex_map:
                    continue
                
                # Service -> Namespace relationship
                if asset.get("namespace"):
                    ns_key = f"Namespace:{asset['namespace']}"
                    if ns_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[svc_key],
                                vertex_map[ns_key],
                                "in_namespace"
                            )
                        )
                
                # Service -> Pod relationships (via selector)
                selector = asset["properties"].get("selector", {})
                if selector:
                    # Find pods matching the selector
                    for other_asset in assets:
                        if (other_asset["kind"] == "Pod" and 
                            other_asset.get("namespace") == asset.get("namespace")):
                            
                            pod_labels = other_asset.get("labels", {})
                            if all(pod_labels.get(k) == v for k, v in selector.items()):
                                pod_key = self._get_asset_key(other_asset)
                                if pod_key in vertex_map:
                                    tasks.append(
                                        self.client.create_edge(
                                            vertex_map[svc_key],
                                            vertex_map[pod_key],
                                            "selects"
                                        )
                                    )
        
        return tasks
    
    def _create_deployment_relationships(self, assets: List[Dict[str, Any]], vertex_map: Dict[str, str]) -> List:
        """Create relationships for deployments"""
        tasks = []
        
        for asset in assets:
            if asset["kind"] == "Deployment":
                deploy_key = self._get_asset_key(asset)
                if deploy_key not in vertex_map:
                    continue
                
                # Deployment -> Namespace relationship
                if asset.get("namespace"):
                    ns_key = f"Namespace:{asset['namespace']}"
                    if ns_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[deploy_key],
                                vertex_map[ns_key],
                                "in_namespace"
                            )
                        )
                
                # Deployment -> Pod relationships
                selector = asset["properties"].get("selector", {})
                if selector:
                    for other_asset in assets:
                        if (other_asset["kind"] == "Pod" and 
                            other_asset.get("namespace") == asset.get("namespace")):
                            
                            pod_labels = other_asset.get("labels", {})
                            if all(pod_labels.get(k) == v for k, v in selector.items()):
                                pod_key = self._get_asset_key(other_asset)
                                if pod_key in vertex_map:
                                    tasks.append(
                                        self.client.create_edge(
                                            vertex_map[deploy_key],
                                            vertex_map[pod_key],
                                            "manages"
                                        )
                                    )
        
        return tasks
    
    def _create_rbac_relationships(self, assets: List[Dict[str, Any]], vertex_map: Dict[str, str]) -> List:
        """Create RBAC relationships"""
        tasks = []
        
        for asset in assets:
            # RoleBinding relationships
            if asset["kind"] == "RoleBinding":
                rb_key = self._get_asset_key(asset)
                if rb_key not in vertex_map:
                    continue
                
                # RoleBinding -> Role
                role_ref = asset["properties"].get("role_ref", {})
                if role_ref.get("kind") == "Role":
                    role_key = f"Role:{asset['namespace']}:{role_ref['name']}"
                elif role_ref.get("kind") == "ClusterRole":
                    role_key = f"ClusterRole::{role_ref['name']}"
                else:
                    continue
                
                if role_key in vertex_map:
                    tasks.append(
                        self.client.create_edge(
                            vertex_map[rb_key],
                            vertex_map[role_key],
                            "references"
                        )
                    )
                
                # RoleBinding -> Subject relationships
                subjects = asset["properties"].get("subjects", [])
                for subject in subjects:
                    if subject["kind"] in ["ServiceAccount", "User", "Group"]:
                        if subject["kind"] == "ServiceAccount":
                            subject_key = f"ServiceAccount:{subject.get('namespace', asset['namespace'])}:{subject['name']}"
                        else:
                            subject_key = f"{subject['kind']}::{subject['name']}"
                        
                        if subject_key in vertex_map:
                            tasks.append(
                                self.client.create_edge(
                                    vertex_map[rb_key],
                                    vertex_map[subject_key],
                                    "grants_to"
                                )
                            )
            
            # ClusterRoleBinding relationships
            elif asset["kind"] == "ClusterRoleBinding":
                crb_key = self._get_asset_key(asset)
                if crb_key not in vertex_map:
                    continue
                
                # ClusterRoleBinding -> ClusterRole
                role_ref = asset["properties"].get("role_ref", {})
                if role_ref.get("kind") == "ClusterRole":
                    role_key = f"ClusterRole::{role_ref['name']}"
                    if role_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[crb_key],
                                vertex_map[role_key],
                                "references"
                            )
                        )
                
                # ClusterRoleBinding -> Subject relationships
                subjects = asset["properties"].get("subjects", [])
                for subject in subjects:
                    if subject["kind"] == "ServiceAccount":
                        subject_key = f"ServiceAccount:{subject.get('namespace')}:{subject['name']}"
                    else:
                        subject_key = f"{subject['kind']}::{subject['name']}"
                    
                    if subject_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[crb_key],
                                vertex_map[subject_key],
                                "grants_to"
                            )
                        )
        
        return tasks
    
    def _create_namespace_relationships(self, assets: List[Dict[str, Any]], vertex_map: Dict[str, str]) -> List:
        """Create namespace relationships"""
        tasks = []
        
        for asset in assets:
            if asset["kind"] in ["Secret", "ConfigMap", "Role", "ServiceAccount"]:
                asset_key = self._get_asset_key(asset)
                if asset_key not in vertex_map:
                    continue
                
                # Asset -> Namespace relationship
                if asset.get("namespace"):
                    ns_key = f"Namespace:{asset['namespace']}"
                    if ns_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[asset_key],
                                vertex_map[ns_key],
                                "in_namespace"
                            )
                        )
        
        return tasks
    
    def _create_ingress_relationships(self, assets: List[Dict[str, Any]], vertex_map: Dict[str, str]) -> List:
        """Create ingress relationships"""
        tasks = []
        
        for asset in assets:
            if asset["kind"] == "Ingress":
                ingress_key = self._get_asset_key(asset)
                if ingress_key not in vertex_map:
                    continue
                
                # Ingress -> Namespace relationship
                if asset.get("namespace"):
                    ns_key = f"Namespace:{asset['namespace']}"
                    if ns_key in vertex_map:
                        tasks.append(
                            self.client.create_edge(
                                vertex_map[ingress_key],
                                vertex_map[ns_key],
                                "in_namespace"
                            )
                        )
                
                # Ingress -> Service relationships
                backends = asset["properties"].get("backends", [])
                for backend in backends:
                    if backend.get("service_name"):
                        svc_key = f"Service:{asset['namespace']}:{backend['service_name']}"
                        if svc_key in vertex_map:
                            tasks.append(
                                self.client.create_edge(
                                    vertex_map[ingress_key],
                                    vertex_map[svc_key],
                                    "routes_to"
                                )
                            )
        
        return tasks