import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopMetrics, FileUploadPanel } from './components/MetricsAndUpload';
import { AgentWorkflowView } from './components/AgentComponents';
import { TransformationView, ValidationView, RollupView, FinalOutputView } from './components/DataViews';
import { useWorkflowSimulation } from './hooks/useWorkflowSimulation';
import './index.css';

function App() {
  const { isProcessing, isComplete, agents, logs, startSimulation } = useWorkflowSimulation();
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [fileStats, setFileStats] = useState({ total: 0, pdf: 0, excel: 0, csv: 0, docx: 0, rejected: 0 });

  const handleStartProcessing = async (files, stats) => {
    setFileStats(stats);
    startSimulation(stats);
    setApiError(null);
    setApiData(null);
    
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
      setApiData(data);
    } catch (err) {
      console.error('API Error:', err);
      setApiError(`Backend Error: ${err.message}. Falling back to mock simulation.`);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {apiError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-red)', color: 'var(--status-red)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            {apiError}
          </div>
        )}
        <TopMetrics isProcessing={isProcessing} isComplete={isComplete} apiData={apiData} fileStats={fileStats} />
        
        <FileUploadPanel startProcessing={handleStartProcessing} isProcessing={isProcessing} isComplete={isComplete} fileStats={fileStats} setFileStats={setFileStats} />

        {(isProcessing || isComplete) && (
          <>
            <AgentWorkflowView agents={agents} logs={logs} />
            
            {isComplete && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '60px', animation: 'fadeIn 1s' }}>
                <TransformationView />
                <ValidationView />
                <RollupView />
                <FinalOutputView apiData={apiData} />
              </div>
            )}
          </>
        )}
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

export default App;
