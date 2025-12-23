from gremlin_python.driver import client, serializer
from gremlin_python.process.anonymous_traversal import traversal
from gremlin_python.process.graph_traversal import __
from gremlin_python.structure.graph import Graph
import asyncio
import logging
from typing import List, Dict, Optional, Any
import json

logger = logging.getLogger(__name__)


class JanusGraphClient:
    def __init__(self, host: str, port: int, graph_name: str):
        self.host = host
        self.port = port
        self.graph_name = graph_name
        self.client = None
        self.g = None

    async def connect(self):
        """Connect to JanusGraph server"""
        try:
            # Create connection to JanusGraph
            self.client = client.Client(
                f'ws://{self.host}:{self.port}/gremlin',
                'g',
                username="",
                password="",
                message_serializer=serializer.GraphSONSerializersV3d0()
            )

            # Create graph traversal source
            self.g = traversal().withRemote(self.client)

            # Test connection
            await self.g.V().limit(1).toList()
            logger.info(f"Connected to JanusGraph at {self.host}:{self.port}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to JanusGraph: {str(e)}")
            return False

    def is_connected(self):
        """Check if connected to JanusGraph"""
        return self.client is not None

    async def close(self):
        """Close the connection"""
        if self.client:
            await self.client.close()

    async def create_vertex(self, label: str, properties: Dict[str, Any]) -> str:
        """Create a vertex in the graph"""
        try:
            # Create traversal
            t = self.g.addV(label)

            # Add properties
            for key, value in properties.items():
                if value is not None:
                    t = t.property(key, str(value))

            # Execute and get the vertex ID
            result = await t.next()
            return str(result)

        except Exception as e:
            logger.error(f"Error creating vertex: {str(e)}")
            raise

    async def create_edge(self, source_id: str, target_id: str, label: str,
                          properties: Dict[str, Any] = None) -> str:
        """Create an edge between two vertices"""
        try:
            # Create traversal
            t = self.g.V(source_id).addE(label).to(__.V(target_id))

            # Add properties if provided
            if properties:
                for key, value in properties.items():
                    if value is not None:
                        t = t.property(key, str(value))

            # Execute and get the edge ID
            result = await t.next()
            return str(result)

        except Exception as e:
            logger.error(f"Error creating edge: {str(e)}")
            raise

    async def get_vertices_by_label(self, label: str) -> List[Dict[str, Any]]:
        """Get all vertices with a specific label"""
        try:
            vertices = await self.g.V().hasLabel(label).elementMap().toList()
            return vertices

        except Exception as e:
            logger.error(f"Error getting vertices by label: {str(e)}")
            raise

    async def get_vertices_by_property(self, key: str, value: str) -> List[Dict[str, Any]]:
        """Get vertices by property key-value pair"""
        try:
            vertices = await self.g.V().has(key, value).elementMap().toList()
            return vertices

        except Exception as e:
            logger.error(f"Error getting vertices by property: {str(e)}")
            raise

    async def get_vertex_neighbors(self, vertex_id: str, direction: str = "both") -> List[Dict[str, Any]]:
        """Get neighboring vertices of a vertex"""
        try:
            if direction == "out":
                vertices = await self.g.V(vertex_id).out().elementMap().toList()
            elif direction == "in":
                vertices = await self.g.V(vertex_id).inE().inV().elementMap().toList()
            else:
                vertices = await self.g.V(vertex_id).both().elementMap().toList()

            return vertices

        except Exception as e:
            logger.error(f"Error getting vertex neighbors: {str(e)}")
            raise

    async def get_attack_paths(self, source: Optional[str] = None,
                               target: Optional[str] = None) -> List[List[Dict[str, Any]]]:
        """Find attack paths between nodes"""
        try:
            # Base query for attack paths
            if source and target:
                # Find paths between specific source and target
                paths = await self.g.V().has("name", source).repeat(
                    __.outE().inV()
                ).until(__.has("name", target)).path().by("name").limit(10).toList()
            else:
                # Find critical attack paths (e.g., from internet to sensitive resources)
                paths = await self.g.V().has("exposed", "true").repeat(
                    __.outE().inV()
                ).until(__.has("sensitive", "true")).path().by("name").limit(20).toList()

            return paths

        except Exception as e:
            logger.error(f"Error finding attack paths: {str(e)}")
            raise

    async def execute_query(self, gremlin_query: str) -> List[Dict[str, Any]]:
        """Execute a custom Gremlin query"""
        try:
            # Execute the query
            result = await self.client.submitAsync(gremlin_query)
            results = await result.all()

            return results

        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise

    async def get_assets(self, asset_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get assets from the graph"""
        try:
            if asset_type:
                vertices = await self.g.V().hasLabel(asset_type).elementMap().toList()
            else:
                vertices = await self.g.V().elementMap().toList()

            # Format the results
            assets = []
            for v in vertices:
                asset = {
                    "id": str(v.get("id", "")),
                    "name": v.get("name", ""),
                    "namespace": v.get("namespace", None),
                    "kind": v.get("label", "Unknown"),
                    "properties": v
                }
                assets.append(asset)

            return assets

        except Exception as e:
            logger.error(f"Error getting assets: {str(e)}")
            raise

    async def get_graph_stats(self) -> Dict[str, Any]:
        """Get graph statistics"""
        try:
            vertex_count = await self.g.V().count().next()
            edge_count = await self.g.E().count().next()

            # Count by vertex label
            label_counts = {}
            for label in ["Pod", "Service", "Deployment", "Namespace", "Node",
                          "Secret", "ConfigMap", "Role", "RoleBinding", "ClusterRole",
                          "ClusterRoleBinding", "ServiceAccount"]:
                count = await self.g.V().hasLabel(label).count().next()
                label_counts[label] = count

            return {
                "vertex_count": vertex_count,
                "edge_count": edge_count,
                "label_counts": label_counts
            }

        except Exception as e:
            logger.error(f"Error getting graph stats: {str(e)}")
            raise

    async def clear_graph(self) -> Dict[str, Any]:
        """Clear all data from the graph"""
        try:
            # Drop all edges first
            edge_count = await self.g.E().count().next()
            await self.g.E().drop().iterate()

            # Drop all vertices
            vertex_count = await self.g.V().count().next()
            await self.g.V().drop().iterate()

            return {
                "vertices_deleted": vertex_count,
                "edges_deleted": edge_count
            }

        except Exception as e:
            logger.error(f"Error clearing graph: {str(e)}")
            raise

    async def search_nodes(self, search_term: str) -> List[Dict[str, Any]]:
        """Search nodes by name or properties"""
        try:
            # Search by name containing the search term
            vertices = await self.g.V().where(
                __.values("name").where(__.textContains(search_term))
            ).elementMap().limit(100).toList()

            return vertices

        except Exception as e:
            logger.error(f"Error searching nodes: {str(e)}")
            raise