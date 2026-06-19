export function normalizeBackendResult(response, fileStats) {
  if (!response) return null;

  const normalizedResult = {
    filesUploaded: fileStats?.total || response.filesUploaded || 0,
    validLossRuns: response.validLossRuns || 0,
    claimsExtracted: response.claimsExtracted || 0,
    duplicatesFound: response.duplicatesFound || 0,
    validationIssues: response.validationIssues || 0,
    processingTime: response.processingTime || null,
    aiConfidence: response.aiConfidence || 'N/A',
    rawRows: response.rawRows || [],
    rolledUpRows: response.rollupSummary || null,
    lobSummary: response.rollupSummary?.lobSummary || [],
    yearWiseSummary: response.rollupSummary?.yearWiseSummary || [],
    validationChecks: response.validationChecks || [],
    transformationMappings: response.transformationMappings || [],
    exportFiles: response.exportFiles || []
  };

  console.log("Normalized Backend Result:", normalizedResult);
  return normalizedResult;
}
