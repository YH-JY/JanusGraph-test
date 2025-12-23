from kubernetes import client, config
from kubernetes.client.rest import ApiException
import logging
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class K8sCollector:
    def __init__(self, kubeconfig_path: str = None, in_cluster: bool = False):
        self.kubeconfig_path = kubeconfig_path
        self.in_cluster = in_cluster
        self.api_client = None
        self.core_v1 = None
        self.apps_v1 = None
        self.networking_v1 = None
        self.rbac_v1 = None
        
    async def connect(self):
        """Connect to Kubernetes cluster"""
        try:
            if self.in_cluster:
                # Use in-cluster configuration
                config.load_incluster_config()
            elif self.kubeconfig_path:
                # Use specified kubeconfig file
                config.load_kube_config(config_file=self.kubeconfig_path)
            else:
                # Use default kubeconfig
                config.load_kube_config()
            
            # Initialize API clients
            self.api_client = client.ApiClient()
            self.core_v1 = client.CoreV1Api(self.api_client)
            self.apps_v1 = client.AppsV1Api(self.api_client)
            self.networking_v1 = client.NetworkingV1Api(self.api_client)
            self.rbac_v1 = client.RbacAuthorizationV1Api(self.api_client)
            
            # Test connection
            await self.core_v1.get_api_resources()
            logger.info("Connected to Kubernetes cluster")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Kubernetes: {str(e)}")
            return False
    
    def is_connected(self):
        """Check if connected to Kubernetes"""
        return self.core_v1 is not None
    
    async def collect_all_resources(self) -> List[Dict[str, Any]]:
        """Collect all configured resources from K8s"""
        resources = []
        
        # Define resource collectors
        collectors = {
            "pods": self.collect_pods,
            "services": self.collect_services,
            "deployments": self.collect_deployments,
            "namespaces": self.collect_namespaces,
            "nodes": self.collect_nodes,
            "ingress": self.collect_ingress,
            "secrets": self.collect_secrets,
            "configmaps": self.collect_configmaps,
            "roles": self.collect_roles,
            "rolebindings": self.collect_rolebindings,
            "clusterroles": self.collect_clusterroles,
            "clusterrolebindings": self.collect_clusterrolebindings,
            "serviceaccounts": self.collect_serviceaccounts
        }
        
        # Collect all resources in parallel
        tasks = []
        for resource_type, collector in collectors.items():
            task = asyncio.create_task(collector())
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error collecting resource {list(collectors.keys())[i]}: {str(result)}")
            else:
                resources.extend(result)
        
        logger.info(f"Collected {len(resources)} resources from Kubernetes")
        return resources
    
    async def collect_pods(self) -> List[Dict[str, Any]]:
        """Collect all pods"""
        pods = []
        try:
            pod_list = self.core_v1.list_pod_for_all_namespaces(watch=False)
            
            for pod in pod_list.items:
                pod_data = {
                    "kind": "Pod",
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "labels": pod.metadata.labels or {},
                    "annotations": pod.metadata.annotations or {},
                    "properties": {
                        "pod_ip": pod.status.pod_ip,
                        "host_ip": pod.status.host_ip,
                        "phase": pod.status.phase,
                        "node_name": pod.spec.node_name,
                        "service_account": pod.spec.service_account_name,
                        "container_images": [c.image for c in pod.spec.containers],
                        "creation_timestamp": pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None
                    }
                }
                pods.append(pod_data)
                
        except Exception as e:
            logger.error(f"Error collecting pods: {str(e)}")
            
        return pods
    
    async def collect_services(self) -> List[Dict[str, Any]]:
        """Collect all services"""
        services = []
        try:
            svc_list = self.core_v1.list_service_for_all_namespaces(watch=False)
            
            for svc in svc_list.items:
                ports = []
                if svc.spec.ports:
                    for port in svc.spec.ports:
                        ports.append({
                            "name": port.name,
                            "port": port.port,
                            "target_port": port.target_port,
                            "protocol": port.protocol,
                            "node_port": port.node_port
                        })
                
                svc_data = {
                    "kind": "Service",
                    "name": svc.metadata.name,
                    "namespace": svc.metadata.namespace,
                    "labels": svc.metadata.labels or {},
                    "annotations": svc.metadata.annotations or {},
                    "properties": {
                        "cluster_ip": svc.spec.cluster_ip,
                        "external_ips": svc.spec.external_i_ps or [],
                        "ports": ports,
                        "selector": svc.spec.selector or {},
                        "type": svc.spec.type,
                        "creation_timestamp": svc.metadata.creation_timestamp.isoformat() if svc.metadata.creation_timestamp else None
                    }
                }
                services.append(svc_data)
                
        except Exception as e:
            logger.error(f"Error collecting services: {str(e)}")
            
        return services
    
    async def collect_deployments(self) -> List[Dict[str, Any]]:
        """Collect all deployments"""
        deployments = []
        try:
            deploy_list = self.apps_v1.list_deployment_for_all_namespaces(watch=False)
            
            for deploy in deploy_list.items:
                deploy_data = {
                    "kind": "Deployment",
                    "name": deploy.metadata.name,
                    "namespace": deploy.metadata.namespace,
                    "labels": deploy.metadata.labels or {},
                    "annotations": deploy.metadata.annotations or {},
                    "properties": {
                        "replicas": deploy.spec.replicas,
                        "ready_replicas": deploy.status.ready_replicas or 0,
                        "selector": deploy.spec.selector.match_labels if deploy.spec.selector else {},
                        "strategy": deploy.spec.strategy.type if deploy.spec.strategy else "RollingUpdate",
                        "template_labels": deploy.spec.template.metadata.labels if deploy.spec.template else {},
                        "creation_timestamp": deploy.metadata.creation_timestamp.isoformat() if deploy.metadata.creation_timestamp else None
                    }
                }
                deployments.append(deploy_data)
                
        except Exception as e:
            logger.error(f"Error collecting deployments: {str(e)}")
            
        return deployments
    
    async def collect_namespaces(self) -> List[Dict[str, Any]]:
        """Collect all namespaces"""
        namespaces = []
        try:
            ns_list = self.core_v1.list_namespace(watch=False)
            
            for ns in ns_list.items:
                ns_data = {
                    "kind": "Namespace",
                    "name": ns.metadata.name,
                    "namespace": ns.metadata.name,
                    "labels": ns.metadata.labels or {},
                    "annotations": ns.metadata.annotations or {},
                    "properties": {
                        "status": ns.status.phase,
                        "creation_timestamp": ns.metadata.creation_timestamp.isoformat() if ns.metadata.creation_timestamp else None
                    }
                }
                namespaces.append(ns_data)
                
        except Exception as e:
            logger.error(f"Error collecting namespaces: {str(e)}")
            
        return namespaces
    
    async def collect_nodes(self) -> List[Dict[str, Any]]:
        """Collect all nodes"""
        nodes = []
        try:
            node_list = self.core_v1.list_node(watch=False)
            
            for node in node_list.items:
                node_data = {
                    "kind": "Node",
                    "name": node.metadata.name,
                    "namespace": None,
                    "labels": node.metadata.labels or {},
                    "annotations": node.metadata.annotations or {},
                    "properties": {
                        "node_ip": None,
                        "os_image": node.status.node_info.os_image,
                        "kernel_version": node.status.node_info.kernel_version,
                        "container_runtime": node.status.node_info.container_runtime_version,
                        "taints": [{"key": t.key, "value": t.value, "effect": t.effect} for t in node.spec.taints] if node.spec.taints else [],
                        "creation_timestamp": node.metadata.creation_timestamp.isoformat() if node.metadata.creation_timestamp else None
                    }
                }
                
                # Get node IP from addresses
                for addr in node.status.addresses:
                    if addr.type == "InternalIP":
                        node_data["properties"]["node_ip"] = addr.address
                        break
                
                nodes.append(node_data)
                
        except Exception as e:
            logger.error(f"Error collecting nodes: {str(e)}")
            
        return nodes
    
    async def collect_ingress(self) -> List[Dict[str, Any]]:
        """Collect all ingress resources"""
        ingress_list = []
        try:
            ing_list = self.networking_v1.list_ingress_for_all_namespaces(watch=False)
            
            for ing in ing_list.items:
                # Extract backend services
                backends = []
                if ing.spec.rules:
                    for rule in ing.spec.rules:
                        if rule.http and rule.http.paths:
                            for path in rule.http.paths:
                                backends.append({
                                    "host": rule.host,
                                    "path": path.path,
                                    "service_name": path.backend.service.name if path.backend.service else None,
                                    "service_port": path.backend.service.port.number if path.backend.service else None
                                })
                
                ing_data = {
                    "kind": "Ingress",
                    "name": ing.metadata.name,
                    "namespace": ing.metadata.namespace,
                    "labels": ing.metadata.labels or {},
                    "annotations": ing.metadata.annotations or {},
                    "properties": {
                        "backends": backends,
                        "ingress_class": ing.spec.ingress_class_name,
                        "creation_timestamp": ing.metadata.creation_timestamp.isoformat() if ing.metadata.creation_timestamp else None
                    }
                }
                ingress_list.append(ing_data)
                
        except Exception as e:
            logger.error(f"Error collecting ingress: {str(e)}")
            
        return ingress_list
    
    async def collect_secrets(self) -> List[Dict[str, Any]]:
        """Collect all secrets (without actual secret data)"""
        secrets = []
        try:
            secret_list = self.core_v1.list_secret_for_all_namespaces(watch=False)
            
            for secret in secret_list.items:
                secret_data = {
                    "kind": "Secret",
                    "name": secret.metadata.name,
                    "namespace": secret.metadata.namespace,
                    "labels": secret.metadata.labels or {},
                    "annotations": secret.metadata.annotations or {},
                    "properties": {
                        "type": secret.type,
                        "data_keys": list(secret.data.keys()) if secret.data else [],
                        "creation_timestamp": secret.metadata.creation_timestamp.isoformat() if secret.metadata.creation_timestamp else None
                    }
                }
                secrets.append(secret_data)
                
        except Exception as e:
            logger.error(f"Error collecting secrets: {str(e)}")
            
        return secrets
    
    async def collect_configmaps(self) -> List[Dict[str, Any]]:
        """Collect all configmaps"""
        configmaps = []
        try:
            cm_list = self.core_v1.list_config_map_for_all_namespaces(watch=False)
            
            for cm in cm_list.items:
                cm_data = {
                    "kind": "ConfigMap",
                    "name": cm.metadata.name,
                    "namespace": cm.metadata.namespace,
                    "labels": cm.metadata.labels or {},
                    "annotations": cm.metadata.annotations or {},
                    "properties": {
                        "data_keys": list(cm.data.keys()) if cm.data else [],
                        "creation_timestamp": cm.metadata.creation_timestamp.isoformat() if cm.metadata.creation_timestamp else None
                    }
                }
                configmaps.append(cm_data)
                
        except Exception as e:
            logger.error(f"Error collecting configmaps: {str(e)}")
            
        return configmaps
    
    async def collect_roles(self) -> List[Dict[str, Any]]:
        """Collect all roles"""
        roles = []
        try:
            role_list = self.rbac_v1.list_role_for_all_namespaces(watch=False)
            
            for role in role_list.items:
                rules = []
                if role.rules:
                    for rule in role.rules:
                        rules.append({
                            "verbs": rule.verbs,
                            "api_groups": rule.api_groups,
                            "resources": rule.resources,
                            "resource_names": rule.resource_names
                        })
                
                role_data = {
                    "kind": "Role",
                    "name": role.metadata.name,
                    "namespace": role.metadata.namespace,
                    "labels": role.metadata.labels or {},
                    "annotations": role.metadata.annotations or {},
                    "properties": {
                        "rules": rules,
                        "creation_timestamp": role.metadata.creation_timestamp.isoformat() if role.metadata.creation_timestamp else None
                    }
                }
                roles.append(role_data)
                
        except Exception as e:
            logger.error(f"Error collecting roles: {str(e)}")
            
        return roles
    
    async def collect_rolebindings(self) -> List[Dict[str, Any]]:
        """Collect all rolebindings"""
        rolebindings = []
        try:
            rb_list = self.rbac_v1.list_role_binding_for_all_namespaces(watch=False)
            
            for rb in rb_list.items:
                subjects = []
                if rb.subjects:
                    for subject in rb.subjects:
                        subjects.append({
                            "kind": subject.kind,
                            "name": subject.name,
                            "namespace": subject.namespace,
                            "api_group": subject.api_group
                        })
                
                rb_data = {
                    "kind": "RoleBinding",
                    "name": rb.metadata.name,
                    "namespace": rb.metadata.namespace,
                    "labels": rb.metadata.labels or {},
                    "annotations": rb.metadata.annotations or {},
                    "properties": {
                        "role_ref": {
                            "kind": rb.role_ref.kind,
                            "name": rb.role_ref.name,
                            "api_group": rb.role_ref.api_group
                        },
                        "subjects": subjects,
                        "creation_timestamp": rb.metadata.creation_timestamp.isoformat() if rb.metadata.creation_timestamp else None
                    }
                }
                rolebindings.append(rb_data)
                
        except Exception as e:
            logger.error(f"Error collecting rolebindings: {str(e)}")
            
        return rolebindings
    
    async def collect_clusterroles(self) -> List[Dict[str, Any]]:
        """Collect all clusterroles"""
        clusterroles = []
        try:
            cr_list = self.rbac_v1.list_cluster_role(watch=False)
            
            for cr in cr_list.items:
                rules = []
                if cr.rules:
                    for rule in cr.rules:
                        rules.append({
                            "verbs": rule.verbs,
                            "api_groups": rule.api_groups,
                            "resources": rule.resources,
                            "resource_names": rule.resource_names
                        })
                
                cr_data = {
                    "kind": "ClusterRole",
                    "name": cr.metadata.name,
                    "namespace": None,
                    "labels": cr.metadata.labels or {},
                    "annotations": cr.metadata.annotations or {},
                    "properties": {
                        "rules": rules,
                        "creation_timestamp": cr.metadata.creation_timestamp.isoformat() if cr.metadata.creation_timestamp else None
                    }
                }
                clusterroles.append(cr_data)
                
        except Exception as e:
            logger.error(f"Error collecting clusterroles: {str(e)}")
            
        return clusterroles
    
    async def collect_clusterrolebindings(self) -> List[Dict[str, Any]]:
        """Collect all clusterrolebindings"""
        clusterrolebindings = []
        try:
            crb_list = self.rbac_v1.list_cluster_role_binding(watch=False)
            
            for crb in crb_list.items:
                subjects = []
                if crb.subjects:
                    for subject in crb.subjects:
                        subjects.append({
                            "kind": subject.kind,
                            "name": subject.name,
                            "namespace": subject.namespace,
                            "api_group": subject.api_group
                        })
                
                crb_data = {
                    "kind": "ClusterRoleBinding",
                    "name": crb.metadata.name,
                    "namespace": None,
                    "labels": crb.metadata.labels or {},
                    "annotations": crb.metadata.annotations or {},
                    "properties": {
                        "role_ref": {
                            "kind": crb.role_ref.kind,
                            "name": crb.role_ref.name,
                            "api_group": crb.role_ref.api_group
                        },
                        "subjects": subjects,
                        "creation_timestamp": crb.metadata.creation_timestamp.isoformat() if crb.metadata.creation_timestamp else None
                    }
                }
                clusterrolebindings.append(crb_data)
                
        except Exception as e:
            logger.error(f"Error collecting clusterrolebindings: {str(e)}")
            
        return clusterrolebindings
    
    async def collect_serviceaccounts(self) -> List[Dict[str, Any]]:
        """Collect all serviceaccounts"""
        serviceaccounts = []
        try:
            sa_list = self.core_v1.list_service_account_for_all_namespaces(watch=False)
            
            for sa in sa_list.items:
                sa_data = {
                    "kind": "ServiceAccount",
                    "name": sa.metadata.name,
                    "namespace": sa.metadata.namespace,
                    "labels": sa.metadata.labels or {},
                    "annotations": sa.metadata.annotations or {},
                    "properties": {
                        "secrets": [s.name for s in sa.secrets] if sa.secrets else [],
                        "image_pull_secrets": [s.name for s in sa.image_pull_secrets] if sa.image_pull_secrets else [],
                        "creation_timestamp": sa.metadata.creation_timestamp.isoformat() if sa.metadata.creation_timestamp else None
                    }
                }
                serviceaccounts.append(sa_data)
                
        except Exception as e:
            logger.error(f"Error collecting serviceaccounts: {str(e)}")
            
        return serviceaccounts