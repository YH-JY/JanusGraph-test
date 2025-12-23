import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Spin, Alert, Typography } from 'antd';
import {
  DatabaseOutlined,
  CloudOutlined,
  ShareAltOutlined,
  ReloadOutlined,
  SecurityScanOutlined
} from '@ant-design/icons';
import { getGraphStats, collectAssets, checkHealth } from '../services/api';
import { HealthStatus, GraphStats } from '../types';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthData, statsData] = await Promise.all([
        checkHealth(),
        getGraphStats()
      ]);
      setHealth(healthData);
      setStats(statsData);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  // Collect assets from K8s
  const handleCollectAssets = async () => {
    try {
      setCollecting(true);
      const result = await collectAssets();
      setMessage({ type: 'success', text: 'Assets collected successfully' });
      // Refresh stats after collection
      fetchData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to collect assets' });
    } finally {
      setCollecting(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      
      {message && (
        <Alert
          message={message.text}
          type={message.type}
          showIcon
          closable
          onClose={() => setMessage(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Health Status */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="JanusGraph Status"
              value={health?.janusgraph_connected ? 'Connected' : 'Disconnected'}
              valueStyle={{ 
                color: health?.janusgraph_connected ? '#52c41a' : '#ff4d4f' 
              }}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="K8s Cluster Status"
              value={health?.k8s_connected ? 'Connected' : 'Disconnected'}
              valueStyle={{ 
                color: health?.k8s_connected ? '#52c41a' : '#ff4d4f' 
              }}
              prefix={<CloudOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Assets"
              value={stats?.vertex_count || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ShareAltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Relationships"
              value={stats?.edge_count || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SecurityScanOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Asset Type Distribution */}
      {stats?.label_counts && (
        <Card title="Asset Distribution" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {Object.entries(stats.label_counts).map(([type, count]) => (
              <Col xs={12} sm={8} md={6} key={type}>
                <Card size="small" className="dashboard-card">
                  <Statistic
                    title={type}
                    value={count}
                    valueStyle={{ 
                      fontSize: '24px',
                      color: '#1890ff'
                    }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Actions */}
      <Card title="Actions">
        <Button
          type="primary"
          icon={<CloudOutlined />}
          loading={collecting}
          onClick={handleCollectAssets}
          style={{ marginRight: 16 }}
        >
          Collect K8s Assets
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh Dashboard
        </Button>
      </Card>
    </div>
  );
};

export default Dashboard;