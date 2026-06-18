import React, { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import ReactFlow, { Background, MarkerType, Handle, Position, Controls, MiniMap, getSmoothStepPath, EdgeLabelRenderer, Panel } from 'reactflow';
import 'reactflow/dist/style.css';

const CustomAgentNode = ({ data }) => {
  const { agent } = data;
  if (!agent || Object.keys(agent).length === 0) return null;
  
  const Icon = LucideIcons[agent.icon] || LucideIcons.Activity;
  const isHero = ['router', 'finalExtract', 'validation', 'report'].includes(agent.id);
  
  const statusColors = {
    waiting: 'var(--border-color)',
    running: '#3b82f6', 
    completed: 'var(--status-green)',
    warning: 'var(--status-yellow)',
    failed: 'var(--status-red)'
  };
  
  const bgMap = {
    waiting: 'var(--bg-card-hover)',
    running: 'rgba(59, 130, 246, 0.1)', 
    completed: 'rgba(16, 185, 129, 0.1)',
    warning: 'rgba(245, 158, 11, 0.1)',
    failed: 'rgba(239, 68, 68, 0.1)'
  };

  const StatusIcon = agent.status === 'completed' ? LucideIcons.CheckCircle2 : (agent.status === 'failed' ? LucideIcons.XCircle : (agent.status === 'running' ? LucideIcons.Loader2 : LucideIcons.Circle));
  const color = statusColors[agent.status];
  const width = isHero ? '460px' : '380px'; 
  const scaleClass = agent.status === 'running' ? 'pulse-glow-running' : '';
  const transformStyle = agent.status === 'running' ? (isHero ? 'scale(1.05)' : 'scale(1.03)') : 'scale(1)';

  return (
    <>
      <Handle type="target" position={Position.Top} id="t-top" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="t-left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="t-right" style={{ opacity: 0 }} />
      
      <Handle type="source" position={Position.Top} id="s-top" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="s-left" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="s-right" style={{ opacity: 0 }} />

      <div className={`glass-panel ${scaleClass}`} style={{ width, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '10px', border: `1px solid ${color}`, overflow: 'hidden', transform: transformStyle, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: agent.status === 'running' ? `0 0 20px ${color}40` : '0 4px 12px rgba(0,0,0,0.2)' }}>
        
        {agent.id === 'docToPdf' && (
           <div style={{ background: 'var(--bg-card-hover)', padding: '2px', textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: `1px solid var(--border-color)`, letterSpacing: '1px' }}>
             SYSTEM NODE
           </div>
        )}

        <div style={{ padding: isHero ? '20px' : '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: bgMap[agent.status], color: color }}>
               <StatusIcon size={isHero ? 32 : 28} className={agent.status === 'running' ? 'spin-loader' : ''} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: isHero ? '1.3rem' : '1.15rem', color: 'var(--text-main)', fontWeight: 600 }}>{agent.name || 'Unknown Agent'}</h4>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>Status: {agent.status?.toUpperCase() || 'WAITING'}</span>
            </div>
          </div>
        </div>

        <div style={{ background: bgMap[agent.status], padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: `1px solid ${color}33` }}>
          <LucideIcons.ArrowRight size={16} color={color} />
          <span style={{ fontSize: '0.95rem', color: color, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.output || agent.input || 'Waiting...'}</span>
        </div>
      </div>
    </>
  );
};

const AnimatedEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} fill="none" />
      {data?.animated && (
        <circle r="4" className="data-packet" fill="#3b82f6">
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {data?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${style.stroke}`, fontSize: 10, fontWeight: 600, color: style.stroke, pointerEvents: 'all', zIndex: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }} className="nodrag nopan">
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const initialNodes = [
  // Row 1
  { id: 'intake', type: 'agentNode', position: { x: 0, y: 0 } },
  { id: 'detection', type: 'agentNode', position: { x: 560, y: 0 } },
  { id: 'router', type: 'agentNode', position: { x: 1120, y: 0 } },
  
  // PDF Stream (Right side)
  { id: 'docToPdf', type: 'agentNode', position: { x: 1680, y: 0 } },
  { id: 'pdfToImage', type: 'agentNode', position: { x: 1680, y: 320 } },
  { id: 'imageToText', type: 'agentNode', position: { x: 1680, y: 640 } },
  
  // Excel Stream (Middle)
  { id: 'excelBlock', type: 'agentNode', position: { x: 1120, y: 320 } },
  { id: 'excelText', type: 'agentNode', position: { x: 560, y: 320 } },
  
  // Merge into Final Extract
  { id: 'finalExtract', type: 'agentNode', position: { x: 560, y: 640 } },
  
  // Post-processing
  { id: 'transform', type: 'agentNode', position: { x: 0, y: 640 } },
  { id: 'validation', type: 'agentNode', position: { x: 0, y: 960 } },
  { id: 'rollup', type: 'agentNode', position: { x: 560, y: 960 } },
  { id: 'report', type: 'agentNode', position: { x: 1120, y: 960 } }
];

const createEdges = (agents) => {
  const safeAgents = agents || [];
  const getStatus = (id) => safeAgents.find(a => a.id === id)?.status || 'waiting';
  const isAnim = (targetId) => getStatus(targetId) === 'running';
  
  const buildEdge = (source, target, label, sHandle, tHandle) => {
    const animated = isAnim(target);
    const targetStatus = getStatus(target);
    
    const edgeColor = targetStatus === 'failed' ? 'var(--status-red)' : 
                      (targetStatus === 'waiting' ? 'var(--border-color)' : 'var(--status-green)');
                      
    return {
      id: `e-${source}-${target}`,
      source,
      target,
      sourceHandle: sHandle,
      targetHandle: tHandle,
      type: 'animatedEdge',
      data: { label, animated },
      style: {
        stroke: animated ? '#3b82f6' : edgeColor,
        strokeWidth: animated ? 3 : 2,
        opacity: 1
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: animated ? '#3b82f6' : edgeColor }
    };
  };

  return [
    buildEdge('intake', 'detection', 'Files', 's-right', 't-left'),
    buildEdge('detection', 'router', 'Valid', 's-right', 't-left'),
    
    // PDF Stream (goes right then down)
    buildEdge('router', 'docToPdf', 'DOCX', 's-right', 't-left'),
    buildEdge('docToPdf', 'pdfToImage', 'PDF', 's-bottom', 't-top'),
    buildEdge('pdfToImage', 'imageToText', 'Images', 's-bottom', 't-top'),
    
    // Excel Stream (goes down then left)
    buildEdge('router', 'excelBlock', 'XLSX', 's-bottom', 't-top'),
    buildEdge('excelBlock', 'excelText', 'Blocks', 's-left', 't-right'),
    
    // Merge into Final Extract
    buildEdge('excelText', 'finalExtract', 'JSON', 's-bottom', 't-top'),
    buildEdge('imageToText', 'finalExtract', 'Text', 's-left', 't-right'),
    
    // Continue pipeline (left then down then right)
    buildEdge('finalExtract', 'transform', 'Unified', 's-left', 't-right'),
    buildEdge('transform', 'validation', 'Claims', 's-bottom', 't-top'),
    buildEdge('validation', 'rollup', 'Valid', 's-right', 't-left'),
    buildEdge('rollup', 'report', 'Rollups', 's-right', 't-left'),
  ];
};

export function AgentWorkflowView({ agents }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rfInstance, setRfInstance] = useState(null);
  const nodeTypes = useMemo(() => ({ agentNode: CustomAgentNode }), []);
  const edgeTypes = useMemo(() => ({ animatedEdge: AnimatedEdge }), []);
  
  if (!agents || agents.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
        <LucideIcons.Loader2 size={48} className="spin-loader" color="var(--accent-color)" />
        <h2 style={{ color: 'var(--text-main)' }}>Initializing Agentic Pipeline...</h2>
      </div>
    );
  }

  const nodes = initialNodes.map(n => ({
    ...n,
    data: { agent: agents.find(a => a.id === n.id) || {} }
  }));

  const edges = createEdges(agents);

  const containerStyle = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    background: 'var(--bg-main)'
  } : {
    width: '100%',
    height: '100%',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-main)',
    overflow: 'hidden',
    position: 'relative'
  };

  return (
    <div style={containerStyle}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes} 
        edgeTypes={edgeTypes}
        onInit={setRfInstance}
        fitView 
        fitViewOptions={{ padding: 0.08, minZoom: 0.5, maxZoom: 1.2 }}
        panOnDrag={true} 
        zoomOnScroll={true}
        zoomOnDoubleClick={true}
        zoomOnPinch={true}
        nodesDraggable={true}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
      >
        <Background color="var(--border-color)" gap={20} />
        
        <Panel position="top-right" style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => rfInstance?.fitView({ padding: 0.08, duration: 800 })}>
            <LucideIcons.Focus size={14} style={{ marginRight: '6px' }} /> Fit View
          </button>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <><LucideIcons.Minimize size={14} style={{ marginRight: '6px' }} /> Exit Fullscreen</> : <><LucideIcons.Maximize size={14} style={{ marginRight: '6px' }} /> Fullscreen View</>}
          </button>
        </Panel>

        <Controls position="bottom-right" style={{ background: 'var(--bg-card)', fill: 'var(--text-muted)', border: '1px solid var(--border-color)' }} />
        <MiniMap 
           position="bottom-left"
           nodeColor={n => {
             if (n.data?.agent?.status === 'running') return 'var(--accent-color)';
             if (n.data?.agent?.status === 'completed') return 'var(--status-green)';
             if (n.data?.agent?.status === 'warning') return 'var(--status-yellow)';
             if (n.data?.agent?.status === 'failed') return 'var(--status-red)';
             return 'var(--border-color)';
           }}
           style={{ background: 'var(--bg-card)', maskColor: 'rgba(0, 0, 0, 0.7)', border: '1px solid var(--border-color)', width: 140, height: 90 }} 
           nodeStrokeColor="var(--border-color)"
        />
      </ReactFlow>
    </div>
  );
}

