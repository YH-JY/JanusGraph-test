import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  Space, 
  Typography, 
  List, 
  Tag, 
  Alert, 
  Spin, 
  Timeline,
  Drawer,
  Descriptions,
  message
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SecurityScanOutlined
} from '@ant-design/icons';
import { getAttackPaths, getAssets } from '../services/api';
import { AttackPath, AttackStep, Asset } from '../types';

const { Title } = Typography;
const { Option } = Select;

const AttackPaths: React.FC = () => {
  const [attackPaths, setAttackPaths] = useState<AttackPath[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<AttackPath | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sourceAsset, setSourceAsset] = useState<string>('');
  const [targetAsset, setTargetAsset] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch assets for selection
  const fetchAssets = async () => {
    try {
      const data = await getAssets();
      setAssets(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to fetch assets' });
    }
  };

  // Fetch attack paths
  const fetchAttackPaths = async (source?: string, target?: string) => {
    try {
      setLoading(true);
      const data = await getAttackPaths(source, target);
      setAttackPaths(data.paths || []);
      
      if (data.paths && data.paths.length > 0) {
        setMessage({ 
          type: 'success', 
          text: `Found ${data.paths.length} attack path(s)` 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'No attack paths found between specified assets' 
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch attack paths' });
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    const source = sourceAsset || undefined;
    const target = targetAsset || undefined;
    fetchAttackPaths(source, target);
  };

  // Get risk level color
  const getRiskColor = (level: string): string => {
    const colorMap: Record<string, string> = {
      'LOW': '#52c41a',
      'MEDIUM': '#fa8c16',
      'HIGH': '#ff7300',
      'CRITICAL': '#ff4d4f'
    };
    return colorMap[level] || '#d9d9d9';
  };


  // View path details
  const handleViewPathDetails = (path: AttackPath) => {
    setSelectedPath(path);
    setDrawerVisible(true);
  };



  // Initial data fetch
  useEffect(() => {
    fetchAssets();
    // Fetch all attack paths initially
    fetchAttackPaths();
  }, []);

  return (
    <div>
      <Title level={2}>
        <SecurityScanOutlined /> Attack Path Analysis
      </Title>

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

      {/* Search Controls */}
      <Card title="Search Attack Paths" style={{ marginBottom: 24 }}>
        <Space wrap style={{ width: '100%' }}>
          <Select
            placeholder="Select Source Asset (optional)"
            value={sourceAsset}
            onChange={setSourceAsset}
            style={{ width: 300 }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {assets.map(asset => (
              <Option key={asset.id} value={asset.name}>
                {asset.name} ({asset.kind})
              </Option>
            ))}
          </Select>
          
          <Select
            placeholder="Select Target Asset (optional)"
            value={targetAsset}
            onChange={setTargetAsset}
            style={{ width: 300 }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {assets.map(asset => (
              <Option key={asset.id} value={asset.name}>
                {asset.name} ({asset.kind})
              </Option>
            ))}
          </Select>
          
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            disabled={loading}
          >
            Search Paths
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchAttackPaths()}
            disabled={loading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Attack Path Statistics */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large">
          <div>
            <strong>Total Paths Found:</strong> {attackPaths.length}
          </div>
          <div>
            <strong>Critical Paths:</strong> 
            <Tag color="red">
              {attackPaths.filter(p => p.total_risk === 'CRITICAL').length}
            </Tag>
          </div>
          <div>
            <strong>High Risk Paths:</strong> 
            <Tag color="orange">
              {attackPaths.filter(p => p.total_risk === 'HIGH').length}
            </Tag>
          </div>
        </Space>
      </Card>

      {/* Attack Paths List */}
      <Card title="Attack Paths">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : attackPaths.length === 0 ? (
          <Alert
            message="No Attack Paths Found"
            description="Try adjusting your search criteria or ensure assets are collected in the graph."
            type="info"
            showIcon
          />
        ) : (
          <List
            dataSource={attackPaths}
            renderItem={(path) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewPathDetails(path)}
                  >
                    View Details
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>Path {path.id}</span>
                      <Tag color={getRiskColor(path.total_risk)}>
                        {path.total_risk}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Source:</strong> {path.source} → <strong>Target:</strong> {path.target}
                      </div>
                      <div>
                        <strong>Likelihood:</strong> 
                        <Tag color={path.likelihood > 0.7 ? 'red' : path.likelihood > 0.3 ? 'orange' : 'green'}>
                          {(path.likelihood * 100).toFixed(1)}%
                        </Tag>
                        <span style={{ marginLeft: 16 }}>
                          <strong>Steps:</strong> {path.steps.length}
                        </span>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Path Details Drawer */}
      <Drawer
        title={`Attack Path Details: ${selectedPath?.id}`}
        width={700}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedPath && (
          <div>
            <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Path ID">{selectedPath.id}</Descriptions.Item>
              <Descriptions.Item label="Source Asset">{selectedPath.source}</Descriptions.Item>
              <Descriptions.Item label="Target Asset">{selectedPath.target}</Descriptions.Item>
              <Descriptions.Item label="Overall Risk">
                <Tag color={getRiskColor(selectedPath.total_risk)}>
                  {selectedPath.total_risk}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Likelihood">
                {(selectedPath.likelihood * 100).toFixed(1)}%
              </Descriptions.Item>
              <Descriptions.Item label="Total Steps">{selectedPath.steps.length}</Descriptions.Item>
            </Descriptions>

            <Title level={4}>Attack Steps</Title>
            <Timeline>
              {selectedPath.steps.map((step, index) => (
                <Timeline.Item
                  key={index}
                  color={getRiskColor(step.risk_level)}
                  dot={
                    <Tag color={getRiskColor(step.risk_level)}>
                      {step.risk_level}
                    </Tag>
                  }
                >
                  <div className={`attack-step ${step.risk_level.toLowerCase()}-risk`}>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Step {index + 1}:</strong> {step.node_name}
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        {step.node_type}
                      </Tag>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Description:</strong> {step.description}
                    </div>
                    {step.exploited_vulnerability && (
                      <div>
                        <strong>Exploited Vulnerability:</strong> 
                        <Tag color="red">{step.exploited_vulnerability}</Tag>
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>

            {/* Attack Path Visualization Hint */}
            <Alert
              message="Visualization Tip"
              description="You can view this attack path in the Graph Visualization page by selecting the source and target nodes."
              type="info"
              showIcon
              style={{ marginTop: 24 }}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AttackPaths;