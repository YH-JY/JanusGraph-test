import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Space, 
  Typography, 
  Alert,
  Spin,
  Table,
  Tag,
  List,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  ClearOutlined,
  CopyOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { queryGraph } from '../services/api';
import { QueryRequest } from '../types';

const { Title } = Typography;
const { TextArea } = Input;

const QueryInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  // Example queries
  const exampleQueries = [
    {
      name: 'Get all vertices',
      query: 'g.V().limit(10).toList()'
    },
    {
      name: 'Count vertices by label',
      query: 'g.V().groupCount().by(label).next()'
    },
    {
      name: 'Find all pods',
      query: 'g.V().hasLabel("Pod").valueMap(true).toList()'
    },
    {
      name: 'Find exposed services',
      query: 'g.V().hasLabel("Service").has("type", "LoadBalancer").valueMap(true).toList()'
    },
    {
      name: 'Count all edges',
      query: 'g.E().count().next()'
    },
    {
      name: 'Find paths between nodes',
      query: 'g.V().has("name", "my-pod").repeat(out()).until(has("name", "my-service")).path().by("name").limit(5).toList()'
    },
    {
      name: 'Get node degrees',
      query: 'g.V().group().by("name").by(both().count()).next()'
    }
  ];

  // Execute query
  const executeQuery = async () => {
    if (!query.trim()) {
      message.error('Please enter a Gremlin query');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const queryRequest: QueryRequest = {
        query: query.trim(),
        parameters: {}
      };
      
      const response = await queryGraph(queryRequest);
      setResults(response);
      
      // Add to history
      if (!queryHistory.includes(query)) {
        setQueryHistory([query, ...queryHistory.slice(0, 9)]);
      }
      
      message.success(`Query executed successfully. Returned ${response.total} results.`);
    } catch (err: any) {
      setError(err.message || 'Failed to execute query');
      message.error('Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  // Clear results
  const clearResults = () => {
    setResults(null);
    setError(null);
  };

  // Copy query to clipboard
  const copyQuery = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Query copied to clipboard');
  };

  // Load example query
  const loadExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  // Format results for display
  const formatResults = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    // Handle different result types
    const firstItem = data[0];
    
    if (typeof firstItem === 'object' && firstItem !== null) {
      // Complex object - create table
      const columns = Object.keys(firstItem).map(key => ({
        title: key,
        dataIndex: key,
        key,
        render: (value: any) => {
          if (typeof value === 'object') {
            return <pre>{JSON.stringify(value, null, 2)}</pre>;
          }
          return String(value);
        }
      }));
      
      return {
        type: 'table',
        columns,
        dataSource: data.map((item, index) => ({ key: index, ...item }))
      };
    } else {
      // Simple values - create key-value pairs
      return {
        type: 'simple',
        data: data.map((item, index) => ({
          key: index,
          index: index + 1,
          value: typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
        }))
      };
    }
  };

  const formattedResults = results ? formatResults(results.data) : null;

  return (
    <div>
      <Title level={2}>Gremlin Query Interface</Title>

      <Alert
        message="Gremlin Query Console"
        description="Execute Gremlin queries against the JanusGraph database. Use the example queries below or write your own."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Query Editor */}
      <Card title="Query Editor" style={{ marginBottom: 24 }}>
        <TextArea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your Gremlin query here..."
          rows={4}
          style={{ fontFamily: 'monospace', marginBottom: 16 }}
        />
        
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={executeQuery}
            loading={loading}
          >
            Execute Query
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={clearResults}
          >
            Clear Results
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => copyQuery(query)}
            disabled={!query}
          >
            Copy Query
          </Button>
        </Space>
      </Card>

      {/* Example Queries */}
      <Card title="Example Queries" style={{ marginBottom: 24 }}>
        <Space wrap>
          {exampleQueries.map((example, index) => (
            <Button
              key={index}
              onClick={() => loadExample(example.query)}
              style={{ textAlign: 'left' }}
            >
              {example.name}
            </Button>
          ))}
        </Space>
      </Card>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <Card 
          title={
            <Space>
              <HistoryOutlined />
              Query History
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <List
            size="small"
            dataSource={queryHistory}
            renderItem={(item: string, index: number) => (
              <List.Item
                actions={[
                  <Button
                    size="small"
                    onClick={() => loadExample(item)}
                  >
                    Load
                  </Button>
                ]}
              >
                <Typography.Text code ellipsis style={{ maxWidth: '80%' }}>
                  {item}
                </Typography.Text>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Results */}
      <Card title="Query Results">
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert
            message="Query Error"
            description={error}
            type="error"
            showIcon
          />
        ) : results ? (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color="blue">
                {results.total} result{results.total !== 1 ? 's' : ''}
              </Tag>
              <Tag color="green">
                Execution Time: {results.execution_time || 'N/A'}
              </Tag>
            </Space>

            {formattedResults?.type === 'table' ? (
              <Table
                columns={formattedResults.columns}
                dataSource={formattedResults.dataSource}
                scroll={{ x: true }}
                size="small"
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true
                }}
              />
            ) : formattedResults?.type === 'simple' ? (
              <Table
                columns={[
                  { title: '#', dataIndex: 'index', key: 'index', width: 80 },
                  { 
                    title: 'Value', 
                    dataIndex: 'value', 
                    key: 'value',
                    render: (value) => (
                      <Typography.Text code>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          margin: 0
                        }}>
                          {value}
                        </pre>
                      </Typography.Text>
                    )
                  }
                ]}
                dataSource={formattedResults.data}
                scroll={{ x: true }}
                size="small"
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true
                }}
              />
            ) : (
              <Alert
                message="No Results"
                description="The query executed successfully but returned no results."
                type="info"
              />
            )}
          </div>
        ) : (
          <Alert
            message="No Results"
            description="Execute a query to see results here."
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );
};

export default QueryInterface;