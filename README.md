# JanusGraph Kubernetes 平台

一个用于从Kubernetes集群收集云原生资产，导入到JanusGraph数据库中，并可视化攻击路径的Web平台。

## 功能特性

- 连接Kubernetes集群并收集资产信息
- 将云原生资产导入到JanusGraph数据库
- 查询和可视化带攻击路径分析的图数据
- 基于Web的交互式探索界面

## 架构设计

- **后端**: Python FastAPI 与 JanusGraph 客户端
- **前端**: React 配合 D3.js 进行图可视化
- **数据库**: JanusGraph (已通过Docker部署)

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

# 如果有依赖冲突，建议使用虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**启动前端服务：**
```bash
cd frontend
npm install
npm start
```

**解决依赖问题：**
如果遇到依赖版本冲突，可以尝试：
```bash
# 升级pip
pip install --upgrade pip

# 清理缓存
pip cache purge

# 使用虚拟环境（推荐）
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 访问平台

## 配置说明

在 `config/config.yaml` 中更新您的配置:
- JanusGraph服务器地址 (192.168.40.129:8182)
- Kubernetes集群连接详情

## 部署说明

详细的部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)，包含：

1. **本地开发部署** - 适合开发测试
2. **Docker容器化部署** - 适合生产环境
3. **Kubernetes集群部署** - 适合集群内部署
4. **云端部署** - 适合云服务器部署
5. **安全配置** - API认证和RBAC权限
6. **监控和备份** - 完整的运维指南
7. **故障恢复** - 服务和数据恢复方案