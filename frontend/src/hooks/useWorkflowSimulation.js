import { useState, useEffect } from 'react';
import { initialAgents } from '../mockData';

export function useWorkflowSimulation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agents, setAgents] = useState(initialAgents);
  const [logs, setLogs] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  
  const [stepIndex, setStepIndex] = useState(0);
  const [simSteps, setSimSteps] = useState([]);
  const [isWaitingForBackend, setIsWaitingForBackend] = useState(false);
  const [backendFinished, setBackendFinished] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Generate sequence of steps
  const buildSteps = (stats) => {
    const steps = [];
    const addStep = (agent, action, output) => {
      steps.push({ agent, action, output });
    };

    const { total = 0, pdf = 0, excel = 0, csv = 0, docx = 0, rejected = 0 } = stats || {};
    const validFiles = total - rejected;
    const pdfStreamFiles = pdf + docx;
    const excelStreamFiles = excel + csv;

    const pdfPages = pdfStreamFiles > 0 ? (pdfStreamFiles * 16) : 0; 
    const excelTables = excelStreamFiles > 0 ? (excelStreamFiles * 4) : 0;

    // 1. Intake
    addStep('intake', 'running', '-');
    addStep('intake', 'completed', `${total} Files`);
    
    // 2. Detection
    addStep('detection', 'running', '-');
    addStep('detection', 'completed', `${validFiles} Valid`);
    
    // 3. Router
    addStep('router', 'running', '-');
    addStep('router', 'completed', `${pdfStreamFiles} PDF/DOC, ${excelStreamFiles} XLS`);
    
    // 4. File-specific routes
    if (docx > 0) {
      addStep('docToPdf', 'running', '-');
      addStep('docToPdf', 'completed', `${docx} PDF files`);
    }
    
    if (pdf > 0 || docx > 0) {
      addStep('pdfToImage', 'running', '-');
      addStep('pdfToImage', 'completed', `${pdfPages} Images`);
      addStep('imageToText', 'running', '-');
      addStep('imageToText', 'completed', `Extracted Text`);
    }

    if (excel > 0 || csv > 0) {
      addStep('excelBlock', 'running', '-');
      addStep('excelBlock', 'completed', `${excelTables} Tables`);
      addStep('excelText', 'running', '-');
      addStep('excelText', 'completed', `Parsed JSON`);
    }
    
    // 5. Final Extract PAUSE POINT
    addStep('finalExtract', 'running', 'Pending backend...');

    return steps;
  };

  // Timer Effect
  useEffect(() => {
    let timerId;
    if (isWaitingForBackend) {
      timerId = setInterval(() => {
        setElapsedTime(prev => {
          const next = prev + 1;
          setAgents(currAgents => currAgents.map(a => {
            if (a.id === 'finalExtract' && a.status === 'running') {
              return { ...a, time: `${next.toFixed(1)}s` };
            }
            return a;
          }));
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isWaitingForBackend]);

  // Visual Progression Effect
  useEffect(() => {
    if (!isProcessing || isWaitingForBackend) return;

    if (stepIndex < simSteps.length) {
      const timerId = setTimeout(() => {
        // Abort if processing was cancelled or completed early (e.g. fast API response)
        if (!isProcessing) return;

        const step = simSteps[stepIndex];
        
        // Apply step state
        setAgents(prev => prev.map(a => 
          a.id === step.agent ? { ...a, status: step.action, output: step.output } : a
        ));

        // Check if this is the pause point
        if (step.agent === 'finalExtract' && step.action === 'running') {
          if (!backendFinished) {
             setIsWaitingForBackend(true);
          }
        }

        setStepIndex(prev => prev + 1);
        
        // If it's the very last step and we are NOT waiting for backend
        if (stepIndex === simSteps.length - 1 && step.agent !== 'finalExtract') {
          setIsComplete(true);
          setIsProcessing(false);
          setLogs(prev => [...prev, {
            id: Math.random().toString(), time: new Date().toLocaleTimeString([], { hour12: false }), text: 'Pipeline completed successfully.', type: 'info'
          }]);
        }
      }, 600); // 600ms per visual step
      return () => clearTimeout(timerId);
    }
  }, [isProcessing, isWaitingForBackend, stepIndex, simSteps, backendFinished]);

  const startSimulation = (stats) => {
    setIsProcessing(true);
    setIsComplete(false);
    setBackendFinished(false);
    setIsWaitingForBackend(false);
    setStepIndex(0);
    setElapsedTime(0);
    setSimSteps(buildSteps(stats));
    setAgents(initialAgents);
    setLogs([
      { id: '1', time: new Date().toLocaleTimeString([], { hour12: false }), text: 'Starting pipeline execution...', type: 'info' }
    ]);
  };

  const completeSimulation = (result) => {
    // Try to find actual claims extracted from result
    let claimsCount = 0;
    try {
      if (result && result.claimsExtracted !== undefined) {
        claimsCount = result.claimsExtracted;
      }
    } catch (e) {}

    // Update all agents instantly based on backend response
    setAgents(currAgents => currAgents.map(a => {
      if (a.id === 'finalExtract') {
        return { ...a, status: 'completed', output: `${claimsCount} Claims` };
      }
      if (a.id === 'transform') {
        const hasTransform = result && (result.rawRows?.length > 0 || result.transformationMappings?.length > 0);
        return { ...a, status: hasTransform ? 'completed' : 'idle', output: hasTransform ? 'Normalized' : '-' };
      }
      if (a.id === 'validation') {
        const hasValidation = result && result.validationChecks?.length > 0;
        return { ...a, status: hasValidation ? 'completed' : 'idle', output: hasValidation ? 'Validated' : '-' };
      }
      if (a.id === 'rollup') {
        const hasRollup = result && result.rollupSummary && Object.keys(result.rollupSummary).length > 0;
        return { ...a, status: hasRollup ? 'completed' : 'idle', output: hasRollup ? 'Business Summaries' : '-' };
      }
      if (a.id === 'report') {
        const hasReport = result && result.exportFiles?.length > 0;
        return { ...a, status: hasReport ? 'completed' : 'idle', output: hasReport ? 'Final Excel/CSV' : '-' };
      }
      return a;
    }));

    setBackendFinished(true);
    setIsWaitingForBackend(false); 
    setIsComplete(true);
    setIsProcessing(false);
    
    setLogs(prev => [...prev, {
      id: Math.random().toString(), time: new Date().toLocaleTimeString([], { hour12: false }), text: `Backend returned payload with ${claimsCount} claims. Finalizing UI...`, type: 'info'
    }, {
      id: Math.random().toString(), time: new Date().toLocaleTimeString([], { hour12: false }), text: 'Pipeline completed successfully.', type: 'info'
    }]);
  };

  const failSimulation = (errorMsg) => {
    setIsProcessing(false);
    setIsWaitingForBackend(false);
    setAgents(prev => prev.map(a => {
      if (a.status === 'running') {
        return { ...a, status: 'failed', output: 'Failed' };
      }
      return a;
    }));
    setLogs(prev => [...prev, {
      id: Math.random().toString(), time: new Date().toLocaleTimeString([], { hour12: false }), text: `Pipeline failed: ${errorMsg}`, type: 'warning'
    }]);
  };

  const restart = () => {
    setIsProcessing(false);
    setAgents(initialAgents);
    setLogs([]);
    setIsComplete(false);
    setElapsedTime(0);
    setStepIndex(0);
    setBackendFinished(false);
    setIsWaitingForBackend(false);
  };

  return { isProcessing, isComplete, agents, logs, startSimulation, completeSimulation, failSimulation, restart, setAgents };
}
