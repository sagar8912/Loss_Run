import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import * as XLSX from 'xlsx';
import { transformationData, validationData, rollupSummaryData, finalTableData } from '../mockData';

export function TransformationView() {
  return (
    <section id="transformation" className="section-header">
      <div className="section-title">
        <LucideIcons.Wand2 color="var(--accent-color)" /> Business Transformation Layer
      </div>
      <p className="section-subtitle">Real business mappings converting non-standard carrier data into conforming schemas.</p>
      
      <div className="glass-panel" style={{ marginTop: '16px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Raw Extracted Value</th>
              <th>Standardized Schema Mapping</th>
              <th>Transformation Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transformationData.map((t, i) => (
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
      </div>
    </section>
  );
}

export function ValidationView() {
  return (
    <section id="validation" className="section-header">
      <div className="section-title">
        <LucideIcons.ShieldCheck color="var(--accent-color)" /> Business Validation Rules
      </div>
      <p className="section-subtitle">Automated checks ensuring data integrity before final reporting.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        {validationData.map((v, i) => (
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
    </section>
  );
}

export function RollupView() {
  return (
    <section id="rollup" className="section-header">
      <div className="section-title">
        <LucideIcons.Layers color="var(--accent-color)" /> Business Rollup Dashboard
      </div>
      <p className="section-subtitle">Aggregation of claim-level records into business summaries and duplicate methodologies.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '16px' }}>
        
        {/* Year-wise Data */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
            <h4 style={{ color: 'var(--text-main)' }}>Year-wise Aggregation (2017–2025)</h4>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Claims</th>
                  <th>Paid</th>
                  <th>Reserve</th>
                  <th>Incurred</th>
                  <th>Payroll</th>
                </tr>
              </thead>
              <tbody>
                {rollupSummaryData.years.map((y, i) => {
                  const isTotal = y.year === 'Total';
                  return (
                    <tr key={i} style={{ background: isTotal ? 'rgba(59, 130, 246, 0.1)' : 'transparent', fontWeight: isTotal ? 'bold' : 'normal' }}>
                      <td style={{ color: isTotal ? 'var(--accent-color)' : 'var(--text-main)' }}>{y.year}</td>
                      <td>{y.claimCount.toLocaleString()}</td>
                      <td style={{ color: 'var(--status-green)' }}>{y.totalPaid}</td>
                      <td style={{ color: 'var(--status-yellow)' }}>{y.totalReserve}</td>
                      <td style={{ color: 'var(--accent-color)' }}>{y.totalIncurred}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{y.payroll}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOBs and Duplicate Methodology */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--text-main)' }}>LOB-wise Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {rollupSummaryData.byLob.map((lob, i) => (
                <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-color)' }} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{lob.lob}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Claims</span>
                      <div style={{ fontSize: '1rem', fontWeight: 500 }}>{lob.count.toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Paid</span>
                      <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--status-green)' }}>{lob.paid}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reserve</span>
                      <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--status-yellow)' }}>{lob.reserve}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Incurred</span>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-color)' }}>{lob.incurred}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.05)' }}>
            <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--status-yellow)' }}>Duplicate Matching Methodology</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem' }}>
              <div>
                <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}>Method #1</p>
                <p style={{ color: 'var(--text-muted)', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>Claimant Name + Loss Date + State</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}>Method #2</p>
                <p style={{ color: 'var(--text-muted)', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>Claim ID + Description + State</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '4px' }}>Method #3</p>
                <p style={{ color: 'var(--text-muted)', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>Loss Date + Description + State</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

// Ensure FinalOutputView uses the new mock data. 
// (The mockData.js Rollup changed, so we'll adjust the Excel Export mapped data directly here)
const commentsExportData = [
  { type: 'Validation Warning', severity: 'Medium', message: 'Missing evaluation date on 1 claim', recordId: 'WC-99882211' },
  { type: 'Data Standardization', severity: 'Low', message: 'Mapped unknown cause "Cut" to "Laceration"', recordId: 'GL-10293847' },
];

const metricsExportData = [
  { metric: 'Files Processed', value: 50 },
  { metric: 'Valid Loss Runs Detected', value: 45 },
  { metric: 'Total Claims Extracted', value: 12450 },
  { metric: 'Validation Issues', value: 12 },
  { metric: 'Total Processing Time', value: '48.2s' },
];

export function FinalOutputView({ apiData }) {
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('RAW');

  // Use real apiData if available, otherwise fallback to mock data
  const rawData = apiData?.claimsPreview?.length > 0 ? apiData.claimsPreview : finalTableData;
  const metricsData = apiData?.metrics ? [
    { metric: 'Number of Claims', value: apiData.metrics.num_claims },
    { metric: 'Processing Errors', value: apiData.metrics.processing_errors || 0 }
  ] : metricsExportData;

  const exportMap = {
    'RAW': rawData,
    'ROLLEDUP': rollupSummaryData.years,
    'PIVOT': rollupSummaryData.byLob,
    'COMMENTS': commentsExportData,
    'METRICS': metricsData,
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadJSON = () => {
    const dataToExport = exportMap[activeTab] || finalTableData;
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loss_run_${activeTab.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${activeTab} JSON successfully`);
  };

  const handleDownloadCSV = () => {
    const dataToExport = exportMap[activeTab] || finalTableData;
    if (dataToExport.length === 0) return;
    const headers = Object.keys(dataToExport[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = String(row[header] || '');
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvStr = csvRows.join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loss_run_${activeTab.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${activeTab} CSV successfully`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportMap['RAW']), "RAW");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportMap['ROLLEDUP']), "ROLLEDUP");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportMap['PIVOT']), "PIVOT");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportMap['COMMENTS']), "COMMENTS");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportMap['METRICS']), "METRICS");
    
    XLSX.writeFile(wb, "loss_run_output.xlsx");
    showToast('Exported Full Excel successfully');
  };

  return (
    <section id="final-output" className="section-header" style={{ paddingBottom: '40px', position: 'relative' }}>
      {toastMessage && (
        <div style={{
          position: 'absolute', top: '-40px', right: '0', background: 'var(--status-green)', color: '#fff',
          padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <LucideIcons.CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}
      <div className="section-title">
        <LucideIcons.FileOutput color="var(--accent-color)" /> Final Output
      </div>
      <p className="section-subtitle">Extracted and transformed data ready for downstream systems.</p>
      
      <div className="glass-panel" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          {['RAW', 'ROLLEDUP', 'PIVOT', 'COMMENTS', 'METRICS'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              style={{ 
                color: activeTab === tab ? 'var(--accent-color)' : 'var(--text-muted)', 
                borderBottom: activeTab === tab ? '2px solid var(--accent-color)' : 'none', 
                padding: '8px 4px', 
                fontWeight: activeTab === tab ? 600 : 400 
              }}
            >
              {tab}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={handleDownloadJSON}><LucideIcons.Download size={16}/> {activeTab} JSON</button>
          <button className="btn-secondary" onClick={handleDownloadCSV}><LucideIcons.Download size={16}/> {activeTab} CSV</button>
          <button className="btn-primary" onClick={handleExportExcel}><LucideIcons.FileSpreadsheet size={16}/> Export Full Excel</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                {Object.keys(exportMap[activeTab][0] || {}).map(k => (
                  <th key={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exportMap[activeTab].map((r, i) => (
                <tr key={i}>
                  {Object.values(r).map((val, j) => (
                    <td key={j} style={j === 0 ? { fontWeight: 500 } : {}}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
