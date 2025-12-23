# 部署说明

## 概述

JanusGraph Kubernetes平台支持多种部署方式，适应不同的使用场景和环境需求。

## 部署方式

### 方式一：本地开发部署（推荐）

这种部署方式适合开发、测试和学习使用。

#### 前置条件

1. **系统要求**
   - Python 3.8 或更高版本
   - Node.js 16 或更高版本
   - npm 或 yarn 包管理器
   - Git

2. **外部依赖**
   - 运行中的 JanusGraph 服务器（您已部署在 192.168.40.129:8182）
   - 可访问的 Kubernetes 集群
   - 配置好的 kubectl 命令行工具

3. **网络要求**
   - 本地端口 3000 和 8000 可用
   - 能够访问 JanusGraph 服务器的网络连接
   - 能够访问 Kubernetes API 端点的网络权限

#### 部署步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/YH-JY/JanusGraph-test.git
   cd JanusGraph-test
   ```

2. **配置系统**
   
   a) **配置 JanusGraph 连接**
   ```yaml
   # 编辑 config/config.yaml
   janusgraph:
     host: "192.168.40.129"  # 您的 JanusGraph 服务器地址
     port: 8182
     graph_name: "k8s_assets"
   ```
   
   b) **配置 Kubernetes 访问**
   ```yaml
   kubernetes:
     kubeconfig_path: "~/.kube/config"  # 您的 kubeconfig 文件路径
     in_cluster: false
   ```

3. **启动服务**
   
   a) **使用启动脚本（最简单）**
   ```bash
   chmod +x start.sh  # 确保脚本可执行
   ./start.sh
   ```
   
   b) **手动启动（适合调试）**
   
   终端1 - 启动后端：
   ```bash
   cd backend
   pip3 install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   
   终端2 - 启动前端：
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **验证部署**
   - 前端界面：http://localhost:3000
   - API 文档：http://localhost:8000/docs
   - 健康检查：http://localhost:8000/health

### 方式二：Docker 容器化部署

适合生产环境或需要隔离部署的场景。

#### 前置条件

1. Docker Engine 20.0+ 和 Docker Compose 2.0+
2. 至少 4GB 可用内存
3. 20GB 可用磁盘空间

#### 部署步骤

1. **构建并启动所有服务**
   ```bash
   docker-compose up -d
   ```

2. **查看服务状态**
   ```bash
   docker-compose ps
   ```

3. **查看日志**
   ```bash
   # 查看所有服务日志
   docker-compose logs -f
   
   # 查看特定服务日志
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

4. **停止服务**
   ```bash
   docker-compose down
   ```

5. **完全清理（包括数据）**
   ```bash
   docker-compose down -v
   ```

### 方式三：Kubernetes 集群内部署

适合在 Kubernetes 集群内部署平台服务。

#### 部署配置

1. **创建命名空间**
   ```bash
   kubectl create namespace janusgraph-platform
   ```

2. **应用配置文件**
   ```yaml
   # k8s-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: janusgraph-platform-backend
     namespace: janusgraph-platform
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: janusgraph-platform-backend
     template:
       metadata:
         labels:
           app: janusgraph-platform-backend
       spec:
         containers:
         - name: backend
           image: your-registry/janusgraph-platform-backend:latest
           ports:
           - containerPort: 8000
           env:
           - name: JANUSGRAPH_HOST
             value: "192.168.40.129"
           - name: JANUSGRAPH_PORT
             value: "8182"
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: janusgraph-platform-backend-service
     namespace: janusgraph-platform
   spec:
     selector:
       app: janusgraph-platform-backend
     ports:
     - port: 8000
       targetPort: 8000
   ```

3. **部署到集群**
   ```bash
   kubectl apply -f k8s-deployment.yaml
   ```

### 方式四：云端部署

适合云服务器部署。

#### AWS 部署示例

1. **EC2 实例配置**
   - 实例类型：t3.medium 或更高
   - 操作系统：Ubuntu 20.04 LTS
   - 安全组：开放 3000、8000、8182 端口

2. **部署脚本**
   ```bash
   #!/bin/bash
   # AWS EC2 部署脚本
   
   # 安装依赖
   sudo apt update && sudo apt install -y python3 python3-pip nodejs npm git
   
   # 克隆代码
   git clone https://github.com/YH-JY/JanusGraph-test.git
   cd JanusGraph-test
   
   # 配置并启动
   ./start.sh
   ```

## 环境变量配置

### 开发环境

```bash
# .env.development
REACT_APP_API_URL=http://localhost:8000
JANUSGRAPH_HOST=192.168.40.129
JANUSGRAPH_PORT=8182
KUBE_CONFIG_PATH=~/.kube/config
```

### 生产环境

```bash
# .env.production
REACT_APP_API_URL=https://your-domain.com/api
JANUSGRAPH_HOST=your-janusgraph-host
JANUSGRAPH_PORT=8182
KUBE_CONFIG_PATH=/etc/kubernetes/config
```

## 安全配置

### 1. API 安全

```yaml
# config/config.yaml
api:
  enable_auth: true
  jwt_secret: "your-secret-key"
  cors_origins:
    - "https://your-domain.com"
    - "https://admin.your-domain.com"
