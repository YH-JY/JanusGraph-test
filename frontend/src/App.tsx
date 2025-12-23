import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, notification } from 'antd';
import {
  DashboardOutlined,
  CloudOutlined,
  ShareAltOutlined,
  SecurityScanOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import GraphVisualization from './pages/GraphVisualization';
import AttackPaths from './pages/AttackPaths';
import QueryInterface from './pages/QueryInterface';
import { checkHealth } from './services/api';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

// Main App Component
const App: React.FC = () => {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
};

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Check health on component mount
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const status = await checkHealth();
        setHealthStatus(status);
        
        if (status.status !== 'healthy') {
          notification.error({
            message: 'Service Unhealthy',
            description: 'One or more services are not responding. Please check the backend services.',
            duration: 0,
          });
        }
      } catch (error) {
        notification.error({
          message: 'Connection Error',
          description: 'Cannot connect to the backend. Please ensure the API server is running.',
          duration: 0,
        });
      }
    };
    
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Menu items configuration
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/assets',
      icon: <CloudOutlined />,
      label: 'Assets',
    },
    {
      key: '/graph',
      icon: <ShareAltOutlined />,
      label: 'Graph Visualization',
    },
    {
      key: '/attack-paths',
      icon: <SecurityScanOutlined />,
      label: 'Attack Paths',
    },
    {
      key: '/query',
      icon: <DatabaseOutlined />,
      label: 'Query Interface',
    },
  ];

  // Handle menu click
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          {!collapsed && (
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              K8s Platform
            </Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            JanusGraph Kubernetes Platform
          </Title>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 16 }}>System Status:</span>
            <span style={{ 
              color: healthStatus?.status === 'healthy' ? '#52c41a' : '#ff4d4f',
              fontWeight: 'bold'
            }}>
              {healthStatus?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
        </Header>
        <Content style={{ 
          margin: '24px 16px',
          padding: 24,
          background: '#fff',
          minHeight: 280
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/graph" element={<GraphVisualization />} />
            <Route path="/attack-paths" element={<AttackPaths />} />
            <Route path="/query" element={<QueryInterface />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;