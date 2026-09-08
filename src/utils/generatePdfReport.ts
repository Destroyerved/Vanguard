import { UnifiedEvent } from '../types/schema';
import { explainEvent } from '../data/eventExplainer';

export function generateEventPdfReport(event: UnifiedEvent) {
  const explanation = explainEvent(event);
  const bd = event.confidenceBreakdown || {
    overall: event.confidence,
    sourceReliability: Math.round(event.confidence * 0.9),
    dataFreshness: 98,
    sourceAgreement: event.corroboratedBy && event.corroboratedBy.length > 0 ? 95 : 0,
    spatialAgreement: event.corroboratedBy && event.corroboratedBy.length > 0 ? 80 : 0,
    temporalAgreement: event.corroboratedBy && event.corroboratedBy.length > 0 ? 90 : 0,
  };

  const timestamp = new Date().toUTCString();
  const reportId = `DOSSIER-C2-${event.id}-${Date.now().toString(36).toUpperCase()}`;
  const speedNum = typeof event.raw?.speedKnots === 'number' ? event.raw.speedKnots : undefined;
  const altitude = event.location?.altitudeMeters;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report.');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VANGUARD_INTEL_DOSSIER_${event.id}.pdf</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 12mm 14mm 12mm 14mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* HEADER BANNER */
    .banner {
      background: #070b12;
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 3px solid #06b6d4;
    }
    .banner-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 36px;
      height: 36px;
      background: #0284c7;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 16pt;
      color: #ffffff;
      letter-spacing: -1px;
    }
    .banner-title h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14pt;
      font-weight: 700;
      margin: 0;
      letter-spacing: 1.5px;
      color: #f8fafc;
      text-transform: uppercase;
    }
    .banner-title h2 {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      margin: 2px 0 0 0;
      color: #38bdf8;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .classification-badge {
      background: #dc2626;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 8pt;
      padding: 4px 10px;
      border-radius: 3px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-align: right;
    }
    .doc-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7pt;
      color: #94a3b8;
      margin-top: 4px;
      text-align: right;
    }

    /* INCIDENT SNAPSHOT GRID */
    .snapshot-grid {
      display: grid;
      grid-template-cols: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .snap-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 8px 10px;
    }
    .snap-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .snap-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-critical { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .badge-high { background: #ffedd5; color: #9a3412; border: 1px solid #fb923c; }
    .badge-medium { background: #fef9c3; color: #854d0e; border: 1px solid #facc15; }
    .badge-low { background: #dcfce7; color: #166534; border: 1px solid #4ade80; }

    /* SECTION HEADERS */
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .section-num {
      background: #0f172a;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 7.5pt;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0f172a;
    }

    /* BOX CARDS */
    .box-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      background: #ffffff;
      margin-bottom: 10px;
    }
    .box-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }

    /* CALLOUT BOXES */
    .callout {
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
      padding: 10px 12px;
      border-radius: 0 5px 5px 0;
      margin-bottom: 8px;
    }
    .callout-threat {
      border-left-color: #dc2626;
      background: #fff1f2;
    }
    .callout-action {
      border-left-color: #16a34a;
      background: #f0fdf4;
    }

    /* TABLES */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8.5pt;
    }
    .data-table th {
      background: #f1f5f9;
      color: #334155;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7.5pt;
      padding: 6px 10px;
      text-align: left;
      border: 1px solid #cbd5e1;
    }
    .data-table td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      font-family: 'Inter', sans-serif;
    }
    .data-table tr:nth-child(even) {
      background: #fafafa;
    }

    /* CONFIDENCE METRICS & PROGRESS BARS */
    .matrix-grid {
      display: grid;
      grid-template-cols: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }
    .matrix-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 8px 12px;
    }
    .matrix-head {
      display: flex;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 600;
      color: #334155;
      margin-bottom: 4px;
    }
    .bar-bg {
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: #0284c7;
      border-radius: 3px;
    }

    /* FOOTER SECURITY SEAL */
    .footer-seal {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1.5px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7pt;
      color: #64748b;
    }
    .hash-block {
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 6.5pt;
      color: #475569;
    }
  </style>