```

### 2. Kubernetes RBAC

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: janusgraph-platform
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: janusgraph-platform
rules:
- apiGroups: [""]
  resources: ["pods", "services", "deployments", "namespaces", "nodes"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: janusgraph-platform
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: janusgraph-platform
subjects:
- kind: ServiceAccount
  name: janusgraph-platform
  namespace: default
```

## 监控和日志

### 1. 日志配置

```yaml
# logging.yaml
logging:
  level: INFO
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  file: "/var/log/janusgraph-platform.log"
  max_size: "100MB"
  backup_count: 5
```

### 2. 监控指标

```yaml
# prometheus.yml
metrics:
  enabled: true
  port: 9090
  path: "/metrics"
  labels:
    service: "janusgraph-platform"
    environment: "production"
```

## 备份策略

### 1. 数据备份

```bash
# 备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/janusgraph"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 导出图数据
curl -X POST http://localhost:8000/graph/export \
  -H "Content-Type: application/json" \
  -o $BACKUP_DIR/graph_backup_$DATE.json

# 压缩备份
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/graph_backup_$DATE.json
```

### 2. 配置备份

```bash
# 配置备份
cp config/config.yaml $BACKUP_DIR/config_$DATE.yaml
cp ~/.kube/config $BACKUP_DIR/kubeconfig_$DATE
```

## 故障恢复

### 1. 服务恢复

```bash
# 服务重启脚本
#!/bin/bash

# 停止服务
docker-compose down

# 清理容器
docker system prune -f

# 重新启动
docker-compose up -d

# 验证服务
sleep 30
curl http://localhost:8000/health
```

### 2. 数据恢复

```bash
# 数据恢复脚本
#!/bin/bash

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# 清空现有数据
curl -X DELETE http://localhost:8000/graph

# 恢复数据
curl -X POST http://localhost:8000/graph/restore \
  -H "Content-Type: application/json" \
  -d @$BACKUP_FILE
```

## 性能优化

### 1. 数据库优化

```yaml
# janusgraph-optimized.yaml
storage:
  backend: "cql"
  # 其他优化配置...
```

### 2. 缓存配置

```yaml
# redis.yaml
cache:
  enabled: true
  host: "redis"
  port: 6379
  ttl: 3600  # 1小时
```

## 维护指南

### 1. 定期维护任务

- **每日**：检查服务健康状态，查看错误日志
- **每周**：清理过期日志，更新依赖包
- **每月**：数据备份，性能评估，安全扫描

### 2. 升级流程

1. **备份数据**
2. **停止服务**
3. **更新代码**
4. **运行迁移脚本**
5. **重启服务**
6. **验证功能**
7. **监控性能**

## 总结

根据您的需求选择合适的部署方式：

- **开发测试** → 方式一：本地开发部署
- **生产环境** → 方式二：Docker容器化部署
- **集群内部** → 方式三：Kubernetes集群部署
- **云端部署** → 方式四：云端部署

每种方式都有详细的配置说明和维护指南，确保平台稳定运行。