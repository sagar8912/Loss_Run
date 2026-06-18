export const DEMO_MODE = false;

export const initialAgents = [
  { id: 'intake', name: 'File Intake Agent', status: 'waiting', icon: 'FolderInput', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'detection', name: 'Loss Run Detection Agent', status: 'waiting', icon: 'ShieldCheck', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'router', name: 'Workflow Router Agent', status: 'waiting', icon: 'Network', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'docToPdf', name: 'DOC/DOCX Converter', status: 'waiting', icon: 'FileCog', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'pdfToImage', name: 'PDF to Image Agent', status: 'waiting', icon: 'Image', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'imageToText', name: 'Image to Text Agent', status: 'waiting', icon: 'FileText', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'excelBlock', name: 'Excel Block Detection Agent', status: 'waiting', icon: 'Layout', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'excelText', name: 'Excel Text Extraction Agent', status: 'waiting', icon: 'FileSpreadsheet', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'finalExtract', name: 'Final Extraction Agent', status: 'waiting', icon: 'Cpu', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'transform', name: 'Transformation Agent', status: 'waiting', icon: 'RefreshCw', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'validation', name: 'Validation Agent', status: 'waiting', icon: 'CheckCircle', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'rollup', name: 'Rollup Agent', status: 'waiting', icon: 'BarChart2', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 },
  { id: 'report', name: 'Report Generator Agent', status: 'waiting', icon: 'FileOutput', input: '-', output: '-', time: '-', score: null, recordsProcessed: 0 }
];

export function generateSimulationSteps(stats) {
  const { total, pdf, excel, csv, docx, rejected } = stats;
  const validFiles = total - rejected;
  const pdfStreamFiles = pdf + docx;
  const excelStreamFiles = excel + csv;

  const pdfPages = pdfStreamFiles * 16; 
  const pdfChars = pdfPages * 2400;
  const excelTables = excelStreamFiles * 4;
  const excelKvBlocks = excelStreamFiles * 2;
  const extractedClaims = DEMO_MODE ? (validFiles > 0 ? validFiles * 22 : 0) : 'Extracted'; 

  const claimsOutputStr = DEMO_MODE ? `${extractedClaims} Claims` : 'Claims';
  const confidenceScore = DEMO_MODE ? '98%' : 'Pending';

  return [
    { agent: 'intake', action: 'running', logs: [`Input Agent collected ${total} files from input folder.`] },
    { agent: 'intake', action: 'completed', input: `${total} files`, output: `${total} files`, time: '1.4s', score: '100%', recordsProcessed: total },
    
    { agent: 'detection', action: 'running', logs: ['Loss Run Detection Agent scanning files for identifiers...'] },
    { agent: 'detection', action: 'completed', input: `${total} files`, output: `${validFiles} valid, ${rejected} rejected`, time: '2.2s', score: confidenceScore, recordsProcessed: total, logs: [`Loss Run Detection Agent identified ${validFiles} valid loss run files.`] },
    
    { agent: 'router', action: 'running', logs: ['Workflow Router analyzing file types...'] },
    { agent: 'router', action: 'completed', input: `${validFiles} files`, output: `${pdfStreamFiles} PDF/DOC, ${excelStreamFiles} Excel/CSV`, time: '0.5s', score: '100%', recordsProcessed: validFiles, logs: [`Workflow Router routed ${pdfStreamFiles} PDF/DOC files and ${excelStreamFiles} Excel/CSV files.`] },

    { agent: 'docToPdf', action: 'running', logs: [`DOC/DOCX Converter processing legacy documents...`] },
    { agent: 'docToPdf', action: 'completed', input: `${docx} DOCX files`, output: `${docx} PDF files`, time: '1.2s', score: '100%', recordsProcessed: docx, logs: [`DOC/DOCX Converter converted documents.`] },

    { agent: 'pdfToImage', action: 'running', logs: [`PDF to Image Agent converting pages...`] },
    { agent: 'pdfToImage', action: 'completed', input: `${pdfStreamFiles} PDF files`, output: DEMO_MODE ? `${pdfPages} images` : 'Images', time: '14.1s', score: '100%', recordsProcessed: pdfPages, logs: [`PDF To Image Agent generated images.`] },

    { agent: 'imageToText', action: 'running', logs: ['Image to Text Agent running OCR models...'] },
    { agent: 'imageToText', action: 'completed', input: DEMO_MODE ? `${pdfPages} images` : 'Images', output: DEMO_MODE ? `${pdfChars} chars` : 'Text', time: '8.4s', score: confidenceScore, recordsProcessed: pdfChars, logs: [`Image To Text Agent extracted text.`] },

    { agent: 'excelBlock', action: 'running', logs: [`Excel Block Detection Agent scanning for tables and KV pairs...`] },
    { agent: 'excelBlock', action: 'completed', input: `${excelStreamFiles} Excel files`, output: DEMO_MODE ? `${excelTables} tables` : 'Tables', time: '3.2s', score: confidenceScore, recordsProcessed: excelTables, logs: [`Excel Block Detection Agent identified blocks.`] },

    { agent: 'excelText', action: 'running', logs: ['Excel Text Extraction Agent parsing block matrices...'] },
    { agent: 'excelText', action: 'completed', input: DEMO_MODE ? `${excelTables} tables` : 'Tables', output: `Block JSON`, time: '2.1s', score: confidenceScore, recordsProcessed: excelTables, logs: [`Excel Text Extraction Agent generated structured JSON.`] },

    { agent: 'finalExtract', action: 'running', logs: ['Final Extraction Agent merging PDF and Excel output streams...'] },
    { agent: 'finalExtract', action: 'completed', input: 'Combined Streams', output: claimsOutputStr, time: '26.2s', score: confidenceScore, recordsProcessed: extractedClaims, logs: [`Final Extraction Agent produced unified claims JSON.`] },

    { agent: 'transform', action: 'running', logs: ['Transformation Agent applying business rule standardization...'] },
    { agent: 'transform', action: 'completed', input: claimsOutputStr, output: 'Normalized Data', time: '3.1s', score: confidenceScore, recordsProcessed: extractedClaims, logs: [`Transformation Agent standardized all claim fields.`] },

    { agent: 'validation', action: 'running', logs: ['Validation Agent checking mandatory fields and thresholds...'] },
    { agent: 'validation', action: DEMO_MODE ? 'warning' : 'completed', input: claimsOutputStr, output: DEMO_MODE ? `Issues detected` : `Validated`, time: '4.6s', score: confidenceScore, recordsProcessed: extractedClaims, logs: [DEMO_MODE ? `Validation Agent detected 1 issue.` : 'Validation Agent finished.'] },

    { agent: 'rollup', action: 'running', logs: ['Rollup Agent aggregating line of business financials...'] },
    { agent: 'rollup', action: 'completed', input: 'Validated Claims', output: 'Business Summaries', time: '1.3s', score: '100%', recordsProcessed: extractedClaims, logs: [`Rollup Agent generated LOB summaries.`] },

    { agent: 'report', action: 'running', logs: ['Report Generator formatting final deliverables...'] },
    { agent: 'report', action: 'completed', input: 'All Data', output: 'Final Excel/CSV', time: '2.9s', score: '100%', recordsProcessed: extractedClaims, logs: [`Report Generator created Final Excel output.`] },
  ];
}