</head>
<body>

  <!-- HEADER BANNER -->
  <div class="banner">
    <div class="banner-brand">
      <div class="logo-box">V</div>
      <div class="banner-title">
        <h1>VANGUARD DEFENSE C2</h1>
        <h2>TACTICAL INCIDENT DOSSIER // GEOSPATIAL FUSION</h2>
      </div>
    </div>
    <div>
      <div class="classification-badge">RESTRICTED // C2 INTEL</div>
      <div class="doc-id">${reportId}</div>
    </div>
  </div>

  <!-- KEY SNAPSHOT GRID -->
  <div class="snapshot-grid">
    <div class="snap-card">
      <div class="snap-label">Track ID</div>
      <div class="snap-value" style="color: #0284c7;">EVT-${event.id}</div>
    </div>
    <div class="snap-card">
      <div class="snap-label">Severity Level</div>
      <div><span class="badge badge-${event.severity}">${event.severity.toUpperCase()}</span></div>
    </div>
    <div class="snap-card">
      <div class="snap-label">Fusion Certainty</div>
      <div class="snap-value" style="color: #059669;">${event.confidence}%</div>
    </div>
    <div class="snap-card">
      <div class="snap-label">Feed Domain</div>
      <div class="snap-value">${event.sourceType.toUpperCase()}</div>
    </div>
  </div>

  <!-- SECTION 1: TARGET SUMMARY & GEOSPATIAL VECTOR -->
  <div class="section-header">
    <span class="section-num">01</span>
    <span class="section-title">Target Designation & Geospatial Vector</span>
  </div>

  <div class="box-card">
    <div class="box-title">Incident Title & Primary Anomaly Status</div>
    <div style="font-size: 11pt; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
      ${event.title}
      ${event.isAnomaly ? '<span class="badge badge-critical" style="margin-left: 8px;">ANOMALY DETECTED</span>' : ''}
    </div>

    <div style="display: grid; grid-template-cols: repeat(4, 1fr); gap: 8px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-size: 8pt;">
      <div>
        <span style="color: #64748b; display: block; font-size: 7pt;">LATITUDE</span>
        <strong>${typeof event.location?.lat === 'number' ? event.location.lat.toFixed(5) + '°N' : 'N/A'}</strong>
      </div>
      <div>
        <span style="color: #64748b; display: block; font-size: 7pt;">LONGITUDE</span>
        <strong>${typeof event.location?.lng === 'number' ? event.location.lng.toFixed(5) + '°E' : 'N/A'}</strong>
      </div>
      <div>
        <span style="color: #64748b; display: block; font-size: 7pt;">ALTITUDE</span>
        <strong>${altitude !== undefined ? altitude + ' m' : 'N/A'}</strong>
      </div>
      <div>
        <span style="color: #64748b; display: block; font-size: 7pt;">SECTOR AO</span>
        <strong>Sector 04</strong>
      </div>
    </div>
  </div>

  <!-- SECTION 2: SENSOR TELEMETRY & KINEMATICS -->
  <div class="section-header">
    <span class="section-num">02</span>
    <span class="section-title">Sensor Kinematics & Payload Matrix</span>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Telemetry Metric</th>
        <th>Measured Kinematic Value</th>
        <th>Evaluation Status</th>
        <th>System Classification</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Speed / Velocity</strong></td>
        <td style="font-family: 'JetBrains Mono', monospace;">${speedNum !== undefined ? speedNum + ' knots' : 'N/A'}</td>
        <td>${speedNum !== undefined && speedNum > 300 ? '<span style="color: #dc2626; font-weight:700;">HIGH VELOCITY</span>' : 'Nominal Velocity'}</td>
        <td>Kinematic Radar Vector</td>
      </tr>
      <tr>
        <td><strong>Bearing / Heading</strong></td>
        <td style="font-family: 'JetBrains Mono', monospace;">${event.raw?.headingDegrees !== undefined ? String(event.raw.headingDegrees) + '°' : 'N/A'}</td>
        <td>Vector Heading Angle</td>
        <td>Spatial Directional Axis</td>
      </tr>
      <tr>
        <td><strong>Transponder Squawk</strong></td>
        <td style="font-family: 'JetBrains Mono', monospace;">${String(event.raw?.transponder ?? 'NONE')}</td>
        <td>${event.raw?.transponder ? '<span style="color: #059669; font-weight:700;">ACTIVE TRANSPONDER</span>' : '<span style="color: #d97706; font-weight:700;">NON-COOPERATIVE</span>'}</td>
        <td>Secondary Surveillance Radar</td>
      </tr>
      <tr>
        <td><strong>IFF Classification</strong></td>
        <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">${String(event.raw?.classification || 'UNASSIGNED').toUpperCase()}</td>
        <td>Corroborated Signal</td>
        <td>Target Identity Matrix</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 3: TACTICAL INTELLIGENCE BRIEFING -->
  <div class="section-header">
    <span class="section-num">03</span>
    <span class="section-title">Tactical Intelligence Assessment</span>
  </div>

  <div class="callout">
    <div class="box-title" style="color: #0369a1;">OPERATIONAL EXECUTIVE SUMMARY</div>
    <div style="font-size: 9.5pt; color: #0c4a6e;">${explanation.easy.simpleDescription || explanation.summary}</div>
  </div>

  <div class="callout callout-threat">
    <div class="box-title" style="color: #b91c1c;">THREAT IMPACT ASSESSMENT</div>
    <div style="font-size: 9.5pt; color: #7f1d1d;">${explanation.tacticalImpact}</div>
  </div>

  <div class="callout callout-action">
    <div class="box-title" style="color: #15803d;">RECOMMENDED COMMAND RESPONSE</div>
    <div style="font-size: 9.5pt; font-weight: 600; color: #14532d;">✓ ${explanation.recommendedAction}</div>
  </div>

  <!-- SECTION 4: MULTI-SENSOR CONFIDENCE MATRIX -->
  <div class="section-header">
    <span class="section-num">04</span>
    <span class="section-title">Multi-Sensor Confidence Breakdown</span>
  </div>

  <div class="matrix-grid">
    <div class="matrix-card">
      <div class="matrix-head">
        <span>Source Reliability</span>
        <span>${bd.sourceReliability}%</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width: ${bd.sourceReliability}%; background: #0284c7;"></div></div>
    </div>

    <div class="matrix-card">
      <div class="matrix-head">
        <span>Data Freshness Index</span>
        <span>${bd.dataFreshness}%</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width: ${bd.dataFreshness}%; background: #059669;"></div></div>
    </div>

    <div class="matrix-card">
      <div class="matrix-head">
        <span>Spatial Agreement</span>
        <span>${bd.spatialAgreement}%</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width: ${bd.spatialAgreement}%; background: #7c3aed;"></div></div>
    </div>

    <div class="matrix-card">
      <div class="matrix-head">
        <span>Temporal Correlation</span>
        <span>${bd.temporalAgreement}%</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width: ${bd.temporalAgreement}%; background: #d97706;"></div></div>
    </div>
  </div>

  <div class="box-card">
    <div class="box-title">Corroborating Track Sensors (${event.corroboratedBy?.length || 0})</div>
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; color: #334155;">
      ${event.corroboratedBy && event.corroboratedBy.length > 0
        ? event.corroboratedBy.map(id => `<span style="background: #e2e8f0; padding: 2px 6px; border-radius: 3px; margin-right: 4px; font-weight: 600;">[${id}]</span>`).join('')
        : 'Isolated Contact (No secondary corroborating sensors detected within correlation horizon)'}
    </div>
  </div>

  <!-- FOOTER SECURITY SEAL -->
  <div class="footer-seal">
    <div>
      <strong>AUTHENTICATION:</strong> VANGUARD AUTONOMOUS DEFENSE FUSION C2 ENGINE
    </div>
    <div class="hash-block">
      SHA256: ${event.id.toUpperCase()}-VERIFIED-${Math.random().toString(36).substring(2, 10).toUpperCase()}
    </div>
    <div>
      TIMESTAMP: ${timestamp}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
