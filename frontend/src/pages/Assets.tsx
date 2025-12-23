import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Tag, 
  Button, 
  Input, 
  Select, 
  Space, 
  Typography, 
  Collapse, 
  Drawer,
  Descriptions,
  Spin,
  Alert
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  EyeOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { getAssets } from '../services/api';
import { Asset } from '../types';

const { Title } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Asset types for filtering
  const assetTypes = [
    'Pod', 'Service', 'Deployment', 'Namespace', 'Node',
    'Secret', 'ConfigMap', 'Role', 'RoleBinding', 'ClusterRole',
    'ClusterRoleBinding', 'ServiceAccount', 'Ingress'
  ];

  // Fetch assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await getAssets();
      setAssets(data);
      setFilteredAssets(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch assets' });
    } finally {
      setLoading(false);
    }
  };

  // Filter assets
  useEffect(() => {
    let filtered = assets;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => asset.kind === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.namespace?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
  }, [assets, searchTerm, selectedType]);

  // Initial fetch
  useEffect(() => {
    fetchAssets();
  }, []);

  // Handle asset details view
  const handleViewDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setDrawerVisible(true);
  };

  // Get color for asset type tag
  const getAssetTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'Pod': 'blue',
      'Service': 'purple',
      'Deployment': 'green',
      'Namespace': 'gold',
      'Node': 'red',
      'Secret': 'magenta',
      'ConfigMap': 'orange',
      'Role': 'cyan',
      'RoleBinding': 'pink',
      'ClusterRole': 'skyblue',
      'ClusterRoleBinding': 'purple',
      'ServiceAccount': 'lime',
      'Ingress': 'geekblue'
    };
    return colorMap[type] || 'default';
  };

  return (
    <div>
      <Title level={2}>Assets</Title>
      
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

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Input
            placeholder="Search assets..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ width: 200 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">All Types</Option>
            {assetTypes.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchAssets}
            disabled={loading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Asset Statistics */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large">
          <div>
            <strong>Total Assets:</strong> {assets.length}
          </div>
          <div>
            <strong>Filtered:</strong> {filteredAssets.length}
          </div>
        </Space>
      </Card>

      {/* Asset List */}
      <Card title="Assets List">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : (
          <List
            dataSource={filteredAssets}
            renderItem={(asset) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetails(asset)}
                  >
                    View Details
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{asset.name}</span>
                      <Tag color={getAssetTypeColor(asset.kind)}>
                        {asset.kind}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      {asset.namespace && (
                        <Tag>Namespace: {asset.namespace}</Tag>
                      )}
                      <Tag>Created: {new Date(asset.created_at).toLocaleString()}</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Asset Details Drawer */}
      <Drawer
        title={`Asset Details: ${selectedAsset?.name}`}
        width={600}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedAsset && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Name">{selectedAsset.name}</Descriptions.Item>
              <Descriptions.Item label="Kind">
                <Tag color={getAssetTypeColor(selectedAsset.kind)}>
                  {selectedAsset.kind}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Namespace">
                {selectedAsset.namespace || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {new Date(selectedAsset.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            {/* Labels */}
            {selectedAsset.labels && Object.keys(selectedAsset.labels).length > 0 && (
              <Collapse style={{ marginTop: 24 }}>
                <Panel header="Labels" key="labels">
                  <Descriptions bordered column={1}>
                    {Object.entries(selectedAsset.labels).map(([key, value]) => (
                      <Descriptions.Item key={key} label={key}>
                        {value}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Panel>
              </Collapse>
            )}

            {/* Annotations */}
            {selectedAsset.annotations && Object.keys(selectedAsset.annotations).length > 0 && (
              <Collapse style={{ marginTop: 24 }}>
                <Panel header="Annotations" key="annotations">
                  <Descriptions bordered column={1}>
                    {Object.entries(selectedAsset.annotations).map(([key, value]) => (
                      <Descriptions.Item key={key} label={key}>
                        {value}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Panel>
              </Collapse>
            )}

            {/* Properties */}
            {selectedAsset.properties && Object.keys(selectedAsset.properties).length > 0 && (
              <Collapse style={{ marginTop: 24 }}>
                <Panel header="Properties" key="properties">
                  <Descriptions bordered column={1}>
                    {Object.entries(selectedAsset.properties).map(([key, value]) => (
                      <Descriptions.Item key={key} label={key}>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Panel>
              </Collapse>
            )}

            {/* Relationships */}
            {selectedAsset.relationships && selectedAsset.relationships.length > 0 && (
              <Collapse style={{ marginTop: 24 }}>
                <Panel header="Relationships" key="relationships">
                  <List
                    dataSource={selectedAsset.relationships}
                    renderItem={(rel, index) => (
                      <List.Item key={index}>
                        <List.Item.Meta
                          title={rel.type}
                          description={`Connected to: ${rel.target}`}
                        />
                      </List.Item>
                    )}
                  />
                </Panel>
              </Collapse>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Assets;