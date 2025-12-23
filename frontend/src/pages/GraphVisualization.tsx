import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Card, 
  Button, 
  Space, 
 
  Slider, 
  Typography, 
  Spin, 
  Alert,
  Drawer,
  Descriptions,
  Tag,
  Switch,
  Tooltip,
  message
} from 'antd';
import {
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { getGraphVisualizationData } from '../services/api';
import { GraphNode, GraphEdge, GraphData } from '../types';

const { Title } = Typography;

interface GraphVisualizationProps {}

const GraphVisualization: React.FC<GraphVisualizationProps> = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  // Visualization settings
  const [linkDistance, setLinkDistance] = useState(100);
  const [nodeStrength, setNodeStrength] = useState(-300);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeSizeRange, setNodeSizeRange] = useState([5, 20]);
  
  // D3 references
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge>>();
  const svgRef_d3 = useRef<SVGSVGElement>();
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>();

  // Fetch graph data
  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGraphVisualizationData();
      setGraphData(data);
      message.success('Graph data loaded successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to load graph data');
      message.error('Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize and update visualization
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svg.node()?.getBoundingClientRect().width || 800;
    const height = svg.node()?.getBoundingClientRect().height || 600;

    // Clear previous visualization
    svg.selectAll('*').remove();
    svgRef_d3.current = svg.node()!;

    // Create container group
    const g = svg.append('g');
    gRef.current = g;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(graphData.edges)
        .id(d => d.id)
        .distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(nodeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Create arrow markers
    svg.append('defs')
      .selectAll('marker')
      .data(['arrow'])
      .enter().append('marker')
      .attr('id', d => d)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // Create links
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.edges)
      .enter().append('line')
      .attr('stroke', d => d.color || '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.properties?.weight || 1))
      .attr('marker-end', 'url(#arrow)');

    // Create nodes
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter().append('circle')
      .attr('r', d => {
        const scale = d3.scaleLinear()
          .domain([0, 1])
          .range(nodeSizeRange);
        return scale(d.size ? (d.size / 20) : 0.5);
      })
      .attr('fill', d => d.color || '#1f77b4')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Create labels
    let labels: d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown>;
    if (showLabels) {
      labels = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(graphData.nodes)
        .enter().append('text')
        .text(d => d.label)
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .attr('text-anchor', 'middle')
        .attr('dy', -15);
    }

    // Create tooltips
    nodes.append('title')
      .text(d => `${d.type}: ${d.label}`);

    // Update positions on tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => {
          const sourceNode = d.source as any;
          return sourceNode.x || 0;
        })
        .attr('y1', d => {
          const sourceNode = d.source as any;
          return sourceNode.y || 0;
        })
        .attr('x2', d => {
          const targetNode = d.target as any;
          return targetNode.x || 0;
        })
        .attr('y2', d => {
          const targetNode = d.target as any;
          return targetNode.y || 0;
        });

      nodes
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);

      if (labels) {
        labels
          .attr('x', d => d.x || 0)
          .attr('y', d => d.y || 0);
      }
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };

  }, [graphData, linkDistance, nodeStrength, showLabels, nodeSizeRange, graphData?.edges]);

  // Update visualization when settings change
  useEffect(() => {
    if (simulationRef.current) {
      // Update link distance
      simulationRef.current.force('link', d3.forceLink<GraphNode, GraphEdge>(graphData?.edges || [])
        .id(d => d.id)
        .distance(linkDistance));
      
      // Update node strength
      simulationRef.current.force('charge', d3.forceManyBody().strength(nodeStrength));
      
      // Restart simulation
      simulationRef.current.alpha(0.3).restart();
    }
  }, [linkDistance, nodeStrength]);

  // Initial data fetch
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Handle zoom controls
  const handleZoomIn = () => {
    if (svgRef_d3.current) {
      const svg = d3.select(svgRef_d3.current);
      const zoom = d3.zoom<SVGSVGElement, unknown>();
      svg.transition().call(zoom.scaleBy as any, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef_d3.current) {
      const svg = d3.select(svgRef_d3.current);
      const zoom = d3.zoom<SVGSVGElement, unknown>();
      svg.transition().call(zoom.scaleBy as any, 0.7);
    }
  };

  const handleFitToView = () => {
    if (svgRef_d3.current && gRef.current && graphData) {
      const svg = d3.select(svgRef_d3.current);
      const bounds = gRef.current.node()!.getBBox();
      const width = svg.node()!.getBoundingClientRect().width;
      const height = svg.node()!.getBoundingClientRect().height;
      const zoom = d3.zoom<SVGSVGElement, unknown>();
      
      const scale = 0.8 / Math.max(bounds.width / width, bounds.height / height);
      const translate = [width / 2 - scale * (bounds.x + bounds.width / 2),
                        height / 2 - scale * (bounds.y + bounds.height / 2)];
      
      svg.transition().call(zoom.transform as any, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }
  };

  return (
    <div>
      <Title level={2}>Graph Visualization</Title>

      {/* Controls */}
      <Card className="graph-controls">
        <Space wrap>
          <Tooltip title="Refresh Data">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchGraphData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Tooltip>
          <Tooltip title="Zoom In">
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip title="Zoom Out">
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Tooltip>
          <Tooltip title="Fit to View">
            <Button icon={<ExpandOutlined />} onClick={handleFitToView} />
          </Tooltip>
          <Tooltip title="Settings">
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setSettingsVisible(true)}
            >
              Settings
            </Button>
          </Tooltip>
          <Space>
            <span>Show Labels:</span>
            <Switch 
              checked={showLabels} 
              onChange={setShowLabels}
            />
          </Space>
        </Space>
      </Card>

      {/* Legend */}
      <Card title="Legend" style={{ marginTop: 16 }}>
        <div className="legend-container">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#61dafb' }}></div>
            <span>Pod</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#8884d8' }}></div>
            <span>Service</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#82ca9d' }}></div>
            <span>Deployment</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffc658' }}></div>
            <span>Namespace</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff7c7c' }}></div>
            <span>Node</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#d084d0' }}></div>
            <span>Secret</span>
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {/* Graph Visualization */}
      <Card style={{ marginTop: 16 }}>
        {loading ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="graph-container"
            width="100%"
            height="600"
          />
        )}
      </Card>

      {/* Settings Drawer */}
      <Drawer
        title="Visualization Settings"
        width={300}
        open={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Typography.Text>Link Distance: {linkDistance}</Typography.Text>
            <Slider
              min={20}
              max={200}
              value={linkDistance}
              onChange={setLinkDistance}
            />
          </div>
          <div>
            <Typography.Text>Node Strength: {nodeStrength}</Typography.Text>
            <Slider
              min={-1000}
              max={0}
              value={nodeStrength}
              onChange={setNodeStrength}
            />
          </div>
          <div>
            <Typography.Text>Node Size Range</Typography.Text>
            <Slider
              min={5}
              max={50}
              range
              value={nodeSizeRange}
              onChange={(value) => setNodeSizeRange(value as [number, number])}
            />
          </div>
        </Space>
      </Drawer>

      {/* Node Details Drawer */}
      <Drawer
        title={`Node Details: ${selectedNode?.label}`}
        width={500}
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
      >
        {selectedNode && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Name">{selectedNode.label}</Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={selectedNode.color}>
                  {selectedNode.type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ID">{selectedNode.id}</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 24 }}>Properties</Title>
            <Descriptions bordered column={1}>
              {Object.entries(selectedNode.properties).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default GraphVisualization;