export const finalTableData = [
  { id: 'GL-10293847', date: '02/14/2023', repDate: '02/16/2023', closed: '-', state: 'NY', status: 'O', cause: 'Slip & Fall', injury: 'Contusion', claimant: 'John Doe', indemnity: '$0', medical: '$0', exp: '$8,000', paid: '$12,000', reserve: '$33,000', incurred: '$45,000', lob: 'General Liability', carrier: 'Travelers' },
  { id: 'WC-99882211', date: '11/05/2022', repDate: '11/06/2022', closed: '05/10/2023', state: 'CA', status: 'C', cause: 'Lifting heavy box', injury: 'Strain', claimant: 'Jane Smith', indemnity: '$4,500', medical: '$2,100', exp: '$400', paid: '$7,000', reserve: '$0', incurred: '$7,000', lob: 'Workers Compensation', carrier: 'Liberty Mutual' },
  { id: 'AL-44556677', date: '08/21/2023', repDate: '08/22/2023', closed: '-', state: 'TX', status: 'O', cause: 'Rear-end collision', injury: 'Whiplash', claimant: 'Bob Johnson', indemnity: '$0', medical: '$1,500', exp: '$200', paid: '$1,700', reserve: '$15,000', incurred: '$16,700', lob: 'Auto', carrier: 'Chubb' },
  { id: 'PR-11223344', date: '01/15/2023', repDate: '01/15/2023', closed: '03/01/2023', state: 'FL', status: 'C', cause: 'Wind damage', injury: 'N/A', claimant: 'Acme Corp', indemnity: '$25,000', medical: '$0', exp: '$1,200', paid: '$26,200', reserve: '$0', incurred: '$26,200', lob: 'Property', carrier: 'Travelers' },
  { id: 'GL-55667788', date: '06/30/2023', repDate: '07/02/2023', closed: '-', state: 'IL', status: 'O', cause: 'Product defect', injury: 'Laceration', claimant: 'Alice Williams', indemnity: '$0', medical: '$500', exp: '$1,000', paid: '$1,500', reserve: '$10,000', incurred: '$11,500', lob: 'General Liability', carrier: 'Liberty Mutual' },
];

