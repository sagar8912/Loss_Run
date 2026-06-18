import { useState, useEffect } from 'react';
import { initialAgents, generateSimulationSteps } from '../mockData';

export function useWorkflowSimulation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agents, setAgents] = useState(initialAgents);
  const [logs, setLogs] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [simSteps, setSimSteps] = useState([]);

  const startSimulation = (stats) => {
    setIsProcessing(true);
    setAgents(initialAgents);
    setLogs([]);
    setStepIndex(0);
    setIsComplete(false);
    setSimSteps(generateSimulationSteps(stats || { total: 50, pdf: 25, excel: 20, csv: 5, docx: 0, rejected: 0 }));
  };

  const restart = () => {
    setIsProcessing(false);
    setAgents(initialAgents);
    setLogs([]);
    setStepIndex(0);
    setIsComplete(false);
    setSimSteps([]);
  };

  useEffect(() => {
    if (!isProcessing || stepIndex >= simSteps.length) {
      if (stepIndex >= simSteps.length && isProcessing && simSteps.length > 0) {
        setIsComplete(true);
      }
      return;
    }

    const timer = setTimeout(() => {
      const step = simSteps[stepIndex];
      
      // Update Agent
      setAgents(prev => prev.map(a => {
        if (a.id === step.agent) {
          return {
            ...a,
            status: step.action,
            input: step.input || a.input,
            output: step.output || a.output,
            time: step.time || a.time,
            score: step.score || a.score,
            recordsProcessed: step.recordsProcessed !== undefined ? step.recordsProcessed : a.recordsProcessed
          };
        }
        return a;
      }));

      // Add Logs
      if (step.logs && step.logs.length > 0) {
        const newLogs = step.logs.map(msg => ({
          id: Math.random().toString(36).substring(7),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          text: msg,
          type: step.action === 'warning' ? 'warning' : 'info'
        }));
        setLogs(prev => [...prev, ...newLogs]);
      }

      setStepIndex(prev => prev + 1);
      
    }, 1200); // 1.2s between steps for visual effect

    return () => clearTimeout(timer);
  }, [isProcessing, stepIndex, simSteps]);

  return { isProcessing, isComplete, agents, logs, startSimulation, restart };
}
