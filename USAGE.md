# JanusGraph Kubernetes Platform - 使用指南

## 概述

这是一个用于收集、存储和可视化Kubernetes集群云原生资产的平台，通过JanusGraph图数据库存储资产关系，并提供攻击路径分析功能。

## 功能特性

1. **资产收集**：从Kubernetes集群自动收集各种资源信息
2. **图数据存储**：使用JanusGraph存储资产及其关系
3. **可视化展示**：交互式图可视化界面
4. **攻击路径分析**：分析潜在的攻击路径和安全风险
5. **Gremlin查询**：直接使用Gremlin查询语言查询图数据

## 快速开始

### 前置条件

1. 运行的JanusGraph服务器（Docker部署在192.168.40.129:8182）
2. 配置好的kubectl访问权限
3. Python 3.8+ 和 Node.js 16+
4. 3000和8000端口可用

### 安装和启动

#### 方式1：使用启动脚本（推荐）

```bash
# 进入项目目录
cd janusgraph-k8s-platform

# 运行启动脚本
./start.sh
```

#### 方式2：分别启动

**启动后端服务：**
```bash
cd backend
pip3 install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**启动前端服务：**
```bash
cd frontend
npm install
npm start
```

#### 方式3：使用Docker

```bash
# 使用Docker Compose启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 访问平台

- **前端界面**：http://localhost:3000
- **后端API**：http://localhost:8000
- **API文档**：http://localhost:8000/docs

## 使用说明

### 1. 仪表板（Dashboard）

- 查看系统健康状态
- 查看资产统计信息
- 触发资产收集

### 2. 资产管理（Assets）

- 浏览所有收集的K8s资产
- 按类型、名称、命名空间筛选
- 查看资产详细信息

### 3. 图可视化（Graph Visualization）

- 可视化K8s资产关系图
- 支持缩放、拖拽操作
- 点击节点查看详细信息
- 调整可视化参数

### 4. 攻击路径分析（Attack Paths）

- 分析潜在的攻击路径
- 选择源和目标节点
- 查看路径风险等级
- 了解攻击步骤

### 5. Gremlin查询（Query Interface）

- 执行自定义Gremlin查询
- 查询历史记录
- 示例查询模板

## 配置说明

配置文件位于 `config/config.yaml`：

```yaml
# JanusGraph配置
janusgraph:
  host: "192.168.40.129"
  port: 8182
  graph_name: "k8s_assets"

# Kubernetes配置
kubernetes:
  kubeconfig_path: "~/.kube/config"
  in_cluster: false

# API配置
api:
  host: "0.0.0.0"
  port: 8000
  debug: true
```

## 支持的K8s资源类型

- Pods
- Services
- Deployments
- Namespaces
- Nodes
- Ingress
- Secrets
- ConfigMaps
- Roles
- RoleBindings
- ClusterRoles
- ClusterRoleBindings
- ServiceAccounts

## 数据关系说明

平台会自动创建以下关系：

- Pod → Node (运行在节点上)
- Pod → ServiceAccount (使用的服务账户)
- Service → Pod (选择器关系)
- Deployment → Pod (管理关系)
- RBAC相关关系（角色绑定、权限授予等）
- 资源与命名空间的从属关系

## 故障排除

### 常见问题

1. **无法连接JanusGraph**
   - 检查JanusGraph服务是否运行
   - 确认网络连通性
   - 验证配置文件中的主机和端口

2. **无法访问K8s集群**
   - 检查kubeconfig文件路径
   - 确认集群访问权限
   - 验证当前上下文

3. **前端无法访问后端**
   - 检查后端服务是否启动
   - 确认端口配置
   - 检查CORS设置

4. **数据收集失败**
   - 检查集群权限
   - 查看后端日志
   - 确认资源类型配置

### 日志查看

**开发模式：**
- 后端日志：控制台输出
- 前端日志：浏览器开发者工具

**Docker模式：**
```bash
docker-compose logs backend
docker-compose logs frontend
```

## API文档

详细的API文档可通过 http://localhost:8000/docs 查看，包括：

- `/health` - 健康检查
- `/collect` - 收集K8s资产
- `/assets` - 获取资产列表
- `/query` - 执行Gremlin查询
- `/attack-paths` - 获取攻击路径
- `/graph/stats` - 图统计信息

## 扩展开发

### 添加新的K8s资源类型

1. 在 `backend/services/k8s_collector.py` 中添加收集方法
2. 在 `backend/services/graph_builder.py` 中添加关系定义
3. 更新前端类型定义

### 自定义攻击路径算法

修改 `backend/services/janusgraph_client.py` 中的 `get_attack_paths` 方法

### 扩展可视化功能

修改 `frontend/src/pages/GraphVisualization.tsx` 添加新的可视化特性

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License

## 支持

如有问题或建议，请创建Issue或联系维护团队。