export const transformationData = [
  { raw: 'Hot coffee spilled', std: 'Burn Injury', type: 'Nature of Injury', status: 'success' },
  { raw: 'Cut finger', std: 'Laceration', type: 'Nature of Injury', status: 'success' },
  { raw: 'WC', std: 'Workers Compensation', type: 'LOB Mapping', status: 'success' },
  { raw: 'GL', std: 'General Liability', type: 'LOB Mapping', status: 'success' },
  { raw: 'Claim No', std: 'Claim Identifier', type: 'Header Mapping', status: 'success' },
];

export const validationData = [
  { check: 'Threshold Check', status: 'success', detail: 'All values within expected tolerance bounds' },
  { check: 'Reserve Check', status: 'warning', detail: '3 closed claims have non-zero reserves' },
  { check: 'Claim Count Check', status: 'success', detail: 'Aggregated totals match individual lines' },
  { check: 'CNP Deletion', status: 'success', detail: 'Removed 14 Claim Not Proceeding records' },
  { check: 'Negative Value Check', status: 'success', detail: 'No invalid negative financials detected' },
  { check: 'Duplicate Claim Check', status: 'warning', detail: 'Found 5 duplicate records across carriers' },
  { check: 'LOB Validation', status: 'success', detail: '100% of LOBs mapped to standard taxonomy' },
  { check: 'Mandatory Field Validation', status: 'warning', detail: 'Missing evaluation date on 12 claims' },
];

export const rollupSummaryData = {
  years: [
    { year: '2017', claimCount: 850, totalPaid: '$2,100,000', totalReserve: '$0', totalIncurred: '$2,100,000', payroll: '$12,500,000' },
    { year: '2018', claimCount: 920, totalPaid: '$2,450,000', totalReserve: '$50,000', totalIncurred: '$2,500,000', payroll: '$13,200,000' },
    { year: '2019', claimCount: 1100, totalPaid: '$3,100,000', totalReserve: '$150,000', totalIncurred: '$3,250,000', payroll: '$14,100,000' },
    { year: '2020', claimCount: 850, totalPaid: '$1,900,000', totalReserve: '$300,000', totalIncurred: '$2,200,000', payroll: '$11,500,000' },
    { year: '2021', claimCount: 1250, totalPaid: '$2,800,000', totalReserve: '$850,000', totalIncurred: '$3,650,000', payroll: '$14,800,000' },
    { year: '2022', claimCount: 1400, totalPaid: '$2,500,000', totalReserve: '$1,200,000', totalIncurred: '$3,700,000', payroll: '$15,600,000' },
    { year: '2023', claimCount: 1650, totalPaid: '$1,500,000', totalReserve: '$3,500,000', totalIncurred: '$5,000,000', payroll: '$17,200,000' },
    { year: '2024', claimCount: 1300, totalPaid: '$500,000', totalReserve: '$4,800,000', totalIncurred: '$5,300,000', payroll: '$18,100,000' },
    { year: '2025', claimCount: 130, totalPaid: '$25,000', totalReserve: '$950,000', totalIncurred: '$975,000', payroll: '$2,400,000' },
    { year: 'Total', claimCount: 9450, totalPaid: '$16,875,000', totalReserve: '$11,800,000', totalIncurred: '$28,675,000', payroll: '$119,400,000' }
  ],
  byLob: [
    { lob: 'Workers Compensation', count: 4500, paid: '$7,500,000', reserve: '$5,000,000', incurred: '$12,500,000' },
    { lob: 'General Liability', count: 3200, paid: '$6,000,000', reserve: '$4,200,000', incurred: '$10,200,000' },
    { lob: 'Auto', count: 1250, paid: '$2,500,000', reserve: '$1,600,000', incurred: '$4,100,000' },
    { lob: 'Property', count: 500, paid: '$875,000', reserve: '$1,000,000', incurred: '$1,875,000' },
  ]
};

export const executiveSummaryData = {
  filesProcessed: 50,
  claimsProcessed: 12450,
  validationPassRate: '98.2%',
  duplicateRate: '0.04%',
  extractionAccuracy: '99.5%',
  transformationAccuracy: '99.9%'
};

export const executiveKPIs = [
  { id: 'files', title: 'Files Uploaded', value: '50', icon: 'UploadCloud', color: '59, 130, 246' },
  { id: 'valid', title: 'Valid Loss Runs', value: '45', icon: 'FileCheck2', color: '16, 185, 129' },
  { id: 'claims', title: 'Claims Extracted', value: '12,450', icon: 'Database', color: '16, 185, 129' },
  { id: 'dupes', title: 'Duplicates Found', value: '5', icon: 'Copy', color: '245, 158, 11' },
  { id: 'issues', title: 'Validation Issues', value: '12', icon: 'ShieldAlert', color: '245, 158, 11' },
  { id: 'confidence', title: 'AI Confidence', value: '98.7%', icon: 'BrainCircuit', color: '139, 92, 246' },
  { id: 'time', title: 'Processing Time', value: '48.2s', icon: 'Clock', color: '59, 130, 246' }
];
