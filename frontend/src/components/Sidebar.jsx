import React, { useState, useEffect } from 'react';
import { UploadCloud, Network, Wand2, ShieldCheck, BarChart2, Download, CheckCircle2, Circle } from 'lucide-react';

export function Sidebar({ isProcessing, isComplete, currentTab, setCurrentTab, backendResult }) {
  const navItems = [
    { id: 'upload', mainIcon: UploadCloud, label: 'Upload Files' },
    { id: 'agent-workflow', mainIcon: Network, label: 'Agent Workflow' },
    { id: 'transformation', mainIcon: Wand2, label: 'Transformation' },
    { id: 'validation', mainIcon: ShieldCheck, label: 'Validation' },
    { id: 'rollup', mainIcon: BarChart2, label: 'Rollup Dashboard' },
    { id: 'final-output', mainIcon: Download, label: 'Export Results' },
  ];

  const activeIndex = navItems.findIndex(item => item.id === currentTab);

  // Tie progress strictly to actual frontend state, not scroll position
  let progressPercent = 0;
  let completedSteps = 0;

  if (isComplete) {
    progressPercent = 100;
    completedSteps = navItems.length;
  } else if (isProcessing) {
    completedSteps = 1; // 'Upload Files' is done
    progressPercent = Math.round((completedSteps / (navItems.length - 1)) * 100);
  } else {
    progressPercent = 0;
    completedSteps = 0;
  }

  return (
    <aside className="premium-sidebar">
      <div className="premium-sidebar-header">
        <div className="premium-sidebar-title">Loss Run AI</div>
        <div className="premium-sidebar-subtitle">Agentic Processing Platform</div>
      </div>

      <div className="premium-progress-section">
        <div className="premium-progress-label">
          <span>Workflow Progress</span>
          <span style={{ color: '#fff' }}>{progressPercent}% Complete</span>
        </div>
        <div className="premium-progress-bar">
          <div className="premium-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="premium-progress-count">
          Completed: {completedSteps}/{navItems.length} Steps
        </div>
      </div>

      <nav className="premium-nav">
        {navItems.map((item, index) => {
          let workflowStatus = 'pending';
          let statusText = 'Pending';
          
          if (isComplete) {
            if (index === 0) {
               workflowStatus = 'completed'; statusText = 'Completed';
            } else if (index === 1) {
               workflowStatus = 'completed'; statusText = 'Completed';
            } else if (index === 2) {
               // Transformation
               workflowStatus = backendResult?.transformationMappings?.length > 0 ? 'completed' : 'pending';
               statusText = backendResult?.transformationMappings?.length > 0 ? 'Completed' : 'Awaiting backend output';
            } else if (index === 3) {
               // Validation
               workflowStatus = backendResult?.validationChecks?.length > 0 ? 'completed' : 'pending';
               statusText = backendResult?.validationChecks?.length > 0 ? 'Completed' : 'Awaiting backend output';
            } else if (index === 4) {
               // Rollup
               workflowStatus = (backendResult?.rolledUpRows || backendResult?.lobSummary?.length > 0) ? 'completed' : 'pending';
               statusText = (backendResult?.rolledUpRows || backendResult?.lobSummary?.length > 0) ? 'Completed' : 'Awaiting backend output';
            } else if (index === 5) {
               // Export
               workflowStatus = backendResult?.exportFiles?.length > 0 ? 'completed' : 'pending';
               statusText = backendResult?.exportFiles?.length > 0 ? 'Completed' : 'Awaiting backend output';
            }
          } else if (isProcessing) {
            if (index === 0) {
              workflowStatus = 'completed';
              statusText = 'Completed';
            } else if (index === 1) {
              workflowStatus = 'processing';
              statusText = 'Processing...';
            } else {
              workflowStatus = 'pending';
              statusText = 'Pending';
            }
          } else {
            if (index === 0) {
              workflowStatus = 'processing';
              statusText = 'Waiting...';
            } else {
              workflowStatus = 'pending';
              statusText = 'Pending';
            }
          }

          const isViewing = (index === activeIndex);
          let statusClass = 'pending';

          if (isViewing) {
            statusClass = 'active';
          } else if (workflowStatus === 'completed') {
            statusClass = 'completed';
          } else if (workflowStatus === 'pending') {
            statusClass = 'pending';
          } else {
            statusClass = 'active';
          }

          return (
            <button
              key={item.id}
              className={`premium-nav-item ${statusClass}`}
              onClick={() => setCurrentTab(item.id)}
            >
              {isViewing && <div className="active-indicator" />}
              <div className="status-icon-wrapper">
                <item.mainIcon size={20} className={`icon-${workflowStatus}`} />
              </div>
              <div className="item-content">
                <span className="item-label" style={{ color: isViewing ? '#fff' : 'inherit' }}>
                  {item.label}
                </span>
                <span className={`item-status status-${workflowStatus}-text`}>
                  {statusText}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
