import type { AISummary, ThreatLevel, UnifiedEvent } from '../types/vanguard';

export function downloadSitrepText(briefing: AISummary, events: UnifiedEvent[], threatLevel: ThreatLevel) {
  const dateStr = new Date().toUTCString();
  const defconMap: Record<ThreatLevel, string> = {
    green: 'DEFCON 5 / NORMAL READINESS',
    yellow: 'DEFCON 4 / INCREASED INTELLIGENCE WATCH',
    orange: 'DEFCON 3 / AIR DEFENSE ELEVATED READINESS',
    red: 'DEFCON 1 / MAXIMUM TACTICAL COMBAT READINESS'
  };

  const sitrepContent = `
================================================================================
                      HEADQUARTERS STRATEGIC COMMAND
                 VANGUARD COMMON OPERATING PICTURE (COP)
                     INTELLIGENCE SITUATION REPORT
================================================================================
TIMESTAMP (ZULU)   : ${dateStr}
THREAT POSTURE     : ${defconMap[threatLevel]}
SECURITY CLEARANCE : TOP SECRET // EYES ONLY // NOFORN
THEATER SECTOR     : SECTOR-7 NORTHERN FRONTIER COMMAND

--------------------------------------------------------------------------------
1. EXECUTIVE INTELLIGENCE SUMMARY
--------------------------------------------------------------------------------
HEADLINE: ${briefing.headline}

${briefing.executiveSummary}

--------------------------------------------------------------------------------
2. KEY GROUNDED DEVELOPMENTS (EVIDENCE-LINKED)
--------------------------------------------------------------------------------
${briefing.keyDevelopments.map((kd, idx) => `[${idx + 1}] ${kd.point}\n    Supporting Evidence: ${kd.supportingEventIds.join(', ')}`).join('\n\n')}

--------------------------------------------------------------------------------
3. RECOMMENDED COURSES OF ACTION (COA MATRIX)
--------------------------------------------------------------------------------
${briefing.coursesOfAction.map((coa, idx) => `
COA #${idx + 1}: ${coa.codename} - ${coa.title}
-----------------------------------------------------------------
Description        : ${coa.description}
Success Probability: ${coa.successProbability}% | Collateral Risk: ${coa.collateralRisk}
Recommended Urgency: Priority Level ${coa.recommendedUrgency}/5
Tactical Advantages: ${coa.pros.join('; ')}
Operational Tradeoffs: ${coa.tradeoffs.join('; ')}
`).join('\n')}

--------------------------------------------------------------------------------
4. HIGH-PRIORITY MULTI-SOURCE EVENT LOG
--------------------------------------------------------------------------------
${events.slice(0, 10).map(e => `[${e.id}] [${e.sourceType.toUpperCase()}] [${e.severity.toUpperCase()}] Confidence: ${e.confidence}% | ${e.title}
  Location: (${e.location.lat.toFixed(4)}, ${e.location.lng.toFixed(4)}) Alt: ${e.location.altitudeMeters || 0}m
  Details: ${e.description}
  Corroborated by: ${e.corroboratedBy.length > 0 ? e.corroboratedBy.join(', ') : 'Single-source sensor'}`).join('\n\n')}

================================================================================
AUTHENTICATED BY: VANGUARD C4ISR AI ENGINE // END OF TRANSMISSION
================================================================================
`;

  const blob = new Blob([sitrepContent.trim()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SITREP_VANGUARD_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
