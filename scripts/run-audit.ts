import { runFullSystemAudit } from '../src/server/engine/fullSystemAudit.js';

async function main() {
  console.log('====================================================');
  console.log('RUNNING MASTERYFLOW PHASE 7 PRODUCTION READINESS AUDIT');
  console.log('====================================================\n');

  try {
    const report = await runFullSystemAudit();

    console.log(`Audit Timestamp: ${report.timestamp}`);
    console.log(`Overall Status:  ${report.overallStatus === 'PASSED' ? 'PASSED (100% READY)' : 'FAILED'}`);
    console.log(`Checks Passed:   ${report.passedChecks} / ${report.totalChecks} (${report.passRate})`);
    console.log(`Stress Pass Rate: ${report.stressTestPassRate}`);
    console.log(`Canonical Concepts: ${report.canonicalConceptCount}\n`);

    console.log('--- DETAILED AUDIT CHECKLIST ---');
    for (const check of report.checks) {
      const statusIcon = check.passed ? '[PASS]' : '[FAIL]';
      console.log(`${statusIcon} [${check.category}] ${check.title}`);
      console.log(`       ${check.details}\n`);
    }

    console.log('--- SIMULATED ADAPTIVE LEARNING CYCLE ---');
    console.log(`Student ID:            ${report.simulationSummary.studentId}`);
    console.log(`Initial Mastery:       ${(report.simulationSummary.initialMastery * 100).toFixed(1)}%`);
    console.log(`Identified Gap:        ${report.simulationSummary.identifiedGapConcept}`);
    console.log(`Post-Exam Deficit:     ${(report.simulationSummary.postExamMastery * 100).toFixed(1)}%`);
    console.log(`Next Recommendation:   ${report.simulationSummary.finalRecommendationAction} on ${report.simulationSummary.finalRecommendationConcept}`);
    console.log(`Closed Loop Verified:  ${report.simulationSummary.loopVerified ? 'YES' : 'NO'}\n`);

    if (report.overallStatus !== 'PASSED') {
      process.exit(1);
    }
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  }
}

main();
