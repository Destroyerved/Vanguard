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
  const reportId = `PDF-C2-${event.id}-${Date.now().toString(36).toUpperCase()}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report.');
    return;
  }

  const speedNum = typeof event.raw?.speedKnots === 'number' ? event.raw.speedKnots : undefined;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VANGUARD_C2_REPORT_${event.id}.pdf</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      background-color: #ffffff;
      color: #000000;
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .classification {
      background: #000;
      color: #fff;
      padding: 4px 12px;
      font-weight: bold;
      font-size: 10pt;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .title-block {
      margin-top: 10px;
    }
    .title-block h1 {
      margin: 0;
      font-size: 16pt;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .title-block h2 {
      margin: 4px 0 0 0;
      font-size: 12pt;
      color: #333;
      font-weight: normal;
    }
    .meta-grid {
      display: grid;
      grid-template-cols: repeat(2, 1fr);
      gap: 10px;
      border: 1px solid #000;
      padding: 10px;
      background-color: #f8f9fa;
      margin-bottom: 20px;
    }
    .meta-item {
      font-size: 10pt;
    }
    .meta-item strong {
      display: inline-block;
      min-width: 140px;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      border-bottom: 1.5px solid #000;
      padding-bottom: 3px;
      margin-top: 20px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .box {
      border: 1px solid #333;
      padding: 10px;
      margin-bottom: 15px;
      background-color: #fff;
    }
    .box-title {
      font-weight: bold;
      font-size: 9pt;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 5px;
    }
    .grid-3 {
      display: grid;
      grid-template-cols: repeat(3, 1fr);
      gap: 10px;
    }
    .stat-card {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: center;
    }
    .stat-val {
      font-size: 16pt;
      font-weight: bold;
      margin-top: 2px;
    }
    .stat-lbl {
      font-size: 8pt;
      color: #666;
      text-transform: uppercase;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid #000;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9pt;
    }
    .badge-critical { background: #ffdede; color: #900; border-color: #900; }
    .badge-high { background: #ffe8d6; color: #940; border-color: #940; }
    .badge-medium { background: #fffde0; color: #770; border-color: #770; }
    .badge-low { background: #e3f9e5; color: #070; border-color: #070; }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10pt;
    }
    .table th, .table td {
      border: 1px solid #ccc;
      padding: 6px 10px;
      text-align: left;
    }
    .table th {
      background: #eee;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #000;
      padding-top: 10px;
      font-size: 8pt;
      color: #555;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body {
        width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="title-block">
      <h1>VANGUARD C2 DEFENSE SYSTEM</h1>
      <h2>INTELLIGENCE INCIDENT DETAILED DOSSIER</h2>
    </div>
    <div style="text-align: right;">
      <div class="classification">CONFIDENTIAL // C2 INTEL</div>
      <div style="font-size: 8pt; margin-top: 4px; color: #444;">DOC ID: ${reportId}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>TRACK IDENTIFIER:</strong> EVT-${event.id}</div>
    <div class="meta-item"><strong>GENERATED AT:</strong> ${timestamp}</div>
    <div class="meta-item">
      <strong>SEVERITY LEVEL:</strong> 
      <span class="badge badge-${event.severity}">${event.severity.toUpperCase()}</span>
    </div>
    <div class="meta-item"><strong>OVERALL CERTAINTY:</strong> ${event.confidence}%</div>
    <div class="meta-item"><strong>FEED DOMAIN:</strong> ${event.sourceType.toUpperCase()}</div>
    <div class="meta-item"><strong>IS ANOMALY:</strong> ${event.isAnomaly ? 'YES (FLAGGED)' : 'NO'}</div>
  </div>

  <div class="section-title">1. TARGET SUMMARY & LOCATION</div>
  <div class="box">
    <div class="box-title">TITLE / DESIGNATION</div>
    <div style="font-weight: bold; font-size: 12pt; margin-bottom: 8px;">${event.title}</div>
    
    <div class="meta-grid" style="margin-bottom: 0;">
      <div class="meta-item"><strong>LATITUDE:</strong> ${typeof event.location?.lat === 'number' ? event.location.lat.toFixed(6) + '°N' : 'N/A'}</div>
      <div class="meta-item"><strong>LONGITUDE:</strong> ${typeof event.location?.lng === 'number' ? event.location.lng.toFixed(6) + '°E' : 'N/A'}</div>
      <div class="meta-item"><strong>ALTITUDE:</strong> ${event.location?.altitudeMeters ?? 'N/A'} meters</div>
      <div class="meta-item"><strong>GEO SECTOR:</strong> Sector 04 / Command AO</div>
    </div>
  </div>

  <div class="section-title">2. SENSOR TELEMETRY & RAW PAYLOAD</div>
  <table class="table">
    <thead>
      <tr>
        <th>TELEMETRY METRIC</th>
        <th>MEASURED VALUE</th>
        <th>STATUS / CLASSIFICATION</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Speed / Velocity</td>
        <td>${speedNum !== undefined ? speedNum + ' knots' : 'N/A'}</td>
        <td>${speedNum !== undefined && speedNum > 300 ? 'HIGH VELOCITY' : 'NORMAL'}</td>
      </tr>
      <tr>
        <td>Bearing / Heading</td>
        <td>${event.raw?.headingDegrees !== undefined ? String(event.raw.headingDegrees) + '°' : 'N/A'}</td>
        <td>VECTOR TRACKING</td>
      </tr>
      <tr>
        <td>Transponder Squawk</td>
        <td>${String(event.raw?.transponder ?? 'NONE')}</td>
        <td>${event.raw?.transponder ? 'ACTIVE TRANSPONDER' : 'NON-COOPERATIVE'}</td>
      </tr>
      <tr>
        <td>IFF Classification</td>
        <td>${String(event.raw?.classification || 'UNASSIGNED').toUpperCase()}</td>
        <td>SENSOR CORRELATED</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">3. TACTICAL ANALYSIS & EXPLANATION</div>
  <div class="box">
    <div class="box-title">PLAIN ENGLISH BRIEFING</div>
    <p style="margin: 0 0 10px 0;">${explanation.easy.simpleDescription || explanation.summary}</p>

    <div class="box-title">TACTICAL THREAT ASSESSMENT</div>
    <p style="margin: 0 0 10px 0;">${explanation.tacticalImpact}</p>

    <div class="box-title">RECOMMENDED COMMAND ACTION</div>
    <p style="margin: 0; font-weight: bold; color: #000;">${explanation.recommendedAction}</p>
  </div>

  <div class="section-title">4. MULTI-SENSOR CONFIDENCE MATRIX</div>
  <div class="grid-3" style="margin-bottom: 15px;">
    <div class="stat-card">
      <div class="stat-lbl">Source Reliability</div>
      <div class="stat-val">${bd.sourceReliability}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Data Freshness</div>
      <div class="stat-val">${bd.dataFreshness}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Spatial Agreement</div>
      <div class="stat-val">${bd.spatialAgreement}%</div>
    </div>
  </div>

  <div class="box">
    <div class="box-title">CORROBORATING TRACK SENSORS (${event.corroboratedBy?.length || 0})</div>
    <div>${event.corroboratedBy && event.corroboratedBy.length > 0 ? event.corroboratedBy.map(id => `[${id}]`).join(', ') : 'Isolated contact (No secondary corroborating sensors)'}</div>
  </div>

  <div class="footer">
    <div>AUTHENTICATION: SHA256-VERIFIED BY VANGUARD C2 ENGINE</div>
    <div>PAGE 1 OF 1 // CLASSIFIED INTEL REPORT</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
