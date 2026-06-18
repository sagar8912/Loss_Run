import React, { useEffect, useRef, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import ReactFlow, { Background, MarkerType, Handle, Position, Controls, MiniMap, getSmoothStepPath, EdgeLabelRenderer } from 'reactflow';
import 'reactflow/dist/style.css';

const CustomAgentNode = ({ data }) => {
  const { agent } = data;
  if (!agent) return null;
  
  const Icon = LucideIcons[agent.icon] || LucideIcons.Activity;
  const isHero = agent.id === 'finalExtract';
  
  const statusColors = {
    waiting: 'var(--border-color)',
    running: '#3b82f6', 
    completed: 'var(--status-green)',
    warning: 'var(--status-yellow)',
    failed: 'var(--status-red)'
  };
  
  const bgMap = {
    waiting: '#f8fafc',
    running: '#eff6ff', 
    completed: '#f0fdf4',
    warning: '#fef3c7',
    failed: '#fef2f2'
  };

  const StatusIcon = agent.status === 'completed' ? LucideIcons.CheckCircle2 : (agent.status === 'failed' ? LucideIcons.XCircle : (agent.status === 'running' ? LucideIcons.Loader2 : LucideIcons.Circle));
  const color = statusColors[agent.status];
  const width = isHero ? '440px' : '360px'; 
  const scaleClass = agent.status === 'running' ? 'pulse-glow-running' : '';
  const transformStyle = agent.status === 'running' ? (isHero ? 'scale(1.08)' : 'scale(1.05)') : (isHero ? 'scale(1.05)' : 'scale(1)');

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

      <div className={`glass-panel ${scaleClass}`} style={{ width, display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '10px', border: `2px solid ${color}`, overflow: 'hidden', transform: transformStyle, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        
        {agent.id === 'docToPdf' && (
           <div style={{ background: '#f8fafc', padding: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: `1px solid var(--border-color)` }}>
             SYSTEM STEP
           </div>
        )}

        <div style={{ padding: isHero ? '24px' : '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{ padding: '6px', borderRadius: '50%', background: bgMap[agent.status], color: color }}>
               <StatusIcon size={isHero ? 28 : 24} className={agent.status === 'running' ? 'spin-loader' : ''} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: isHero ? '1.4rem' : '1.25rem', color: 'var(--text-main)', fontWeight: 600 }}>{agent.name}</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confidence: {agent.score || '-'}</span>
            </div>
          </div>
          
          {isHero ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
               <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                 <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Input Streams</div>
                 <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>2</div>
               </div>
               <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                 <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Records Extracted</div>
                 <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{agent.recordsProcessed || 0}</div>
               </div>
               <div style={{ gridColumn: '1 / -1', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                 PDF Text + Excel JSON → Unified Claims
               </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.4' }}>
              Input: {agent.input}
            </p>
          )}
        </div>

        <div style={{ background: bgMap[agent.status], padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: `1px solid ${color}33` }}>
          <LucideIcons.Check size={18} color={color} />
          <span style={{ fontSize: '0.95rem', color: color, fontWeight: 500 }}>{agent.output || 'Waiting...'}</span>
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
        <circle r="6" className="data-packet">
          <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {data?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${style.stroke}`, fontSize: 13, fontWeight: 600, color: style.stroke, pointerEvents: 'all', zIndex: 10 }} className="nodrag nopan">
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export function AgentCommunicationLog({ logs }) {
  const endRef = useRef(null);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px', overflow: 'hidden', background: '#ffffff' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LucideIcons.MessageSquare size={18} color="var(--accent-color)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Live Agent Communication Log</h3>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
        {logs.map((log) => (
          <div key={log.id} style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', borderLeft: log.type === 'warning' ? '4px solid var(--status-yellow)' : '4px solid var(--status-green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
               <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.75rem', textTransform: 'uppercase' }}>System Activity</span>
               <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>[{log.time}]</span>
            </div>
            <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
              {log.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

const initialNodes = [
  { id: 'intake', type: 'agentNode', position: { x: 0, y: 0 } },
  { id: 'detection', type: 'agentNode', position: { x: 420, y: 0 } },
  { id: 'router', type: 'agentNode', position: { x: 840, y: 0 } },
  
  { id: 'docToPdf', type: 'agentNode', position: { x: 1260, y: 0 } },
  { id: 'pdfToImage', type: 'agentNode', position: { x: 1260, y: 280 } },
  { id: 'imageToText', type: 'agentNode', position: { x: 840, y: 280 } },
  
  { id: 'excelBlock', type: 'agentNode', position: { x: 420, y: 280 } },
  { id: 'excelText', type: 'agentNode', position: { x: 0, y: 280 } },
  
  { id: 'finalExtract', type: 'agentNode', position: { x: 420, y: 560 } },
  { id: 'transform', type: 'agentNode', position: { x: 900, y: 560 } },
  { id: 'validation', type: 'agentNode', position: { x: 1320, y: 560 } },
  { id: 'rollup', type: 'agentNode', position: { x: 1320, y: 840 } },
  { id: 'report', type: 'agentNode', position: { x: 900, y: 840 } }
];

const edgeConfig = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(59, 130, 246, 0.5)' },
};

const createEdges = (agents) => {
  const getStatus = (id) => agents.find(a => a.id === id)?.status;
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
    buildEdge('detection', 'router', 'Valid Files', 's-right', 't-left'),
    buildEdge('router', 'docToPdf', 'DOC/DOCX', 's-right', 't-left'),
    buildEdge('router', 'pdfToImage', 'PDF/DOCX', 's-bottom', 't-top'),
    buildEdge('docToPdf', 'pdfToImage', 'PDF Pages', 's-bottom', 't-top'),
    buildEdge('router', 'excelBlock', 'Excel/CSV', 's-bottom', 't-top'),
    buildEdge('pdfToImage', 'imageToText', 'Images', 's-left', 't-right'),
    buildEdge('excelBlock', 'excelText', 'Blocks', 's-left', 't-right'),
    buildEdge('imageToText', 'finalExtract', 'Extracted Text', 's-bottom', 't-top'),
    buildEdge('excelText', 'finalExtract', 'Block JSON', 's-bottom', 't-top'),
    buildEdge('finalExtract', 'transform', 'Unified JSON', 's-right', 't-left'),
    buildEdge('transform', 'validation', 'Claims', 's-right', 't-left'),
    buildEdge('validation', 'rollup', 'Validated Claims', 's-bottom', 't-top'),
    buildEdge('rollup', 'report', 'Rollups', 's-left', 't-right'),
  ];
};

export function AgentWorkflowView({ agents, logs }) {
  const nodeTypes = useMemo(() => ({ agentNode: CustomAgentNode }), []);
  const edgeTypes = useMemo(() => ({ animatedEdge: AnimatedEdge }), []);
  
  const nodes = initialNodes.map(n => ({
    ...n,
    data: { agent: agents.find(a => a.id === n.id) || {} }
  }));

  const edges = createEdges(agents);

  return (
    <section id="agent-workflow" className="section-header" style={{ marginBottom: '60px' }}>
      <div className="section-title">
        <LucideIcons.Activity color="var(--accent-color)" /> Agent Pipeline Architecture
      </div>
      <p className="section-subtitle" style={{ marginBottom: '16px' }}>Real-time status of independent AI agents collaborating to extract and transform data.</p>
      
      {/* Mini Architecture Overview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '32px 24px', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '32px', position: 'relative' }}>
        
        {/* The background connecting line */}
        <div style={{ position: 'absolute', top: '56px', left: '10%', right: '10%', height: '2px', background: 'var(--border-color)', zIndex: 0 }} />

        {[
          { icon: 'FolderInput', title: 'Intake', desc: 'Upload & Route' },
          { icon: 'BrainCircuit', title: 'Extract', desc: 'AI OCR & Vision' },
          { icon: 'RefreshCw', title: 'Transform', desc: 'Standardize Data' },
          { icon: 'ShieldCheck', title: 'Validate', desc: 'Business Rules' },
          { icon: 'FileOutput', title: 'Export', desc: 'Final Reports' }
        ].map((step, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', zIndex: 1, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-color)', color: '#fff', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)', border: '4px solid #fff' }}>
              {React.createElement(LucideIcons[step.icon] || LucideIcons.Activity, { size: 20 })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{step.title}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '120px' }}>{step.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="animated-grid" />
      <div style={{ height: '75vh', minHeight: '700px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'transparent', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          nodeTypes={nodeTypes} 
          edgeTypes={edgeTypes}
          fitView 
          fitViewOptions={{ padding: 0.1 }}
          panOnDrag={true} 
          zoomOnScroll={true}
          zoomOnDoubleClick={true}
          zoomOnPinch={true}
          nodesDraggable={true}
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        >
          <Background color="var(--border-color)" gap={20} />
          <Controls position="bottom-right" style={{ background: '#ffffff', fill: 'var(--text-muted)', border: '1px solid var(--border-color)' }} />
          <MiniMap 
             position="bottom-left"
             nodeColor={n => {
               if (n.data?.agent?.status === 'running') return 'var(--accent-color)';
               if (n.data?.agent?.status === 'completed') return 'var(--status-green)';
               if (n.data?.agent?.status === 'warning') return 'var(--status-yellow)';
               if (n.data?.agent?.status === 'failed') return 'var(--status-red)';
               return 'var(--border-color)';
             }}
             style={{ background: '#ffffff', maskColor: 'rgba(248, 250, 252, 0.7)', border: '1px solid var(--border-color)' }} 
             nodeStrokeColor="var(--border-color)"
          />
        </ReactFlow>
      </div>

      {logs && logs.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <AgentCommunicationLog logs={logs} />
        </div>
      )}
    </section>
  );
}
