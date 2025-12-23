from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import yaml
import os
from contextlib import asynccontextmanager

from services.janusgraph_client import JanusGraphClient
from services.k8s_collector import K8sCollector
from services.graph_builder import GraphBuilder
from models.schemas import AssetResponse, QueryRequest, QueryResponse

# 加载配置
with open("../config/config.yaml", "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

# 全局变量
janusgraph_client = None
k8s_collector = None
graph_builder = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    global janusgraph_client, k8s_collector, graph_builder
    
    # Initialize JanusGraph client
    janusgraph_client = JanusGraphClient(
        host=config["janusgraph"]["host"],
        port=config["janusgraph"]["port"],
        graph_name=config["janusgraph"]["graph_name"]
    )
    
    # Initialize K8s collector
    k8s_collector = K8sCollector(
        kubeconfig_path=os.path.expanduser(config["kubernetes"]["kubeconfig_path"]),
        in_cluster=config["kubernetes"]["in_cluster"]
    )
    
    # Initialize graph builder
    graph_builder = GraphBuilder(janusgraph_client)
    
    yield
    
    # Shutdown
    if janusgraph_client:
        janusgraph_client.close()

# Create FastAPI app
app = FastAPI(
    title="JanusGraph K8s Platform",
    description="Platform for collecting and visualizing K8s assets in JanusGraph",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (optional)
frontend_build_path = "../frontend/build"
if os.path.exists(frontend_build_path):
    app.mount("/static", StaticFiles(directory=frontend_build_path), name="static")

# API Routes

@app.get("/")
async def root():
    return {"message": "JanusGraph K8s Platform API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "janusgraph_connected": janusgraph_client.is_connected() if janusgraph_client else False,
        "k8s_connected": k8s_collector.is_connected() if k8s_collector else False
    }

@app.post("/collect")
async def collect_k8s_assets():
    """Collect assets from Kubernetes cluster"""
    try:
        if not k8s_collector:
            raise HTTPException(status_code=500, detail="K8s collector not initialized")
        
        # Collect all configured resources
        assets = await k8s_collector.collect_all_resources()
        
        # Import to JanusGraph
        if graph_builder:
            result = await graph_builder.import_assets(assets)
            return {"message": "Assets collected and imported successfully", "result": result}
        else:
            return {"message": "Assets collected successfully", "assets": assets}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/assets", response_model=List[AssetResponse])
async def get_assets(asset_type: Optional[str] = None):
    """Get assets from JanusGraph"""
    try:
        if not janusgraph_client:
            raise HTTPException(status_code=500, detail="JanusGraph client not initialized")
        
        assets = await janusgraph_client.get_assets(asset_type)
        return assets
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse)
async def query_graph(request: QueryRequest):
    """Query the graph for attack paths"""
    try:
        if not janusgraph_client:
            raise HTTPException(status_code=500, detail="JanusGraph client not initialized")
        
        result = await janusgraph_client.execute_query(request.query)
        return QueryResponse(data=result, total=len(result) if result else 0)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attack-paths")
async def get_attack_paths(source: Optional[str] = None, target: Optional[str] = None):
    """Get attack paths between nodes"""
    try:
        if not janusgraph_client:
            raise HTTPException(status_code=500, detail="JanusGraph client not initialized")
        
        paths = await janusgraph_client.find_attack_paths(source, target)
        return {"paths": paths}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/graph/stats")
async def get_graph_stats():
    """Get graph statistics"""
    try:
        if not janusgraph_client:
            raise HTTPException(status_code=500, detail="JanusGraph client not initialized")
        
        stats = await janusgraph_client.get_graph_stats()
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/graph")
async def clear_graph():
    """Clear all data from the graph"""
    try:
        if not janusgraph_client:
            raise HTTPException(status_code=500, detail="JanusGraph client not initialized")
        
        result = await janusgraph_client.clear_graph()
        return {"message": "Graph cleared successfully", "result": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config["api"]["host"],
        port=config["api"]["port"],
        reload=config["api"]["debug"]
    )