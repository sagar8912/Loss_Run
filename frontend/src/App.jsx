import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopMetrics, FileUploadPanel } from './components/MetricsAndUpload';
import { AgentWorkflowView } from './components/AgentComponents';
import { TransformationView, ValidationView, RollupView, FinalOutputView } from './components/DataViews';
import { normalizeBackendResult } from './utils/backendNormalizer';
import { useWorkflowSimulation } from './hooks/useWorkflowSimulation';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', background: 'var(--bg-main)' }}>
          <h2 style={{ color: 'var(--status-red)' }}>Something went wrong. Restart Pipeline</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', textAlign: 'center' }}>{this.state.error?.toString()}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Restart Application</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const DEMO_MODE = false;

function App() {
  const { isProcessing, isComplete, agents, logs, startSimulation, restart } = useWorkflowSimulation();
  const [backendResult, setBackendResult] = useState(null);
  const [normalizedResult, setNormalizedResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [fileStats, setFileStats] = useState({ total: 0, pdf: 0, excel: 0, csv: 0, docx: 0, rejected: 0 });

  const tabs = ['upload', 'agent-workflow', 'transformation', 'validation', 'rollup', 'final-output'];
  const [currentTab, setCurrentTab] = useState('upload');

  const handleStartProcessing = async (files, stats) => {
    setFileStats(stats);
    startSimulation(stats);
    setCurrentTab('agent-workflow');
    setApiError(null);
    setBackendResult(null);
    setNormalizedResult(null);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch('http://localhost:8000/api/process-loss-run', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.detail || `Backend error: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("REAL BACKEND RESULT:", data);
      const normResult = normalizeBackendResult(data, stats);
      setBackendResult(data);
      setNormalizedResult(normResult);
      console.log("Normalized Backend Result:", normResult);
    } catch (err) {
      console.error('API Error:', err);
      setApiError(`Failed to process files: ${err.message}`);
      restart(); // Stop the mock simulation on error
    }
  };

  const currentIndex = tabs.indexOf(currentTab);
  
  const handleNext = () => {
    if (currentIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentTab(tabs[currentIndex - 1]);
    }
  };

  let nextDisabled = false;
  if (currentIndex === tabs.length - 1) {
    nextDisabled = true;
  } else if (currentIndex === 0 && !isProcessing && !isComplete) {
    nextDisabled = true;
  } else if (currentIndex >= 1 && !isComplete) {
    nextDisabled = true;
  }

  return (
    <div className="app-container">
      <Sidebar isProcessing={isProcessing} isComplete={isComplete} currentTab={currentTab} setCurrentTab={setCurrentTab} backendResult={normalizedResult} />
      <main className="main-content" style={{ padding: 0, gap: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 40px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0 }}>
              <span style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginRight: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Step {currentIndex + 1} of 6</span>
              {tabs[currentIndex].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
          </div>
          <TopMetrics isProcessing={isProcessing} isComplete={isComplete} backendResult={normalizedResult} fileStats={fileStats} />
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <ErrorBoundary>
          {apiError && (
            <div style={{ position: 'absolute', top: 20, left: 40, right: 40, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-red)', color: 'var(--status-red)', padding: '12px 16px', borderRadius: '8px', zIndex: 100 }}>
              {apiError}
            </div>
          )}

          {currentTab === 'upload' && (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', animation: 'fadeIn 0.5s ease-out', overflow: 'hidden' }}>
              <FileUploadPanel startProcessing={handleStartProcessing} isProcessing={isProcessing} isComplete={isComplete} fileStats={fileStats} setFileStats={setFileStats} />
            </div>
          )}

          {currentTab === 'agent-workflow' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease-out' }}>
              <AgentWorkflowView agents={agents} logs={logs} />
            </div>
          )}

          {currentTab === 'transformation' && (
            <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease-out' }}>
              <TransformationView backendResult={normalizedResult} />
            </div>
          )}

          {currentTab === 'validation' && (
            <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease-out' }}>
              <ValidationView backendResult={normalizedResult} />
            </div>
          )}

          {currentTab === 'rollup' && (
            <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease-out' }}>
              <RollupView backendResult={normalizedResult} />
            </div>
          )}

          {currentTab === 'final-output' && (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease-out', overflow: 'hidden' }}>
              <FinalOutputView backendResult={normalizedResult} />
            </div>
          )}

          {!tabs.includes(currentTab) && (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
               <h2 style={{ color: 'var(--text-main)' }}>Loading view...</h2>
            </div>
          )}
          </ErrorBoundary>
        </div>

        <div style={{ padding: '20px 40px', background: 'rgba(11, 11, 11, 0.8)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
          <button className="btn-secondary" onClick={handleBack} disabled={currentIndex === 0} style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}>
            Back
          </button>
          <button className="btn-primary" onClick={handleNext} disabled={nextDisabled} style={{ opacity: nextDisabled ? 0.3 : 1 }}>
            Next Step
          </button>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

export default App;
