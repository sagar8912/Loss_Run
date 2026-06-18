import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import * as XLSX from 'xlsx';
import { transformationData, validationData, rollupSummaryData, finalTableData, DEMO_MODE } from '../mockData';

export function TransformationView({ backendResult }) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 5;
  
  let dataToUse = backendResult?.transformationMappings || (DEMO_MODE && !backendResult ? transformationData : []);

  const totalPages = Math.ceil(dataToUse.length / itemsPerPage);
  const currentItems = dataToUse.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-title">
        <LucideIcons.Wand2 color="var(--accent-color)" /> Business Transformation Layer
      </div>
      <p className="section-subtitle">
        {backendResult ? "Derived from backend output schema" : "Real business mappings converting non-standard carrier data into conforming schemas."}
      </p>
      
      {dataToUse.length === 0 ? (
         <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Awaiting backend output</h3>
         </div>
      ) : (
      <div className="glass-panel" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <table className="data-table" style={{ flex: 1 }}>
          <thead>
            <tr>
              <th>Raw Extracted Value</th>
              <th>Standardized Schema Mapping</th>
              <th>Transformation Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((t, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>"{t.raw}"</td>
                <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{t.std}</td>
                <td><span className="status-chip status-waiting" style={{textTransform: 'none'}}>{t.type}</span></td>
                <td>
                  {t.status === 'success' ? 
                    <LucideIcons.CheckCircle2 size={16} color="var(--status-green)" /> :
                    <LucideIcons.AlertTriangle size={16} color="var(--status-yellow)" />
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card-hover)' }}>
            <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 12px' }}>Previous</button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
            <button className="btn-secondary" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 12px' }}>Next</button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export function ValidationView({ backendResult }) {
  const dataToUse = backendResult?.validationChecks || (DEMO_MODE && !backendResult ? validationData : []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-title">
        <LucideIcons.ShieldCheck color="var(--accent-color)" /> Business Validation Rules
      </div>
      <p className="section-subtitle">
        {backendResult ? "Calculated from extracted claims" : "Automated checks ensuring data integrity before final reporting."}
      </p>
      
      {dataToUse.length === 0 ? (
         <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Awaiting backend output</h3>
         </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px', overflowY: 'auto', paddingBottom: '20px' }}>
        {dataToUse.map((v, i) => (
          <div key={i} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${v.status==='success'?'var(--status-green)':'var(--status-yellow)'}` }}>
            <div style={{ padding: '10px', borderRadius: '50%', background: v.status==='success'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)' }}>
              {v.status === 'success' ? <LucideIcons.CheckCircle2 color="var(--status-green)" size={24} /> : <LucideIcons.AlertTriangle color="var(--status-yellow)" size={24} />}
            </div>
            <div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '4px', color: 'var(--text-main)' }}>{v.check}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{v.detail}</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

export function RollupView({ backendResult }) {
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  const totalClaims = backendResult?.claimsExtracted || 0;
  
  const byLob = backendResult?.lobSummary || [];
  const years = backendResult?.yearWiseSummary || [];

  const totalPaid = years.length > 0 ? years.reduce((sum, y) => sum + parseFloat(y.totalPaid.replace(/[^0-9.-]+/g,"")), 0) : 0;
  const totalIncurred = years.length > 0 ? years.reduce((sum, y) => sum + parseFloat(y.totalIncurred.replace(/[^0-9.-]+/g,"")), 0) : 0;
  const totalReserve = years.length > 0 ? years.reduce((sum, y) => sum + parseFloat(y.totalReserve.replace(/[^0-9.-]+/g,"")), 0) : 0;

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  if (!backendResult) {
     return (
       <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
         <div className="section-title"><LucideIcons.Layers color="var(--accent-color)" /> Business Rollup Dashboard</div>
         <p className="section-subtitle">Awaiting backend output</p>
         <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Awaiting backend output</h3>
         </div>
       </div>
     );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div className="section-title">
        <LucideIcons.Layers color="var(--accent-color)" /> Business Rollup Dashboard
      </div>
      
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flex: 1, overflow: 'hidden' }}>
        {/* Left Side: High Level KPIs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.05) 0%, rgba(11, 11, 11, 0) 100%)' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Pipeline Value</h3>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--status-green)', margin: '8px 0' }}>{formatCurrency(totalIncurred)}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Across {totalClaims.toLocaleString()} Total Claims</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Paid</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(totalPaid)}</div>
             </div>
             <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Reserve</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>{formatCurrency(totalReserve)}</div>
             </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowYearModal(true)}>
              <LucideIcons.Calendar size={16} style={{ marginRight: '8px' }} /> View Year-wise Details
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowMethodologyModal(true)}>
              <LucideIcons.Fingerprint size={16} style={{ marginRight: '8px' }} /> Duplicate Methodology
            </button>
          </div>
        </div>

        {/* Right Side: LOB Summary */}
        <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <LucideIcons.PieChart color="var(--accent-color)" size={18} /> LOB Summary
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            {byLob.map((lob, i) => (
              <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: 'var(--bg-card-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{lob.lob}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Claims</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{lob.count.toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Paid</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--status-green)' }}>{lob.paid}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showYearModal && (
        <div style={{ position: 'absolute', top: '-40px', left: '-40px', right: '-40px', bottom: '-40px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '80%', maxHeight: '80%', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}><LucideIcons.Calendar size={20} color="var(--accent-color)" /> Year-wise Breakdown</h3>
              <button onClick={() => setShowYearModal(false)} style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}><LucideIcons.X size={20} /></button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Year</th><th>Claims</th><th>Paid</th><th>Reserve</th><th>Incurred</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y, i) => (
                    <tr key={i} style={{ fontWeight: y.year === 'Total' ? 'bold' : 'normal', background: y.year === 'Total' ? 'var(--bg-card-hover)' : 'transparent' }}>
                      <td>{y.year}</td><td>{y.claimCount.toLocaleString()}</td><td>{y.totalPaid}</td><td>{y.totalReserve}</td><td>{y.totalIncurred}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showMethodologyModal && (
        <div style={{ position: 'absolute', top: '-40px', left: '-40px', right: '-40px', bottom: '-40px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '500px', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}><LucideIcons.Fingerprint size={20} color="var(--status-yellow)" /> Duplicate Matching Methodology</h3>
              <button onClick={() => setShowMethodologyModal(false)} style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}><LucideIcons.X size={20} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-muted)', background: 'var(--bg-card-hover)', padding: '16px', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>Method 1: Claimant/Incident Matching</strong>
                Claimant Name + Loss Date + State
              </p>
              <p style={{ color: 'var(--text-muted)', background: 'var(--bg-card-hover)', padding: '16px', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>Method 2: ID/Description Matching</strong>
                Claim ID + Description + State
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FinalOutputView({ backendResult }) {
  const [toastMessage, setToastMessage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const hasRealData = !!backendResult && !!backendResult.rawRows;
  const rawDataPreview = hasRealData ? backendResult.rawRows : [];

  const metricsData = hasRealData ? [
    { metric: 'Files Processed', value: backendResult.filesUploaded || 1 },
    { metric: 'Total Claims Extracted', value: backendResult.claimsExtracted || rawDataPreview.length },
    { metric: 'Processing Errors', value: backendResult.validationIssues || 0 },
    { metric: 'Processing Time', value: backendResult.processingTime || 'N/A' }
  ] : (DEMO_MODE ? metricsExportData : []);

  if (!backendResult) {
     return (
       <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
         <div className="section-title"><LucideIcons.Download color="var(--accent-color)" /> Export & Downstream Integration</div>
         <p className="section-subtitle">Awaiting backend output</p>
         <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Awaiting backend output</h3>
         </div>
       </div>
     );
  }

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchFullData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/download/csv');
      if (!response.ok) throw new Error("Failed to fetch CSV");
      const csvText = await response.text();
      return csvText;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleDownloadJSON = async () => {
    if (!hasRealData) {
      alert("No real backend output available. Please process files first.");
      return;
    }
    setIsExporting(true);
    const csvText = await fetchFullData();
    if (csvText) {
      const wb = XLSX.read(csvText, { type: 'string' });
      const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const dataStr = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loss_run_output.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded JSON successfully`);
    } else {
      alert("Failed to download real data from backend.");
    }
    setIsExporting(false);
  };

  const handleDownloadCSV = async () => {
    if (!hasRealData) {
      alert("No real backend output available. Please process files first.");
      return;
    }
    setIsExporting(true);
    const csvText = await fetchFullData();
    if (csvText) {
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loss_run_output.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded CSV successfully`);
    } else {
      alert("Failed to download real data from backend.");
    }
    setIsExporting(false);
  };

  const handleExportExcel = async () => {
    if (!hasRealData) {
      alert("No real backend output available. Please process files first.");
      return;
    }
    setIsExporting(true);
    const csvText = await fetchFullData();
    if (csvText) {
      const wb = XLSX.read(csvText, { type: 'string' });
      const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, XLSX.utils.json_to_sheet(jsonData), "RAW");
      XLSX.utils.book_append_sheet(newWb, XLSX.utils.json_to_sheet(metricsData), "METRICS");
      
      XLSX.writeFile(newWb, "loss_run_output.xlsx");
      showToast('Exported Full Excel Package successfully');
    } else {
      alert("Failed to download real data from backend.");
    }
    setIsExporting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {toastMessage && (
        <div style={{
          position: 'absolute', top: '0', right: '0', background: 'var(--status-green)', color: 'var(--bg-main)',
          padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'fadeIn 0.3s ease-out', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }}>
          <LucideIcons.CheckCircle2 size={20} /> {toastMessage}
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-green)', marginBottom: '24px' }}>
          <LucideIcons.Check size={48} />
        </div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--text-main)', marginBottom: '16px' }}>Pipeline Completed Successfully</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Extracted and transformed data is ready for downstream systems.</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', width: '100%', maxWidth: '900px' }}>
        
        <button onClick={handleDownloadJSON} className="glass-panel" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)', background: 'var(--bg-card-hover)' }}>
          <LucideIcons.FileJson size={40} color="var(--text-muted)" />
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>Export JSON</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Raw structured data payload</p>
          </div>
        </button>

        <button onClick={handleDownloadCSV} className="glass-panel" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)', background: 'var(--bg-card-hover)' }}>
          <LucideIcons.FileText size={40} color="var(--text-muted)" />
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>Export CSV</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Flat file for integrations</p>
          </div>
        </button>

        <button onClick={handleExportExcel} className="glass-panel pulse-glow-running" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', border: '2px solid var(--accent-color)', background: 'rgba(234, 88, 12, 0.05)' }}>
          <LucideIcons.FileSpreadsheet size={40} color="var(--accent-color)" />
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>Export Master Excel</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete multi-sheet workbook</p>
          </div>
        </button>
        
      </div>
    </div>
  );
}
