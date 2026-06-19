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
    idle: 'var(--border-color)',
    running: '#3b82f6', 
    completed: 'var(--status-green)',
    warning: 'var(--status-yellow)',
    failed: 'var(--status-red)'
  };
  
  const bgMap = {
    waiting: 'var(--bg-card-hover)',
    idle: 'var(--bg-card-hover)',
    running: 'rgba(59, 130, 246, 0.1)', 
    completed: 'rgba(16, 185, 129, 0.1)',
    warning: 'rgba(245, 158, 11, 0.1)',
    failed: 'rgba(239, 68, 68, 0.1)'
  };

  const StatusIcon = agent.status === 'completed' ? LucideIcons.CheckCircle2 : (agent.status === 'failed' ? LucideIcons.XCircle : (agent.status === 'running' ? LucideIcons.Loader2 : LucideIcons.Circle));
  const color = statusColors[agent.status];
  const width = isHero ? '460px' : '400px'; 
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

      <div className={`glass-panel ${scaleClass}`} style={{ width, display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)', borderRadius: '16px', border: `1px solid ${color}80`, overflow: 'hidden', transform: transformStyle, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: agent.status === 'running' ? `0 0 40px ${color}60, inset 0 2px 4px rgba(255,255,255,0.1)` : `0 20px 40px -10px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05), 0 0 15px ${color}20` }}>
        
        {/* Server Blade Top Bar */}
        <div style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${color}40` }}>
           <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
             {isHero ? 'CORE PROCESSOR' : 'NODE BLADE'}
           </span>
           <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent.status === 'running' ? color : 'rgba(255,255,255,0.2)', boxShadow: agent.status === 'running' ? `0 0 8px ${color}` : 'none' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent.status === 'completed' ? 'var(--status-green)' : 'rgba(255,255,255,0.2)' }} />
           </div>
        </div>

        <div style={{ padding: isHero ? '24px' : '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: bgMap[agent.status], color: color, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 15px ${color}40` }}>
               <StatusIcon size={isHero ? 42 : 36} className={agent.status === 'running' ? 'spin-loader' : ''} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: isHero ? '1.8rem' : '1.5rem', color: 'var(--text-main)', fontWeight: 800, letterSpacing: '-1px', textShadow: `0 0 15px ${color}40` }}>{agent.name || 'Unknown Agent'}</h4>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>STATUS: <span style={{ color: color, textShadow: `0 0 10px ${color}80` }}>{agent.status?.toUpperCase() || 'WAITING'}</span></span>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: `1px solid ${color}40` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <LucideIcons.ArrowRight size={24} color={color} />
            <span style={{ fontSize: '1.4rem', color: color, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', letterSpacing: '1px' }}>{agent.output || agent.input || 'WAITING_FOR_DATA...'}</span>
          </div>
          {agent.time && agent.time !== '-' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${color}40` }}>
              <LucideIcons.Clock size={16} color={color} />
              <span style={{ fontSize: '1.1rem', color: color, fontWeight: 700, fontFamily: 'monospace' }}>{agent.time}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const AnimatedEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const filterStr = data?.animated ? 'drop-shadow(0 0 12px #3b82f6) drop-shadow(0 0 24px #3b82f6)' : (style.stroke === 'var(--status-green)' ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' : 'none');

  return (
    <>
      <path id={id} style={{ ...style, filter: filterStr }} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} fill="none" />
      {data?.animated && (
        <circle r="8" className="data-packet" fill="#ffffff" filter="drop-shadow(0 0 10px #ffffff)">
          <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {data?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, background: 'var(--bg-main)', padding: '6px 12px', borderRadius: '8px', border: `2px solid ${style.stroke}`, fontSize: 16, fontWeight: 800, color: style.stroke, pointerEvents: 'all', zIndex: 10, letterSpacing: '1px', textTransform: 'uppercase', boxShadow: filterStr !== 'none' ? `0 0 20px ${style.stroke}40` : 'none' }} className="nodrag nopan">
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
  { id: 'detection', type: 'agentNode', position: { x: 480, y: 0 } },
  { id: 'router', type: 'agentNode', position: { x: 960, y: 0 } },
  
  // PDF Stream (Right side)
  { id: 'docToPdf', type: 'agentNode', position: { x: 1440, y: 0 } },
  { id: 'pdfToImage', type: 'agentNode', position: { x: 1440, y: 320 } },
  { id: 'imageToText', type: 'agentNode', position: { x: 1440, y: 640 } },
  
  // Excel Stream (Middle)
  { id: 'excelBlock', type: 'agentNode', position: { x: 960, y: 320 } },
  { id: 'excelText', type: 'agentNode', position: { x: 480, y: 320 } },
  
  // Merge into Final Extract
  { id: 'finalExtract', type: 'agentNode', position: { x: 480, y: 640 } },
  
  // Post-processing
  { id: 'transform', type: 'agentNode', position: { x: 0, y: 640 } },
  { id: 'validation', type: 'agentNode', position: { x: 0, y: 960 } },
  { id: 'rollup', type: 'agentNode', position: { x: 480, y: 960 } },
  { id: 'report', type: 'agentNode', position: { x: 960, y: 960 } }
];

const createEdges = (agents, fileStats) => {
  const safeAgents = agents || [];
  const getStatus = (id) => safeAgents.find(a => a.id === id)?.status || 'waiting';
  const isAnim = (targetId) => getStatus(targetId) === 'running';
  const stats = fileStats || { pdf: 0, docx: 0, excel: 0, csv: 0 };
  
  const buildEdge = (source, target, label, sHandle, tHandle, isActiveRoute = true) => {
    const animated = isAnim(target) && isActiveRoute;
    const targetStatus = getStatus(target);
    
    // If route is inactive, grey it out
    const edgeColor = !isActiveRoute ? 'rgba(255,255,255,0.05)' :
                      (targetStatus === 'failed' ? 'var(--status-red)' : 
                      (targetStatus === 'waiting' ? 'var(--border-color)' : 'var(--status-green)'));
                      
    return {
      id: `e-${source}-${target}`,
      source,
      target,
      sourceHandle: sHandle,
      targetHandle: tHandle,
      type: 'animatedEdge',
      animated: animated,
      data: { label, animated },
      style: {
        stroke: animated ? '#3b82f6' : edgeColor,
        strokeWidth: animated ? 8 : (!isActiveRoute ? 2 : 4),
        opacity: animated ? 1 : (!isActiveRoute ? 0.3 : 0.6)
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: animated ? '#3b82f6' : edgeColor }
    };
  };

  const hasPdf = stats.pdf > 0;
  const hasDoc = stats.docx > 0;
  const hasExcel = (stats.excel > 0 || stats.csv > 0);

  const edges = [
    buildEdge('intake', 'detection', 'Files', 's-right', 't-left', true),
    buildEdge('detection', 'router', 'Valid', 's-right', 't-left', true),
  ];

  // DOCX route
  if (hasDoc) {
    edges.push(buildEdge('router', 'docToPdf', 'DOCX', 's-right', 't-left', true));
    edges.push(buildEdge('docToPdf', 'pdfToImage', 'PDF', 's-bottom', 't-top', true));
  } else {
    // Show inactive
    edges.push(buildEdge('router', 'docToPdf', 'DOCX', 's-right', 't-left', false));
    edges.push(buildEdge('docToPdf', 'pdfToImage', 'PDF', 's-bottom', 't-top', false));
  }

  // PDF route directly to pdfToImage
  if (hasPdf) {
    edges.push(buildEdge('router', 'pdfToImage', 'PDF', 's-right', 't-top', true));
  } else {
    // Show inactive edge when there is no PDF uploaded (even if docx is uploaded)
    edges.push(buildEdge('router', 'pdfToImage', 'PDF', 's-right', 't-top', false));
  }

  // Image to text
  edges.push(buildEdge('pdfToImage', 'imageToText', 'Images', 's-bottom', 't-top', hasPdf || hasDoc));
  
  // Excel route
  edges.push(buildEdge('router', 'excelBlock', 'XLSX', 's-bottom', 't-top', hasExcel));
  edges.push(buildEdge('excelBlock', 'excelText', 'Blocks', 's-left', 't-right', hasExcel));
  
  // Merge into Final Extract
  edges.push(buildEdge('excelText', 'finalExtract', 'JSON', 's-bottom', 't-top', hasExcel));
  edges.push(buildEdge('imageToText', 'finalExtract', 'Text', 's-left', 't-right', hasPdf || hasDoc));
  
  // Continue pipeline
  edges.push(buildEdge('finalExtract', 'transform', 'Unified', 's-left', 't-right', true));
  edges.push(buildEdge('transform', 'validation', 'Claims', 's-bottom', 't-top', true));
  edges.push(buildEdge('validation', 'rollup', 'Valid', 's-right', 't-left', true));
  edges.push(buildEdge('rollup', 'report', 'Rollups', 's-right', 't-left', true));

  return edges;
};

export function AgentWorkflowView({ agents, fileStats }) {
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

  const nodes = initialNodes.map(n => {
    const stats = fileStats || { pdf: 0, docx: 0, excel: 0, csv: 0 };
    const hasPdf = stats.pdf > 0;
    const hasDoc = stats.docx > 0;
    const hasExcel = (stats.excel > 0 || stats.csv > 0);
    
    let isActive = true;
    if (n.id === 'docToPdf' && !hasDoc) isActive = false;
    if ((n.id === 'pdfToImage' || n.id === 'imageToText') && !hasDoc && !hasPdf) isActive = false;
    if ((n.id === 'excelBlock' || n.id === 'excelText') && !hasExcel) isActive = false;

    // Apply grey out logic
    const baseAgent = agents?.find(a => a.id === n.id) || {};
    const effectiveAgent = !isActive ? { ...baseAgent, status: 'waiting', output: 'Inactive Route' } : baseAgent;

    return {
      ...n,
      data: { agent: effectiveAgent }
    };
  });
  
  const edges = useMemo(() => createEdges(agents, fileStats), [agents, fileStats]);

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
        onInit={(instance) => {
          setRfInstance(instance);
          setTimeout(() => instance.fitView({ padding: 0.05 }), 150);
        }}
        fitView 
        fitViewOptions={{ padding: 0.05 }}
        panOnDrag={true} 
        zoomOnScroll={true}
        zoomOnDoubleClick={true}
        zoomOnPinch={true}
        nodesDraggable={true}
        minZoom={0.1}
        maxZoom={3.0}
        style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)' }}
      >
        <Background color="rgba(255,255,255,0.05)" gap={30} size={2} />
        <Controls position="bottom-right" style={{ background: 'var(--bg-card)', fill: 'var(--text-muted)', border: '1px solid var(--border-color)' }} />
      </ReactFlow>
    </div>
  );
}

