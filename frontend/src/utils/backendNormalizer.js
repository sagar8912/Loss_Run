export function normalizeBackendResult(response, fileStats) {
  if (!response) return null;

  const rawRows = response.claimsPreview || [];
  const filesProcessed = response.filesProcessed || 0;
  
  // Calculate Processing Time
  let processingTime = response.processing_time || null;
  if (!processingTime && response.metrics?.sample?.COMPANY_TOTAL?.time_seconds) {
    processingTime = Math.round(response.metrics.sample.COMPANY_TOTAL.time_seconds) + "s";
  }

  // Transformation Mappings derivation
  let transformationMappings = response.transformationMappings || [];
  if (transformationMappings.length === 0 && rawRows.length > 0) {
    const firstRow = rawRows[0];
    const mappings = [];
    const keys = Object.keys(firstRow);
    
    if (keys.includes('claim_id') || keys.includes('claim_number')) {
      mappings.push({ raw: 'Claim Number', std: 'claim_id', type: 'Header Mapping', status: 'success' });
    }
    if (keys.includes('loss_date') || keys.includes('accident_date')) {
      mappings.push({ raw: 'Date of Loss', std: 'loss_date', type: 'Date Mapping', status: 'success' });
    }
    if (keys.includes('paid') || keys.includes('total_paid')) {
      mappings.push({ raw: 'Paid Amount', std: 'paid', type: 'Financial Mapping', status: 'success' });
    }
    if (keys.includes('reserve') || keys.includes('total_reserve')) {
      mappings.push({ raw: 'Reserve Amount', std: 'reserve', type: 'Financial Mapping', status: 'success' });
    }
    if (keys.includes('incurred') || keys.includes('total_incurred')) {
      mappings.push({ raw: 'Incurred Amount', std: 'incurred', type: 'Financial Mapping', status: 'success' });
    }
    if (keys.includes('lob') || keys.includes('line_of_business')) {
      mappings.push({ raw: 'Line of Business', std: 'lob', type: 'LOB Mapping', status: 'success' });
    }
    if (keys.includes('status')) {
      mappings.push({ raw: 'Claim Status', std: 'status', type: 'Status Mapping', status: 'success' });
    }
    transformationMappings = mappings;
  }

  // Validation Checks derivation
  let validationChecks = response.validationChecks || [];
  let derivedValidationIssues = 0;
  
  if (validationChecks.length === 0 && rawRows.length > 0) {
    const checks = [];
    
    // Missing required fields
    const missingFieldsCount = rawRows.filter(r => !r.claim_id && !r.claim_number).length;
    checks.push({
      status: missingFieldsCount > 0 ? 'warning' : 'success',
      check: 'Mandatory Field Validation',
      detail: missingFieldsCount > 0 ? `${missingFieldsCount} records missing required fields` : 'All critical fields present in extracted claims.'
    });
    derivedValidationIssues += missingFieldsCount > 0 ? 1 : 0;

    // Duplicates
    const ids = rawRows.map(r => r.claim_id || r.claim_number).filter(Boolean);
    const uniqueIds = new Set(ids);
    const dupes = ids.length - uniqueIds.size;
    checks.push({
      status: dupes > 0 ? 'warning' : 'success',
      check: 'Duplicate Claim Check',
      detail: dupes > 0 ? `${dupes} duplicate claim IDs found` : '0 duplicate claim IDs found'
    });
    derivedValidationIssues += dupes > 0 ? 1 : 0;

    // Negative financials
    const hasNegative = rawRows.some(r => {
      const p = parseFloat(String(r.total_paid || r.paid || 0).replace(/[^0-9.-]+/g,""));
      const i = parseFloat(String(r.total_incurred || r.incurred || 0).replace(/[^0-9.-]+/g,""));
      return p < 0 || i < 0;
    });
    checks.push({
      status: hasNegative ? 'warning' : 'success',
      check: 'Negative Value Check',
      detail: hasNegative ? 'Invalid negative financials detected' : 'No invalid negative financials detected'
    });
    derivedValidationIssues += hasNegative ? 1 : 0;

    validationChecks = checks;
  }

  const validationIssues = response.validation_issues_count || (response.metrics?.processing_errors !== undefined ? response.metrics.processing_errors : derivedValidationIssues);

  // Rollup derivation
  let rolledUpRows = response.rolledUpRows || null;
  let lobSummary = [];
  let yearWiseSummary = [];
  
  if (!rolledUpRows && rawRows.length > 0) {
    const lobMap = {};
    const yearMap = {};

    rawRows.forEach(r => {
      const lob = r.line_of_business || r.lob || 'Unknown';
      
      const dateStr = r.policy_effective_date || r.loss_date || r.accident_date || r.report_date || '';
      let year = 'Unknown';
      const yearMatch = String(dateStr).match(/\d{4}/);
      if (yearMatch) year = yearMatch[0];

      const p = parseFloat(String(r.total_paid || r.paid || 0).replace(/[^0-9.-]+/g,"")) || 0;
      const res = parseFloat(String(r.total_reserve || r.reserve || 0).replace(/[^0-9.-]+/g,"")) || 0;
      const i = parseFloat(String(r.total_incurred || r.incurred || 0).replace(/[^0-9.-]+/g,"")) || 0;

      if (!lobMap[lob]) lobMap[lob] = { count: 0, paid: 0, reserve: 0, incurred: 0 };
      lobMap[lob].count++;
      lobMap[lob].paid += p;
      lobMap[lob].reserve += res;
      lobMap[lob].incurred += i;

      if (!yearMap[year]) yearMap[year] = { count: 0, paid: 0, reserve: 0, incurred: 0 };
      yearMap[year].count++;
      yearMap[year].paid += p;
      yearMap[year].reserve += res;
      yearMap[year].incurred += i;
    });

    const formatCurrency = (val) => '$' + val.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});

    lobSummary = Object.keys(lobMap).map(k => ({
      lob: k,
      count: lobMap[k].count,
      paid: formatCurrency(lobMap[k].paid),
      reserve: formatCurrency(lobMap[k].reserve),
      incurred: formatCurrency(lobMap[k].incurred)
    }));

    yearWiseSummary = Object.keys(yearMap).sort().map(k => ({
      year: k,
      claimCount: yearMap[k].count,
      totalPaid: formatCurrency(yearMap[k].paid),
      totalReserve: formatCurrency(yearMap[k].reserve),
      totalIncurred: formatCurrency(yearMap[k].incurred)
    }));

    rolledUpRows = { lobSummary, yearWiseSummary };
  } else if (rolledUpRows) {
    lobSummary = rolledUpRows.lobSummary || [];
    yearWiseSummary = rolledUpRows.yearWiseSummary || [];
  }

  const duplicatesFound = response.duplicatesFound || 0;

  return {
    filesUploaded: fileStats?.total || filesProcessed,
    validLossRuns: response.valid_loss_runs || filesProcessed,
    claimsExtracted: response.claims_count || response.metrics?.num_claims || rawRows.length,
    duplicatesFound: duplicatesFound,
    validationIssues: validationIssues,
    processingTime: processingTime,
    aiConfidence: response.aiConfidence || 'N/A',
    rawRows,
    rolledUpRows,
    lobSummary,
    yearWiseSummary,
    validationChecks,
    transformationMappings,
    exportFiles: response.outputCsvPath ? [response.outputCsvPath] : []
  };
}
