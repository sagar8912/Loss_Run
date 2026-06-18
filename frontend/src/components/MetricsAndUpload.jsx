import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { executiveKPIs, executiveSummaryData } from '../mockData';

export function SummaryMetricCard({ icon: Icon, title, value, color }) {
  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: '160px', flex: 1 }}>
      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `rgba(${color}, 0.1)`, color: `rgb(${color})` }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
        <h3 style={{ fontSize: '1.4rem' }}>{value}</h3>
      </div>
    </div>
  );
}

export function ExecutiveSummary({ apiData, fileStats }) {
  const scale = fileStats && fileStats.total > 0 ? (fileStats.total / 50) : 1;
  const mockClaims = Math.max(1, Math.floor(12450 * scale));

  const data = apiData && apiData.metrics ? {
    filesProcessed: apiData.filesProcessed,
    claimsProcessed: apiData.metrics.num_claims || 0,
    validationPassRate: '98.2%', 
    extractionAccuracy: '99.5%',
    duplicateRate: '0.04%'
  } : {
    filesProcessed: fileStats?.total || executiveSummaryData.filesProcessed,
    claimsProcessed: mockClaims,
    validationPassRate: '98.2%',
    extractionAccuracy: '99.5%',
    duplicateRate: '0.04%'
  };

  return (
    <section className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#ffffff', borderLeft: '4px solid var(--accent-color)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Files Processed</p>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>{data.filesProcessed}</h2>
      </div>
      <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Claims Processed</p>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>{data.claimsProcessed.toLocaleString()}</h2>
      </div>
      <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Validation Pass Rate</p>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--status-green)' }}>{data.validationPassRate}</h2>
      </div>
      <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Extraction Accuracy</p>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--status-green)' }}>{data.extractionAccuracy}</h2>
      </div>
      <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Duplicate Rate</p>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--status-yellow)' }}>{data.duplicateRate}</h2>
      </div>
    </section>
  );
}

export function TopMetrics({ isProcessing, isComplete, apiData, fileStats }) {
  const scale = fileStats && fileStats.total > 0 ? (fileStats.total / 50) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {executiveKPIs.map(kpi => {
          const Icon = LucideIcons[kpi.icon];
          let displayValue = "0";

          if (isProcessing && !isComplete) {
            displayValue = "Running...";
          } else if (isComplete) {
            if (apiData) {
              if (kpi.id === 'files') displayValue = apiData.filesProcessed;
              else if (kpi.id === 'claims') displayValue = apiData.metrics?.num_claims || '0';
              else displayValue = kpi.value; // Fallback for other real values if omitted
            } else {
              // Mock Scaling
              if (kpi.id === 'files') displayValue = fileStats.total;
              else if (kpi.id === 'valid') displayValue = Math.max(0, fileStats.total - fileStats.rejected);
              else if (kpi.id === 'claims') displayValue = Math.max(1, Math.floor(12450 * scale)).toLocaleString();
              else if (kpi.id === 'dupes') displayValue = Math.max(0, Math.floor(5 * scale));
              else if (kpi.id === 'issues') displayValue = Math.max(0, Math.floor(12 * scale));
              else displayValue = kpi.value; // confidence, time
            }
          }

          return <SummaryMetricCard key={kpi.id} icon={Icon} title={kpi.title} value={displayValue} color={kpi.color} />
        })}
      </div>
      {(isProcessing || isComplete) && <ExecutiveSummary apiData={apiData} fileStats={fileStats} />}
    </div>
  );
}

export function FileUploadPanel({ startProcessing, isProcessing, isComplete, fileStats, setFileStats }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check for ZIP
    const hasZip = files.some(f => f.name.toLowerCase().endsWith('.zip'));
    if (hasZip) {
      setErrorMsg("ZIP files are not supported. Please extract the ZIP and upload PDF, DOCX, XLSX, or CSV files.");
      e.target.value = '';
      return;
    }

    setErrorMsg(null);
    setSelectedFiles(files);

    const stats = { total: files.length, pdf: 0, excel: 0, csv: 0, docx: 0, rejected: 0 };
    files.forEach(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') stats.pdf++;
      else if (ext === 'xlsx' || ext === 'xls') stats.excel++;
      else if (ext === 'csv') stats.csv++;
      else if (ext === 'docx' || ext === 'doc') stats.docx++;
      else stats.rejected++;
    });
    setFileStats(stats);
  };

  const onLaunch = () => {
    if (selectedFiles.length === 0) {
      // Launch Demo Simulation
      const demoStats = { total: 12, pdf: 5, excel: 3, csv: 1, docx: 2, rejected: 1 };
      setFileStats(demoStats);
      startProcessing([], demoStats);
      return;
    }
    if (fileStats.total === fileStats.rejected) {
      setErrorMsg("No supported files found to process.");
      return;
    }
    startProcessing(selectedFiles, fileStats);
  };

  return (
    <section id="upload" className="section-header">
      <div className="section-title">
        <LucideIcons.UploadCloud color="var(--accent-color)" /> Intake Operations
      </div>
      <p className="section-subtitle">Securely ingest Carrier Loss Runs (PDF, DOCX, XLSX, CSV).</p>
      
      <div className="glass-panel" style={{ marginTop: '16px', padding: '40px', textAlign: 'center', borderStyle: 'dashed' }}>
        
        {errorMsg && (
          <div style={{ color: 'var(--status-red)', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <LucideIcons.AlertTriangle size={16} /> {errorMsg}
          </div>
        )}

        <input 
          type="file" 
          multiple 
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv" 
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
          disabled={isProcessing}
        />
        
        <label htmlFor="file-upload" className="btn-secondary" style={{ cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'inline-flex', marginBottom: '24px', padding: '8px 16px', alignItems: 'center', gap: '8px' }}>
          <LucideIcons.Plus size={16} /> Select Real Files
        </label>

        {selectedFiles.length > 0 ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {fileStats.pdf > 0 && <span className="status-chip status-waiting" style={{color:'var(--text-main)'}}><LucideIcons.FileText size={12}/> {fileStats.pdf} PDF</span>}
              {fileStats.excel > 0 && <span className="status-chip status-waiting" style={{color:'var(--text-main)'}}><LucideIcons.FileSpreadsheet size={12}/> {fileStats.excel} Excel</span>}
              {fileStats.csv > 0 && <span className="status-chip status-waiting" style={{color:'var(--text-main)'}}><LucideIcons.FileJson size={12}/> {fileStats.csv} CSV</span>}
              {fileStats.docx > 0 && <span className="status-chip status-waiting" style={{color:'var(--text-main)'}}><LucideIcons.File size={12}/> {fileStats.docx} DOCX</span>}
              {fileStats.rejected > 0 && <span className="status-chip status-failed"><LucideIcons.XCircle size={12}/> {fileStats.rejected} Rejected</span>}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
             <span style={{ color: 'var(--text-muted)' }}>No files selected. Click "Select Real Files" to upload.</span>
          </div>
        )}
        
        <button 
          className="btn-primary" 
          onClick={onLaunch} 
          disabled={isProcessing}
          style={{ fontSize: '1.2rem', padding: '16px 40px', fontWeight: 700, boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)' }}
        >
          {isProcessing ? (
            <><LucideIcons.Loader2 className="spin-loader" /> Pipeline Active...</>
          ) : isComplete ? (
            <><LucideIcons.RefreshCw /> Restart Enterprise Pipeline</>
          ) : (
            <><LucideIcons.PlayCircle /> Launch Agentic Processing</>
          )}
        </button>
      </div>
    </section>
  );
}
