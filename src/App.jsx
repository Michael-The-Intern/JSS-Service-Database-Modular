// src/App.jsx
// Root application component — routing, auth, sidebar, global modals.
// This is the single entry point rendered by src/main.jsx.

import React from 'react';
import { AppContext } from './context/AppContext.jsx';
import { _supa, PERSIST, savePersistent, loadPersistent } from './lib/supabase.js';

// ── Shared components ──────────────────────────────────────────────────────
import { PriceInput } from './components/shared/PriceInput.jsx';
import { SearchBox } from './components/shared/SearchBox.jsx';
import { MultiSelectDropdown } from './components/shared/MultiSelectDropdown.jsx';
import { GlobalSearch } from './components/shared/GlobalSearch.jsx';
import { StatCard } from './components/shared/StatCard.jsx';
import { Badge, DQBadge, ArchiveBadge } from './components/shared/Badge.jsx';
import { Table } from './components/shared/Table.jsx';

// ── Page modules ───────────────────────────────────────────────────────────
import { Dashboard, EventModal, MorningActionReport } from './components/dashboard/Dashboard.jsx';
import { ArchiveReview } from './components/archive/ArchiveReview.jsx';
import { ArchiveExportModal } from './components/archive/ArchiveExportModal.jsx';
import { ArchiveSubmitModal } from './components/archive/ArchiveSubmitModal.jsx';
import { DetailPanel } from './components/detail/DetailPanel.jsx';
import { ImportWizard } from './components/import/ImportWizard.jsx';
import { ServiceLifePhase } from './components/service-life/ServiceLifePhase.jsx';
import { ReferenceData } from './components/reference/ReferenceData.jsx';
import { AdminRoles } from './components/admin/AdminRoles.jsx';
import { ActionQueues } from './components/action-queues/ActionQueues.jsx';
import { AuditHistory } from './components/audit/AuditHistory.jsx';
import { ServicePriceReview } from './components/pricing/ServicePriceReview.jsx';
import { ReportsExports } from './components/reports/ReportsExports.jsx';
import { NotificationsPanel } from './components/notifications/NotificationsPanel.jsx';
import { MasterTerminal } from './components/master/MasterTerminal.jsx';
import { DataQualityCenter } from './components/dq/DataQualityCenter.jsx';
import { QuickActions } from './components/quickactions/QuickActions.jsx';

// ── App code (extracted from monolith) ────────────────────────────────────

function App() {
  const [page, setPage] = React.useState('Dashboard');
  const [selectedPart, setSelectedPart] = React.useState(null);
  const [filter, setFilter] = React.useState('All');
  const [selectedEventDate, setSelectedEventDate] = React.useState(new Date().getDate());
  const [sourceHistoryFor, setSourceHistoryFor] = React.useState(null);
  const [oemFilter, setOemFilter] = React.useState('All');
  const [plantFilter, setPlantFilter] = React.useState('All');
  const [categoryFilter, setCategoryFilter] = React.useState('All');
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState('asc');

  const fileInputRef = React.useRef(null);

  const [dqSelOEMs, setDqSelOEMs] = React.useState([]);
  const [dqSelIdentifiers, setDqSelIdentifiers] = React.useState([]);
  const [dqSelPlants, setDqSelPlants] = React.useState([]);
  const [dqSelCategories, setDqSelCategories] = React.useState([]);

  const [rawParts, setRawParts] = React.useState([]);
  const [rawAudit, setRawAudit] = React.useState([]);
  const [notifications, setNotifications] = React.useState([]);

  // Shared constants surfaced via ctx
  const SAFE_DEFAULTS = {
    oem: '',
    plant: '',
    customerPart: '',
    jss: '',
    altJss: '',
    desc: '',
    active: 'ACTIVE',
    type: '',
    component: 'UNASSIGNED',
    subcategory: '',
    program: '',
    price: '',
    cost: '',
    demand: 0,
    backlog: 0,
    serviceSop: '',
    serviceEop: '',
    serialSop: '',
    serialEop: '',
    category: '',
    productCategory: '',
    recommendation: '',
    owner: '',
    notes: ''
  };

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  // Seed arrays consumed by GlobalSearch
  const rawTasks = [];
  const riskRows = [];

function parseDelimited(text){
  var lines = text.split(/\r\n|\n|\r/).filter(function(l){ return l.trim() !== ''; });
  if (lines.length === 0) return { headers: [], rows: [] };
  function splitLine(l){
    var out = [], cur = '', q = false;
    for (var i = 0; i < l.length; i++){
      var ch = l[i];
      if (ch === '"'){ if (q && l[i+1] === '"'){ cur += '"'; i++; } else { q = !q; } }
      else if (ch === ',' && !q){ out.push(cur); cur = ''; }
      else { cur += ch; }
    }
    out.push(cur);
    return out;
  }
  var headers = splitLine(lines[0]).map(function(h){ return h.trim(); });
  var rows = lines.slice(1).map(function(l){ var c = splitLine(l); var o = {}; headers.forEach(function(h, i){ o[h] = (c[i] || '').trim(); }); return o; });
  return { headers: headers, rows: rows };
}

React.useEffect(function() {
    var notifs = [];
    var liveParts = rawParts.map(function(p){ return Object.assign({}, p, { dq: dqFlag(p) }); });
    var inactiveWithDemand = liveParts.filter(function(p){ return String(p.active||'').toUpperCase()==='INACTIVE' && p.demand > 0; });
    if (inactiveWithDemand.length > 0) notifs.push({ id:'N-live-01', icon:'🛑', title: inactiveWithDemand.length + ' inactive part' + (inactiveWithDemand.length>1?'s':'') + ' still have demand', body:'Hard-stop condition — review before any archive run.', page:'Master Terminal', time:'now', read:false, tone:'red' });
    var missingPrice = liveParts.filter(function(p){ return !p.price && String(p.active||'').toUpperCase()==='ACTIVE'; });
    if (missingPrice.length > 0) notifs.push({ id:'N-live-02', icon:'💲', title: missingPrice.length + ' part' + (missingPrice.length>1?'s':'') + ' missing a service price', body:'Cannot quote or ship until pricing is confirmed.', page:'Service Price Review', time:'now', read:false, tone:'orange' });
    var dqDupes = liveParts.filter(function(p){ return p.dq && p.dq.type === 'DUPLICATE'; });
    if (dqDupes.length > 0) notifs.push({ id:'N-live-03', icon:'⚠️', title: dqDupes.length + ' duplicate conflict' + (dqDupes.length>1?'s':'') + ' detected', body:'Same customer part ID found under multiple OEMs or prices.', page:'Data Quality Center', time:'now', read:false, tone:'indigo' });
    var archiveReady = liveParts.filter(function(p){ return String(p.active||'').toUpperCase()==='INACTIVE' && !(p.demand > 0) && !(p.backlog > 0); });
    if (archiveReady.length > 0) notifs.push({ id:'N-live-04', icon:'🧹', title: archiveReady.length + ' archive candidate' + (archiveReady.length>1?'s':'') + ' ready for review', body:'Passed all safety checks. Ready to clean up.', page:'Archive Review', time:'now', read:false, tone:'green' });
    var lastImport = (rawAudit||[]).filter(function(a){ return a.action === 'IMPORT COMMIT'; })[0];
    if (lastImport) notifs.push({ id:'N-live-05', icon:'📥', title: (lastImport.target||'Import') + ' completed', body:'Data imported successfully. Review in Import Wizard.', page:'Import Wizard', time: lastImport.ts ? new Date(lastImport.ts).toLocaleDateString() : 'recently', read:true, tone:'blue' });
    setNotifications(notifs);
  }, [rawParts, rawAudit]);


  
function handleUploadClick(){ if (fileInputRef.current) fileInputRef.current.click(); }

function handleFileChosen(e){
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  var name = file.name.toLowerCase();
  var reader = new FileReader();
  reader.onload = function(ev){
    var headers = [], rows = [];
    try {
      if ((name.endsWith('.xlsx') || name.endsWith('.xls')) && typeof XLSX !== 'undefined'){
        // Store workbook buffer for later use in Apply & Scan
        importWorkbookBuf.current = ev.target.result;
        var wb = XLSX.read(ev.target.result, { type: 'array' });
        // Detect all sheets + row counts
        var sheetList = wb.SheetNames.map(function(sn){
          var ws2 = wb.Sheets[sn];
          var j2 = XLSX.utils.sheet_to_json(ws2, { defval: '', header: 1 });
          // Skip title rows: find the first row where >50% cells are non-empty unique strings
          var headerRowIdx = 0;
          for (var ri = 0; ri < Math.min(5, j2.length); ri++) {
            var r = j2[ri]; var filled = r.filter(function(c){ return c !== '' && c !== null && c !== undefined; }).length;
            if (filled >= Math.max(3, r.length * 0.5)) { headerRowIdx = ri; break; }
          }
          var dataRows = j2.length - headerRowIdx - 1;
          return { name: sn, rowCount: Math.max(0, dataRows), headerRowIdx: headerRowIdx };
        });
        setImportSheets(sheetList);
        setImportSelectedSheets(sheetList.map(function(s){ return s.name; }));
        setImportRowFilters([]);
        setImportAiReview({});
        setImportFile({ name: file.name, source: file.name, headers: [], rows: 0, dataRows: [], rowCount: 0, sheet: '', sample: [] });
        setImportStep(1);
        setPage('Import Wizard');
        e.target.value = '';
        return;
      } else {
        var parsed = parseDelimited(typeof ev.target.result === 'string' ? ev.target.result : new TextDecoder().decode(ev.target.result));
        headers = parsed.headers; rows = parsed.rows;
      }
    } catch(err){ alert('Could not parse file: ' + err.message); return; }
    if (!headers.length){ alert('No columns detected in ' + file.name); return; }
    // CSV path — no sheet selection needed, go straight to Configure & Filter with no sheets
    setImportSheets([]);
    setImportSelectedSheets([]);
    setImportRowFilters([]);
    setImportAiReview({});
    var maps = {};
    headers.forEach(function(h){ var a = autoMap(h); maps[h] = { target: a.t, conf: a.c }; });
    var sampleRow = rows.length ? headers.map(function(h){ return rows[0][h]; }) : headers.map(function(){ return ''; });
    setImportFile({ name: file.name, source: file.name, headers: headers, rows: rows.length, dataRows: rows, rowCount: rows.length, sheet: 'CSV', sample: [sampleRow] });
    setImportMaps(maps);
    setImportStep(2);
    setPage('Import Wizard');
    e.target.value = '';
  };
  if ((name.endsWith('.xlsx') || name.endsWith('.xls'))) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}

async function handleExport() {
  if (typeof ExcelJS === 'undefined') {
    alert('ExcelJS library not loaded. Add the exceljs CDN script tag.');
    return;
  }

  // Map: header label  ->  actual parts[] key
  const COLS = [
    { header: 'OEM',                      key: 'oem' },
    { header: 'JSS Plant',                key: 'plant' },
    { header: 'JSS Part No.',             key: 'jss' },
    { header: 'Alternative JSS Part No.', key: 'altJss' },
    { header: 'Customer Part No.',        key: 'customerPart' },
    { header: 'Component Description',    key: 'desc' },
    { header: 'Component Family',         key: 'component' },
    { header: 'Sub-Family',               key: 'class96' },
    { header: 'Status',                   key: 'active' },
    { header: 'Ongoing Demand',           key: 'demand' },
    { header: 'Current Backlog',          key: 'backlog' },
    { header: 'Service Eop',              key: 'serviceEop' },
    { header: 'Associated Car Program',   key: 'carProgram' }, // not in data yet -> blank
    { header: 'AI Recommendation',        key: 'recommendation' },
    { header: 'Current Price',            key: 'price' },
    { header: 'Expected Price',           key: 'expectedPrice' }, // not in data yet -> blank
    { header: 'All Time Buy',             key: 'allTimeBuy' },    // not in data yet -> blank
  ];

  const FONT_NAME = 'Aptos Narrow';
  const BLUE   = 'FFCAEDFB';
  const ORANGE = 'FFF1A983';
  const STATUS = { ACTIVE: 'FF00B050', INACTIVE: 'FFFF0000', UNKNOWN: 'FF7030A0' };
  const JSS_COL = 3; // column C

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Master Terminal');

  // ---- Column widths: A-E=25, F=35, G-H=20, I-N=25, O-Q=16 ----
  ws.columns = COLS.map((c, i) => {
    let w = 25;
    if (i === 5) w = 35;            // F
    else if (i === 6 || i === 7) w = 20; // G-H
    else if (i >= 8 && i <= 13) w = 25;  // I-N
    else if (i >= 14) w = 16;            // O-Q
    return { width: w };
  });

  // ---- Header row ----
  const headerRow = ws.addRow(COLS.map(c => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { name: FONT_NAME, size: 11, bold: true, underline: true, color: { argb: 'FF000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // ---- Data rows ----
  parts.forEach((p) => {
    const row = ws.addRow(COLS.map(c => {
      const v = p[c.key];
      return (v === undefined || v === null) ? '' : v;
    }));

    row.eachCell((cell, colNumber) => {
      cell.font = { name: FONT_NAME, size: 11 };
      cell.alignment = {horizontal: 'center', vertical: 'middle'};

      // Orange fill on JSS Part No. column
      if (colNumber === JSS_COL) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } };
      }

      // Color-coded Status text (column I = 9)
      if (colNumber === 9) {
        const k = String(cell.value || '').trim().toUpperCase();
        if (STATUS[k]) cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: STATUS[k] } };
      }
    });
  });

  // ---- Thick OUTSIDE border around the whole JSS column block (C1:C{last}) ----
  const lastRow = ws.rowCount;
  for (let r = 1; r <= lastRow; r++) {
    const cell = ws.getCell(r, JSS_COL);
    const b = {
      left:  { style: 'thick', color: { argb: 'FF000000' } },
      right: { style: 'thick', color: { argb: 'FF000000' } },
    };
    if (r === 1)        b.top    = { style: 'thick', color: { argb: 'FF000000' } };
    if (r === lastRow)  b.bottom = { style: 'thick', color: { argb: 'FF000000' } };
    cell.border = b;
  }

  // ---- Freeze header row + first 3 columns (THIS is what fixes your scroll problem) ----
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 1, topLeftCell: 'D2' }];

  // ---- AutoFilter dropdowns across the header ----
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };

  // ---- Write file ----
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `service-database-export-${new Date().getFullYear()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

  const joysonLogoUrl = 'https://cdn.abacus.ai/images/a963436a-16b6-4c99-8408-a4501e8b703f.png';

  const CANONICAL_OEMS = ['STELLANTIS','HONDA','GM','FORD','TOYOTA','NISSAN','SUBARU','HYUNDAI/KIA','VW','BMW','TESLA','MERCEDES','MAZDA','AUDI','RIVIAN','VOLVO','SLATE','MOBIS','NAVISTAR','PACCAR','SYNTEC','UNKNOWN'];
  const OEM_OWNERS = {
    FORD:          'Harry Lee',
    GM:            'Patrick Kennedy',
    HONDA:         'Tom Lickert',
    HYUNDAI:       'Tom Lickert',
    'HYUNDAI/KIA': 'Tom Lickert',
    TOYOTA:        'Yusuki Yamaski',
    MAZDA:         'Yusuki Yamaski',
    STELLANTIS:    'Scott Hawkins',
    STLA:          'Scott Hawkins',
    RIVIAN:        'Michelle Valls',
    SLATE:         'Michelle Valls',
    TESLA:         'Sarah Florka',
    BMW:           'Sarah Florka',
    VOLVO:         'Sarah Florka',
    VW:            'Jeanete Gonzalez',
    AUDI:          'Anaidh Lopez',
    MERCEDES:      'Anaidh Lopez',
    NISSAN:        'Ernest Ruiz',
    MOBIS:         'OEM Account Manager',
    NAVISTAR:      'OEM Account Manager',
    PACCAR:        'OEM Account Manager',
    SYNTEC:        'OEM Account Manager'
  };
  // GKAM / Director layer — strictly from login roster
  const OEM_GKAM = {
    FORD:          'Brian Hyttinen',
    GM:            'Mike Wild',
    HONDA:         'Chad Ritz',
    HYUNDAI:       'Chad Ritz',
    'HYUNDAI/KIA': 'Chad Ritz',
    TOYOTA:        'Chad Ritz',
    MAZDA:         'Chad Ritz',
    STELLANTIS:    'Lance Bertelle',
    STLA:          'Lance Bertelle',
    TESLA:         'Li Jing',
    BMW:           'Li Jing',
    VOLVO:         'Li Jing',
    RIVIAN:        'Li Jing'
  };
  function oemGkam(oem){ return OEM_GKAM[oem] || ''; }
  function oemOwner(oem){ return OEM_OWNERS[oem] || 'OEM Account Manager'; }
  function oemAutoRouteLabel(oem){ var am = oemOwner(oem); var gk = oemGkam(oem); return gk && gk !== am ? am + ' · ' + gk : am; }

  function resolvePart(p){
    const d = partDecisions[p.id];
    if (!d) return p;
    var out = Object.assign({}, p);
    if (d.status) out.active = d.status;
    if (d.dqOverride) out.dq = d.dqOverride;
    if (d.priority) out.priority = d.priority;
    if (d.recommendation) out.recommendation = d.recommendation;
    if (d.archiveStatus) out.archiveStatus = d.archiveStatus;
    if (d.approvalStatus) out.approvalStatus = d.approvalStatus;
    if (d.lockedActive) out.lockedActive = true;
    out.owner = d.owner || p.owner;
    out.lastAction = d.lastAction;
    out.lastBy = d.lastBy;
    out.lastAt = d.lastAt;
    return out;
}
function isArchived(p){ const d = partDecisions[p.id]; const ad = archiveDecisions[p.id]; if (ad && (ad.status === 'Archived' || ad.status === 'ARCHIVED')) return true; if (d && (d.status === 'ARCHIVED' || d.status === 'Archived')) return true; if (d && d.archiveStatus === 'Archived') return true; if (p.archiveStatus === 'Archived' && !(d && d.archiveStatus && d.archiveStatus !== 'Archived')) return true; return false; }


  // ── Supabase bootstrap: load all tables on mount ─────────────────
  React.useEffect(function() {
    _supa.from('parts').select('*').then(function(pRes){ if (pRes.data && pRes.data.length > 0) setRawParts(pRes.data); }, function(e){ console.warn('Supabase parts load error:', e); });

    _supa.from('audit_log').select('*').order('ts', { ascending: false }).then(function(aRes){
      if (aRes.data && aRes.data.length > 0) setRawAudit(aRes.data);
    }, function(e){ console.warn('Supabase audit load error:', e); });

    _supa.from('price_decisions').select('*').then(function(pdRes) {
      if (pdRes.data && pdRes.data.length > 0) {
        var pdMap = {};
        pdRes.data.forEach(function(r) { pdMap[r.partId] = r; });
        setPriceDecisions(pdMap);
      }
    }, function(e){ console.warn('Supabase price decisions load error:', e); });

    _supa.from('tasks').select('*').then(function(tRes){
      if (tRes.data) {
        var auto = tRes.data.filter(function(t){ return t.source && t.source !== 'Manual'; });
        var manual = tRes.data.filter(function(t){ return !t.source || t.source === 'Manual'; });
        setQueueTasks(auto);
        setCustomTasks(manual);
      }
    }, function(e){ console.warn('Supabase tasks load error:', e); });
  }, []);

  const [selOEMs, setSelOEMs] = React.useState([]);
  const [selPriorities, setSelPriorities] = React.useState([]);
  const [selPlants, setSelPlants] = React.useState([]);
  const [selCategories, setSelCategories] = React.useState([]);
  const [selSubcategories, setSelSubcategories] = React.useState([]);
  const [refList, setRefList] = React.useState('96-Part Classification');
  const [refSearch, setRefSearch] = React.useState('');
  const [importStep, setImportStep] = React.useState(0);
  const [importFile, setImportFile] = React.useState(null);
  const [importResult, setImportResult] = React.useState(null);
  const [importMaps, setImportMaps] = React.useState({});
  const [importSheets, setImportSheets] = React.useState([]);
  const [importGlobalOEM, setImportGlobalOEM] = React.useState('');
  const [importGlobalPlant, setImportGlobalPlant] = React.useState('');
  const [importAckNoCust, setImportAckNoCust] = React.useState(false);
  const [importSelectedSheets, setImportSelectedSheets] = React.useState([]);
  const [importRowFilters, setImportRowFilters] = React.useState([]);
  const [importSavedProfiles, setImportSavedProfiles] = React.useState([]);
  const [importAiReview, setImportAiReview] = React.useState({});
  const [importBulkStatus, setImportBulkStatus] = React.useState('none'); // 'none' | 'active' | 'inactive'
  const importWorkbookBuf = React.useRef(null);
  const [phaseFilter, setPhaseFilter] = React.useState('All');
  const [oemPhaseFilter, setOemPhaseFilter] = React.useState('All');
  const [queueOem, setQueueOem] = React.useState([]);
  const [dismissFor, setDismissFor] = React.useState(null);
  const [queueStatus, setQueueStatus] = React.useState('Open');
  const [selectedTask, setSelectedTask] = React.useState(null);
  const [auditAction, setAuditAction] = React.useState('All');
  const [exportTerminalParts, setExportTerminalParts] = React.useState([]);
  const [auditModule, setAuditModule] = React.useState('All');
  const [auditUser, setAuditUser] = React.useState('All');
  const [auditSearch, setAuditSearch] = React.useState('');
  const [selectedAudit, setSelectedAudit] = React.useState(null);
  const [priceFilter, setPriceFilter] = React.useState('All');
  const [selectedPrice, setSelectedPrice] = React.useState(null);
  const [priceProposal, setPriceProposal] = React.useState({});
  // priceDecisions tracks per-part pricing outcomes applied in-app (approve / manager / cost-request).
  // priceHistoryFor holds the part whose History drawer is open (null = closed).
  const [priceDecisions, setPriceDecisions] = React.useState({});
  const [priceHistoryFor, setPriceHistoryFor] = React.useState(null);
  // queueTasks holds tasks CREATED in-app this session (e.g. Send to Manager / Request Cost Data
  // from Service Price Review). They're merged on top of the seeded rawTasks in Action Queues, so
  // a routed pricing action becomes a real, owned, SLA-tracked task the moment it's made.
  const [queueTasks, setQueueTasks] = React.useState([]);
  // taskActions tracks per-task action results applied in-app (Approve/Complete, Start/Take,
  // Reassign, Reject). Keyed by task id → { status, assignee, note, ts, by }. Merged over both the
  // seeded rawTasks and the live queueTasks so a manager's decision is reflected everywhere and is
  // audit-ready — exactly how a real Action Queue backend would persist task transitions.
  // reassignFor holds the task currently open in the Reassign drawer (null = closed).
  const [reassignFor, setReassignFor] = React.useState(null);
  // ---------- EDITABLE REFERENCE YEAR ----------
  // yearOverride === null means "use the live system year" (auto-roll). Setting it to a number
  // PINS the reference year for back-dated analysis/audits. yearSettingsOpen drives the settings drawer.
  const [yearOverride, setYearOverride] = React.useState(null);
  const [yearSettingsOpen, setYearSettingsOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState('cleanup');
  const [exportFormat, setExportFormat] = React.useState('xlsx');
  const [excelStructure, setExcelStructure] = React.useState('pivot');
  const [reportOem, setReportOem] = React.useState('All');
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkAction, setBulkAction] = React.useState(null);
  const [mtSelectMode, setMtSelectMode] = React.useState(false);
  const [mtSelectedIds, setMtSelectedIds] = React.useState([]);
  const [marManager, setMarManager] = React.useState('All');
  // ---------- ARCHIVE REVIEW ACTION STATE ----------
  // archiveDecisions tracks per-part decisions applied in-app (approve/keep/block/etc.) and
  // selectedArchiveIds tracks which rows are checked for the "Submit Selected" batch.
  // archiveExportOpen / archiveSubmitOpen drive the two confirmation drawers.
  const [archiveDecisions, setArchiveDecisions] = React.useState({});
  const [manualArchiveIds, setManualArchiveIds] = React.useState([]);
  const [partDecisions, setPartDecisions] = React.useState({});
  const [archiveMode, setArchiveMode] = React.useState('active'); // 'active' | 'all' | 'archived'
  const [dqFlagFilter, setDqFlagFilter] = React.useState('All');
  const [eopToast, setEopToast] = React.useState(false);
  const [eopFilter, setEopFilter] = React.useState('All');
  const [actionModal, setActionModal] = React.useState(null);
  const [notifOpen, setNotifOpen] = React.useState(false);

  const unreadCount = notifications.filter(function(n){ return !n.read; }).length;
  const scrollRef = React.useRef(null);
  // ---------- REFERENCE DATA EDITING STATE ----------
  // refOverrides holds added/edited rows per list so the controlled lists are fully editable in-app.
  // refModal drives the Add/Edit drawer: { mode:'add'|'edit', list, rowIndex, values:[...] }.
  const [refOverrides, setRefOverrides] = React.useState({});
  const [refModal, setRefModal] = React.useState(null);

  // ---------- ADMIN & ROLES EDITING STATE ----------
  // adminRoles holds the role/permission matrix as editable state. Each permission is a
  // boolean toggle (checkoff). adminModal drives the Add/Edit-role drawer.
  const ADMIN_PERMS = ['editParts', 'approvePrice', 'approveImport', 'adminOverride'];
  const ADMIN_PERM_LABELS = { editParts: 'Edit Parts', approvePrice: 'Approve Price', approveImport: 'Approve Import', adminOverride: 'Admin Override' };
  const [adminRoles, setAdminRoles] = React.useState([
    { id: 'AR-1', role: 'Admin',           editParts: true,  approvePrice: true,  approveImport: true,  adminOverride: true  },
    { id: 'AR-2', role: 'Director / GKAM', editParts: true,  approvePrice: true,  approveImport: false, adminOverride: false },
    { id: 'AR-3', role: 'Manager',         editParts: true,  approvePrice: false, approveImport: false, adminOverride: false },
    { id: 'AR-4', role: 'Service',         editParts: false, approvePrice: false, approveImport: false, adminOverride: false },
    { id: 'AR-5', role: 'Read-Only',       editParts: false, approvePrice: false, approveImport: false, adminOverride: false }
  ]);
  const [adminModal, setAdminModal] = React.useState(null);

  // ---------- TEAM CALENDAR STATE ----------
  // Events now carry year + month so the calendar can navigate across months.
  // calYear/calMonth control which month is shown (month is 0-indexed: 0=Jan).
  // eventModal drives the Add/Edit-event drawer.
  const [calYear, setCalYear] = React.useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = React.useState(new Date().getMonth()); // current month (0-indexed)
  const [eventModal, setEventModal] = React.useState(null);
  const EVENT_TYPES = ['Team Meeting', 'Operations', 'Customer / Service', 'Customer Visit', 'Company Event'];
  const [teamEvents, setTeamEvents] = React.useState([
    { id: 'EV-1', year: 2026, month: 4, day: 6, title: 'SERVICE DATABASE REVIEW', type: 'Team Meeting', details: 'Review cleanup progress, import status, and open action queues.' },
    { id: 'EV-2', year: 2026, month: 4, day: 14, title: 'PLANT 97 SERVICE CHECK-IN', type: 'Operations', details: 'Group review of backlog, demand signals, and plant/order risk items.' },
    { id: 'EV-3', year: 2026, month: 4, day: 21, title: 'CUSTOMER SERVICE ALIGNMENT REVIEW', type: 'Customer / Service', details: 'Team-level review of customer decision items and service timing concerns.' },
    { id: 'EV-4', year: 2026, month: 4, day: 28, title: 'STELLANTIS VISIT', type: 'Customer Visit', details: 'Group awareness event for upcoming Stellantis visit and preparation items.' },
    { id: 'EV-5', year: 2026, month: 4, day: 28, title: 'AME TOWN HALL MEETING', type: 'Company Event', details: 'Team-wide town hall meeting relevant to the service database group.' }
  ]);

  // ---------- IDENTITY & ACCESS (SSO MOCKUP) STATE ----------
  // PROTOTYPE NOTE: Real identity comes from Microsoft Entra ID (Azure AD) SSO in production.
  // Here we simulate it: a "Sign in with Microsoft" splash, a logged-in user, and a role
  // switcher so gating (read-only vs editable) is fully demonstrable without a backend.
  const [authed, setAuthed] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState({ name: 'Paul Smith', email: 'Paul.Smith@joysonsafety.com', role: 'Admin', team: 'Service & Campaign', title: 'Director of Campaign Service', sub: 'Service & Campaign · Joysonsafety' });
  const ROLE_OPTIONS = ['Admin', 'Director / GKAM', 'Manager', 'Service', 'Read-Only'];
  // canEdit() is the single gate the whole app reads. Only Admin can edit controlled lists.
  function canEdit() { return currentUser.role === 'Admin'; }
  // ---- Archive Review live audit + decisions (session state) ----
  const [archiveAudit, setArchiveAudit] = React.useState(loadPersistent('archiveAudit', []));
    const [taskAudit, setTaskAudit] = React.useState([]);
    const [customTasks, setCustomTasks] = React.useState([]);
    const [taskActions, setTaskActions] = React.useState({});
  // archiveDecisions is declared elsewhere — if it uses useState without loadPersistent,
  // that's fine; it just won't rehydrate. We'll persist it on every write below.

  // ---------- SERVICE LIFE 15-YEAR TIME PHASE ENGINE ----------
  // Sales-manager view: years remaining until service-end (EOP) from the current year,
  // bucketed into a 15-year window. Phase 1 = newest/longest life, Phase 4 = past/overdue.
  // CURRENT_YEAR auto-derives from the system clock so phases and rate bands roll forward on
  // Jan 1 with no manual edit — UNLESS an admin pins a year via the Reference Year setting
  // (yearOverride). Pinning lets you reproduce a past review exactly (back-dated audits/demos).
  const LIVE_YEAR = new Date().getFullYear();
  const CURRENT_YEAR = (yearOverride !== null && !isNaN(yearOverride)) ? yearOverride : LIVE_YEAR;
  const yearIsPinned = yearOverride !== null && !isNaN(yearOverride);
  const phaseMeta = {
    'PHASE 1': { label: '0–4 Years', range: 'Recently ended service', tone: 'green', note: 'Newest parts. Keep active, forecast normally.' },
    'PHASE 2': { label: '5–9 Years', range: 'Mid service window', tone: 'blue', note: 'Mature parts. Monitor demand and pricing.' },
    'PHASE 3': { label: '10–14 Years', range: 'Late service window', tone: 'amber', note: 'Aging parts. Begin wind-down planning and last-time-buy review.' },
    'PHASE 4': { label: '15+ Years', range: 'Past service window', tone: 'red', note: 'Prime cleanup target. Likely archive or end-of-life candidates.' },
    'UNKNOWN AGE': { label: 'Unknown Age', range: 'Missing or invalid EOP', tone: 'gray', note: 'No usable service-end date. Needs EOP data before any phase decision.' }
  };

  // ---------- REFERENCE YEAR SETTINGS drawer ----------
  // Lets an Admin keep the year on auto-roll (live system year) OR pin it to a fixed year for
  // back-dated analysis/audits. Pinning makes every phase + rate-band "as of" stamp reflect the
  // pinned year. Editing is gated to Admins; everyone else sees it read-only.

function YearSettingsModal() {
    if (!yearSettingsOpen) return null;
    var ro = !canEdit();
    function close(){ setYearSettingsOpen(false); }
    var years = [];
    for (var y = LIVE_YEAR + 1; y >= LIVE_YEAR - 8; y--) years.push(y);
    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Reference Year</div><h2 className="text-lg font-bold text-gray-900 mt-1">System Setting</h2><p className="text-sm text-gray-500 mt-0.5">Controls the year all service-life phases and rate bands are computed from.</p></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4">{ro && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2"><span>🔒</span><span>Read-only — you need the <span className="font-semibold">Admin</span> role to change the reference year. You're signed in as <span className="font-semibold">{currentUser.role}</span>.</span></div>}<div className={'rounded-xl border p-4 ' + (!yearIsPinned ? 'border-green-400 bg-green-50' : 'border-gray-200')}><button onClick={function(){ if (!ro) setYearOverride(null); }} disabled={ro} className="w-full text-left flex items-center justify-between"><div><div className="font-semibold text-gray-900 text-sm">Auto (live year)</div><div className="text-xs text-gray-600 mt-0.5">Follows the system clock — rolls forward automatically on Jan 1. Currently {LIVE_YEAR}.</div></div><span className={'w-5 h-5 rounded-full border flex items-center justify-center ' + (!yearIsPinned ? 'border-green-600' : 'border-gray-300')}>{!yearIsPinned && <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>}</span></button></div><div className={'rounded-xl border p-4 ' + (yearIsPinned ? 'border-blue-400 bg-blue-50' : 'border-gray-200')}><div className="flex items-center justify-between"><div><div className="font-semibold text-gray-900 text-sm">Pinned year (back-dated)</div><div className="text-xs text-gray-600 mt-0.5">Freeze the reference year to reproduce a past review or run an audit. Every "as of" stamp reflects this year.</div></div><span className={'w-5 h-5 rounded-full border flex items-center justify-center ' + (yearIsPinned ? 'border-blue-600' : 'border-gray-300')}>{yearIsPinned && <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>}</span></div><select value={yearIsPinned ? yearOverride : ''} disabled={ro} onChange={function(e){ var v = e.target.value; setYearOverride(v === '' ? null : parseInt(v, 10)); }} className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100"><option value="">— Select a year to pin —</option>{years.map(function(y){ return <option key={y} value={y}>{y}{y === LIVE_YEAR ? ' (live)' : ''}</option>; })}</select></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900"><span className="font-semibold">Effective reference year: {CURRENT_YEAR}</span> {yearIsPinned ? '— pinned. Switch back to Auto to resume rolling forward each January.' : '— auto-rolling with the live clock.'} This change is audit-logged and applies everywhere phases and rate bands are computed.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2">{!ro && yearIsPinned && <button onClick={function(){ setYearOverride(null); }} className="bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium">Reset to Auto</button>}<div className="flex-1"></div><button onClick={close} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Done</button></div></div></React.Fragment>;
  }

  function servicePhase(part) {
    var eop = parseInt(part.serviceEop, 10);
    if (isNaN(eop) || String(part.serviceEop).toLowerCase().indexOf('unknown') >= 0) {
      return { key: 'UNKNOWN AGE', yearsLeft: null };
    }
    var yearsSince = CURRENT_YEAR - eop; // years since end-of-production
    if (yearsSince < 0) yearsSince = 0;             // future EOP = still in production, treat as Phase 1
    var key;
    if (yearsSince <= 4) key = 'PHASE 1';           // 0-4 years since EOP
    else if (yearsSince <= 9) key = 'PHASE 2';      // 5-9
    else if (yearsSince <= 14) key = 'PHASE 3';     // 10-14
    else key = 'PHASE 4';                            // 15+
    var yearsLeft = 15 - yearsSince;                // years until 15-year archive cutoffis also a long-tail / review bucket
    return { key: key, yearsLeft: yearsLeft };
  }

  // ---------- MASTER RATE SCHEDULE (TWO-TRACK: TARGET + FLOOR) ----------
  // Company-wide standard schedule. Target = the rate we REQUEST/WANT (negotiation goal).
  // Floor = the bare-minimum rate we can NEVER price below. Multipliers are applied to COGS.
  // Bands are keyed by part-life (years remaining). Source: management screenshot.
  // NOTE: the ">20 yrs" Target of 18 is an ASSUMPTION (the source only listed Floor=15 there
  // with no matching Target). It keeps Target above Floor so the band stays valid.
  // ---> CONFIRM 18x WITH MANAGEMENT.  Everything else is taken directly from the source.
  const RATE_SCHEDULE = [
    { band: '\u22645 yrs',  maxYears: 5,        target: 1.5, floor: 1.1, assumed: false },
    { band: '\u226410 yrs', maxYears: 10,       target: 5,   floor: 3,   assumed: false },
    { band: '\u226415 yrs', maxYears: 15,       target: 10,  floor: 6,   assumed: false },
    { band: '\u226420 yrs', maxYears: 20,       target: 12,  floor: 10,  assumed: false },
    { band: '>20 yrs',      maxYears: Infinity, target: 18,  floor: 15,  assumed: true  }
  ];

  // pick the schedule band for a given part age (years of service life remaining)
  function rateBandFor(yearsLeft) {
    if (yearsLeft === null || yearsLeft === undefined || isNaN(yearsLeft)) return null;
    var y = yearsLeft <= 0 ? 0 : yearsLeft; // overdue parts fall in the youngest bucket by age
    for (var i = 0; i < RATE_SCHEDULE.length; i++) {
      if (y <= RATE_SCHEDULE[i].maxYears) return RATE_SCHEDULE[i];
    }
    return RATE_SCHEDULE[RATE_SCHEDULE.length - 1];
  }

  // Evaluate a proposed/current price against the two-track band for a part.
  // Returns the three-state status: AT/ABOVE TARGET (green), IN BAND (amber), BELOW FLOOR (red).
  function evalRateBand(cogs, price, yearsLeft) {
    var band = rateBandFor(yearsLeft);
    if (!band || !cogs || isNaN(cogs) || cogs <= 0) {
      return { ok: false, band: band, note: 'No COGS or no age band — cannot evaluate.' };
    }
    var targetPrice = cogs * band.target; // what we want
    var floorPrice  = cogs * band.floor;  // what we never go under
    var room = targetPrice - floorPrice;  // negotiation room in $
    var state, tone, label, action;
    if (price === null || price === undefined || isNaN(price)) {
      state = 'NONE'; tone = 'gray'; label = 'No Price'; action = 'Enter a price to evaluate against the band.';
    } else if (price >= targetPrice) {
      state = 'TARGET'; tone = 'green'; label = 'At / Above Target'; action = 'Meets the requested rate. Confirm & clear.';
    } else if (price >= floorPrice) {
      state = 'BAND'; tone = 'amber'; label = 'In Band'; action = 'Above floor but below target — push toward target. Room: $' + room.toFixed(2) + '.';
    } else {
      state = 'FLOOR'; tone = 'red'; label = 'Below Floor'; action = 'UNDER bare minimum — losing margin. Hard-stop: re-price to at least $' + floorPrice.toFixed(2) + '.';
    }
    return { ok: true, band: band, targetMult: band.target, floorMult: band.floor,
             targetPrice: targetPrice, floorPrice: floorPrice, room: room,
             state: state, tone: tone, label: label, action: action };
  }

  // ---------- IMPORT WIZARD: sample incoming files (messy real-world headers) ----------
  // Each file simulates what a manager / OEM / plant / SAP export actually looks like.
  const _now = new Date();
const _yr = _now.getFullYear();
const _mo = _now.toLocaleString('en-US', { month: 'long' });
const _currentLabel = _mo + ' ' + _yr;

const importTargetGroups = [
  { tier: '— Ignore —', fields: [
    { value: '— Ignore —', label: '— Ignore —', hint: '' }
  ]},
  { tier: 'Tier 1 — Must Map (Core Identity)', fields: [
    { value: 'JSS Part #', label: 'JSS Part #', hint: 'Master Terminal · primary part identifier' },
    { value: 'Customer Part #', label: 'Customer Part #', hint: 'Master Terminal · OEM-facing part number' },
    { value: 'Alt JSS Part #', label: 'Alt JSS Part #', hint: 'Master Terminal · supplier/alternate PN' },
    { value: 'OEM / Customer', label: 'OEM / Customer', hint: 'Master Terminal · normalized customer name' },
    { value: 'JSS Plant', label: 'JSS Plant', hint: 'Master Terminal · producing plant code' },
    { value: 'Description', label: 'Description', hint: 'Master Terminal · part description' },
    { value: 'Active Y/N', label: 'Active Y/N', hint: 'Master Terminal · active or inactive status' },
    { value: 'Product Type', label: 'Product Type', hint: 'Master Terminal · AB / SB / SW / BUCKLE / OTHER (commodity family)' },
    { value: 'Component Family', label: 'Component Family', hint: 'Master Terminal · RETRACTOR / BUCKLE / INFLATOR / MGG / OTHER' },
    { value: 'Subcategory', label: 'Subcategory', hint: 'Master Terminal · specific part identity (Retractor mechanism, Airbag cushion, etc.)' },
    { value: 'Program', label: 'Program', hint: 'Master Terminal · vehicle program' },
    { value: 'BOM Y/N', label: 'BOM Y/N', hint: 'Master Terminal · on bill of materials' },
    { value: 'Priority', label: 'Priority', hint: 'Master Terminal · Critical / High / Medium / Low' },
  ]},
  { tier: 'Tier 2 — Operational (Risk, Price, Life Phase)', fields: [
    { value: 'Service Price', label: 'Service Price', hint: 'Service Price Review · current selling price' },
    { value: 'Std Cost', label: 'Std Cost', hint: 'Service Price Review · standard cost baseline' },
    { value: 'Demand', label: 'Demand', hint: 'Service Database · qty demanded (any window — label as-is)' },
    { value: 'Backlog', label: 'Backlog', hint: 'Service Database · open backlog qty' },
    { value: 'Service SOP', label: 'Service SOP', hint: 'Service Life Phase · service start year (aftermarket begins)' },
    { value: 'Service EOP', label: 'Service EOP', hint: 'Service Life Phase · service end year (aftermarket ends)' },
    { value: 'Serial SOP', label: 'Serial SOP', hint: 'Service Life Phase · OEM serial start of production' },
    { value: 'Serial EOP', label: 'Serial EOP', hint: 'Service Life Phase · OEM serial end of production' },
    { value: 'Under Contract', label: 'Under Contract', hint: 'Service Life Phase · active contract Y/N' },
    { value: 'Contract End', label: 'Contract End', hint: 'Service Life Phase · contract expiry date' },
    { value: 'Past/Current Model', label: 'Past / Current Model', hint: 'Service Life Phase · model generation status' },
    { value: 'All Time Buy', label: 'All Time Buy', hint: 'Service Database · lifetime buy flag' },
    { value: 'PO Customer', label: 'PO Customer', hint: 'Service Database · purchase order customer' },
  ]},
  { tier: 'Tier 3 — OEM Flexible (map only if file contains it)', fields: [
    { value: 'CM%', label: 'CM%', hint: 'Service Price Review · contribution margin %' },
    { value: 'Target Price', label: 'Target Price', hint: 'Service Price Review · internal target' },
    { value: 'Target Price (P&L)', label: 'Target Price (P&L)', hint: 'Service Price Review · P&L adjusted target' },
    { value: 'New COGS', label: 'New COGS', hint: 'Service Price Review · updated cost of goods' },
    { value: 'New CM%', label: 'New CM%', hint: 'Service Price Review · updated margin %' },
    { value: 'Part Age (' + _yr + ')', label: 'Part Age (' + _yr + ')', hint: 'Forecast & Planning · age of part as of ' + _currentLabel },
    { value: 'Forecast Volume (' + _yr + ')', label: 'Forecast Volume (' + _yr + ')', hint: 'Forecast & Planning · projected units ' + _yr },
    { value: 'Forecast Volume (' + (_yr+1) + ')', label: 'Forecast Volume (' + (_yr+1) + ')', hint: 'Forecast & Planning · projected units ' + (_yr+1) },
    { value: 'Forecast Volume (' + (_yr+2) + ')', label: 'Forecast Volume (' + (_yr+2) + ')', hint: 'Forecast & Planning · projected units ' + (_yr+2) },
    { value: 'Forecast Volume (' + (_yr+3) + ')', label: 'Forecast Volume (' + (_yr+3) + ')', hint: 'Forecast & Planning · projected units ' + (_yr+3) },
    { value: 'Revenue (' + _yr + ')', label: 'Revenue (' + _yr + ')', hint: 'Forecast & Planning · revenue ' + _yr },
    { value: 'Revenue (' + (_yr+1) + ')', label: 'Revenue (' + (_yr+1) + ')', hint: 'Forecast & Planning · revenue ' + (_yr+1) },
    { value: 'Revenue (' + (_yr+2) + ')', label: 'Revenue (' + (_yr+2) + ')', hint: 'Forecast & Planning · revenue ' + (_yr+2) },
    { value: 'Revenue (P&L ' + _yr + ')', label: 'Revenue P&L (' + _yr + ')', hint: 'Forecast & Planning · P&L adjusted revenue ' + _yr },
    { value: 'OEM-Specific Field', label: 'OEM-Specific Field', hint: 'Catch-all · store raw for review — does not auto-map to a page' },
  ]}
];
const importTargets = importTargetGroups.flatMap(function(g){ return g.fields.map(function(f){ return f.value; }); });

    // confidence + auto-target heuristics for header → field mapping
  function autoMap(header) {
    var h = header.toLowerCase();
    if (h === 'part no' || h === 'gm pn' || (h.indexOf('cust') >= 0 && h.indexOf('part') >= 0)) return { t: 'Customer Part #', c: 97 };
    if (h === 'material' || h === 'jss#' || h.indexOf('joyson') >= 0 || (h.indexOf('jss') >= 0 && h.indexOf('alt') < 0)) return { t: 'JSS Part #', c: 96 };
    if (h.indexOf('supplier') >= 0 || h.indexOf('alt') >= 0) return { t: 'Alt JSS Part #', c: 90 };
    if (h === 'cust' || h === 'customer' || h === 'division') return { t: 'OEM / Customer', c: 93 };
    if (h === 'plant' || h === 'loc' || h.indexOf('plant') >= 0) return { t: 'JSS Plant', c: 91 };
    if (h.indexOf('desc') >= 0) return { t: 'Description', c: 98 };
    if (h.indexOf('price') >= 0) return { t: 'Service Price', c: 95 };
    if (h.indexOf('cost') >= 0) return { t: 'Std Cost', c: 96 };
    if (h.indexOf('req') >= 0 || h.indexOf('qty') >= 0) return { t: 'Demand (4wk)', c: 92 };
    if (h.indexOf('backorder') >= 0 || h.indexOf('backlog') >= 0) return { t: 'Backlog', c: 90 };
    if ((h.indexOf('service') >= 0 && h.indexOf('sop') >= 0) || h.indexOf('service start') >= 0) return { t: 'Service SOP', c: 90 };
    if ((h.indexOf('service') >= 0 && h.indexOf('eop') >= 0) || h.indexOf('service end') >= 0) return { t: 'Service EOP', c: 90 };
    if (h.indexOf('sop') >= 0 || h.indexOf('start of prod') >= 0) return { t: 'Serial SOP', c: 88 };
    if (h.indexOf('eop') >= 0 || h.indexOf('end') >= 0) return { t: 'Serial EOP', c: 88 };
    if (h.indexOf('product type') >= 0 || h === 'type' || h.indexOf('commodity') >= 0) return { t: 'Product Type', c: 94 };
    if (h.indexOf('family') >= 0 || h.indexOf('component family') >= 0 || h.indexOf('component group') >= 0) return { t: 'Component Family', c: 94 };
    if (h.indexOf('subcategory') >= 0 || h.indexOf('sub category') >= 0 || h.indexOf('sub-category') >= 0 || h === 'code' || h.indexOf('component code') >= 0) return { t: 'Subcategory', c: 92 };
    if (h.indexOf('prog') >= 0) return { t: 'Program', c: 89 };
    if (h.indexOf('sched') >= 0) return { t: '— Ignore —', c: 60 };
    return { t: '— Ignore —', c: 40 };
  }

  // ---------- REFERENCE DATA (controlled lists / single source of truth) ----------
  const refData = {
    '96-Part Classification': {
      desc: 'The deepest classification level. Every part must map to exactly one family. Rows with status "PENDING REVIEW" have a blank family and must be classified later.',
      cols: ['Code', 'Classification', 'Component Family', 'Status'],
      rows: [
        // ── RETRACTORS ──
        ['C-01', 'RETRACTOR ASSY', 'RETRACTORS', 'Active'],
        ['C-02', 'PRETENSIONER (MECH)', 'RETRACTORS', 'Active'],
        ['C-03', 'RETRACTOR SPRING', 'RETRACTORS', 'Active'],
        ['C-04', 'WEBBING / LAP BELT', 'RETRACTORS', 'Active'],
        ['C-05', 'SHOULDER ASSY', 'RETRACTORS', 'Active'],
        ['C-06', 'BELT GUIDE / TURNING LOOP', 'RETRACTORS', 'Active'],
        ['C-07', 'HEIGHT ADJUSTER', 'RETRACTORS', 'Active'],
        ['C-08', 'STOPPER', 'RETRACTORS', 'Active'],
        ['C-09', 'LOCK', 'RETRACTORS', 'Active'],
        ['C-10', 'DAMPENER ASSY', 'RETRACTORS', 'Active'],
        ['C-11', 'ACTUATOR', 'RETRACTORS', 'Active'],

        // ── BUCKLES ──
        ['C-12', 'BUCKLE ASSY', 'BUCKLES', 'Active'],
        ['C-13', 'ANCHOR / CS ANCHOR', 'BUCKLES', 'Active'],
        ['C-14', 'TETHER', 'BUCKLES', 'Active'],
        ['C-15', 'BUCKLE SWITCH', 'BUCKLES', 'Active'],
        ['C-16', 'GRIP', 'BUCKLES', 'Active'],
        ['C-17', 'RELEASE KNOB', 'BUCKLES', 'Active'],

        // ── INFLATORS ──
        ['C-18', 'SAB CUSHION', 'INFLATORS', 'Active'],
        ['C-19', 'PAB CUSHION', 'INFLATORS', 'Active'],
        ['C-20', 'PAB-DUAL CUSHION', 'INFLATORS', 'Active'],
        ['C-21', 'PAB-SINGLE CUSHION', 'INFLATORS', 'Active'],
        ['C-22', 'CRASH SENSOR', 'INFLATORS', 'Active'],
        ['C-23', 'SENSING CAMERA', 'INFLATORS', 'Active'],
        ['C-24', 'MODULE COVER', 'INFLATORS', 'Active'],
        ['C-25', 'COLLAR', 'INFLATORS', 'Active'],
        ['C-26', 'GAS MUFFLER', 'INFLATORS', 'Active'],
        ['C-27', 'GAS SILENCER', 'INFLATORS', 'Active'],
        ['C-28', 'CAP', 'INFLATORS', 'Active'],
        ['C-29', 'PLUG', 'INFLATORS', 'Active'],
        ['C-30', 'BOOT', 'INFLATORS', 'Active'],
        ['C-31', 'INSULATOR', 'INFLATORS', 'Active'],
        ['C-32', 'BLOCKER', 'INFLATORS', 'Active'],

        // ── MGG ──
        ['C-33', 'INITIATOR / SQUIB', 'MGG', 'Active'],
        ['C-34', 'FIRING LEAD / WIRE ASSY', 'MGG', 'Active'],
        ['C-35', 'WIRING', 'MGG', 'Active'],
        ['C-36', 'WIRE HARNESS', 'MGG', 'Active'],
        ['C-37', 'CONNECTOR ASSY', 'MGG', 'Active'],
        ['C-38', 'TERMINAL', 'MGG', 'Active'],
        ['C-39', 'CONTROL', 'MGG', 'Active'],
        ['C-40', 'EXTENSION', 'MGG', 'Active'],

        // ── UNCLASSIFIED — PENDING REVIEW (family intentionally blank) ──
        ['C-41', 'BRACKET', '', 'PENDING REVIEW'],
        ['C-42', 'BASE', '', 'PENDING REVIEW'],
        ['C-43', 'STAY', '', 'PENDING REVIEW'],
        ['C-44', 'PANEL / PAN', '', 'PENDING REVIEW'],
        ['C-45', 'SEAT / SEAT TRACK', '', 'PENDING REVIEW'],
        ['C-46', 'WHEEL', '', 'PENDING REVIEW'],
        ['C-47', 'BOLT', '', 'PENDING REVIEW'],
        ['C-48', 'NUT', '', 'PENDING REVIEW'],
        ['C-49', 'SCREW', '', 'PENDING REVIEW'],
        ['C-50', 'WASHER', '', 'PENDING REVIEW'],
        ['C-51', 'PIN', '', 'PENDING REVIEW'],
        ['C-52', 'CLIP', '', 'PENDING REVIEW'],
        ['C-53', 'RETAINER', '', 'PENDING REVIEW'],
        ['C-54', 'SPACER', '', 'PENDING REVIEW'],
        ['C-55', 'BEZEL', '', 'PENDING REVIEW'],
        ['C-56', 'LEATHER', '', 'PENDING REVIEW'],
        ['C-57', 'STEERING', '', 'PENDING REVIEW'],
        ['C-58', 'SHIFT ASSY', '', 'PENDING REVIEW'],
        ['C-59', 'DOOR', '', 'PENDING REVIEW'],
        ['C-60', 'GENERIC ASSEMBLY (ASM)', '', 'PENDING REVIEW'],
        ['C-61', 'KIT', '', 'PENDING REVIEW'],
        ['C-62', 'UNKNOWN', '', 'PENDING REVIEW'],
        ['C-63', 'BLANKS', '', 'PENDING REVIEW'],
        ['C-64', 'PRT', '', 'PENDING REVIEW'],
        ['C-65', 'PT', '', 'PENDING REVIEW'],
        ['C-66', 'RR', '', 'PENDING REVIEW'],
        ['C-67', 'RT', '', 'PENDING REVIEW'],
        ['C-68', 'STW', '', 'PENDING REVIEW'],
        ['C-69', 'KAB', '', 'PENDING REVIEW'],
        ['C-70', 'DMS', '', 'PENDING REVIEW'],
        ['C-71', 'RPT', '', 'PENDING REVIEW'],
        ['C-72', 'SHGT', '', 'PENDING REVIEW'],
      ]
    },
    'OEM / Customer List': {
      desc: 'Canonical customer names. Aliases from messy source files are normalized to the canonical name on import.',
      cols: ['Canonical Name', 'Known Aliases', 'Parts on File', 'Status'],
      rows: [
        ['STELLANTIS', 'FCA, Chrysler, Dodge, Jeep, RAM, Mopar', '3,210', 'Active'],
        ['HONDA', 'Honda, American Honda, Acura', '2,540', 'Active'],
        ['GM', 'General Motors, Chevrolet, GMC, Cadillac, Buick', '2,180', 'Active'],
        ['FORD', 'Ford, Ford Motor, Lincoln', '1,990', 'Active'],
        ['TOYOTA', 'Toyota, TMMK, Lexus', '1,120', 'Active'],
        ['NISSAN', 'Nissan, Infiniti', '980', 'Active'],
        ['SUBARU', 'Subaru, SIA', '320', 'Active'],
        ['HYUNDAI/KIA', 'Hyundai, Kia, Genesis, HMMA', '290', 'Active'],
        ['VW', 'Volkswagen, VWoA', '430', 'Active'],
        ['BMW', 'BMW, BMW NA, Mini', '180', 'Active'],
        ['TESLA', 'Tesla Inc, Tesla Motors', '610', 'Active'],
        ['MERCEDES', 'Mercedes-Benz, MBUSI, Daimler', '160', 'Active'],
        ['MAZDA', 'Mazda, MTM', '120', 'Active'],
        ['AUDI', 'Audi AG', '210', 'Active'],
        ['RIVIAN', 'Rivian Automotive', '0', 'Active'],
        ['VOLVO', 'Volvo Cars, Volvo Group', '0', 'Active'],
        ['SLATE', 'Slate Auto, Slate EV', '0', 'Active'],
        ['MOBIS', 'Hyundai Mobis, Mobis Parts', '0', 'Active'],
        ['NAVISTAR', 'Navistar International, International Trucks', '0', 'Active'],
        ['PACCAR', 'Paccar Inc, Kenworth, Peterbilt, DAF', '0', 'Active'],
        ['SYNTEC', 'Syntec Industries', '0', 'Active'],
        ['UNKNOWN', 'blank, n/a, ?', '445', 'Placeholder']
      ]
    },
    'Plant List': {
  desc: 'Real JSS/KSS plant + location codes across F3, SAP and QAD-EE ERPs. Intracompany codes collapse to their parent plant. Closed plants are retained for service-history lookups but excluded from active routing.',
  cols: ['Plant Code', 'Location', 'Commodity', 'ERP / DC', 'Aliases', 'Status'],
  rows: [
    ['71', 'ACUNA', 'Seatbelts', 'F3 · Eagle Pass', '91 (intracompany)', 'Active'],
    ['75', 'MONTERREY PLANT 2', 'Seatbelts', 'F3 / SAP · Eagle Pass', '92 (intracompany)', 'Active'],
    ['77', 'MONTERREY PLANT 2', 'Mex Mold – Trim & Accessories', 'F3 / SAP · Eagle Pass', '—', 'Active'],
    ['82', 'TORREON', 'Airbags', 'F3 · Eagle Pass', '89 (intracompany)', 'Active'],
    ['84', 'MONCLOVA', 'Airbags', 'F3 · Eagle Pass', '85 (intracompany)', 'Active'],
    ['86', 'MONTERREY PLANT 1', 'Steering Wheels', 'SAP · Eagle Pass', '87 (intracompany / Safety Autoparts MX)', 'Active'],
    ['97', 'ACUNA', 'Airbags', 'F3 · Eagle Pass', '98 (intracompany)', 'Active'],
    ['MOSES LAKE', 'MOSES LAKE', 'Inflators', 'F3', '—', 'Active'],
    ['V4U2', 'VH2', 'Seatbelts', 'QAD-EE · Loera – Brownsville TX', 'VH2', 'Active'],
    ['V4U5', 'VH2', 'ISS Electronics', 'QAD-EE · Brownsville TX', 'VH2', 'Active'],
    ['V4U3', 'VH2', 'Airbags', 'QAD-EE · Brownsville TX', 'VH2', 'Active'],
    ['V3U2', 'VH3', 'Steering Wheels', 'QAD-EE · Loera – Brownsville TX', 'VH3', 'Active'],
    ['V3U3', 'VH3', 'ISS Carbon Fiber', 'QAD-EE · Brownsville TX', 'VH3', 'Active'],
    ['73', 'PIQUA, OH', 'Seatbelts', 'F3 · PRMS 700', '—', 'Closed'],
    ['74', 'AGUA PRIETA', 'Seatbelts', 'F3 · Douglas', '93 (intracompany)', 'Closed'],
    ['76', '— (moved)', 'Seat Weight Sensors', 'Moved to VH2', '—', 'Closed'],
    ['31', '— (moved)', 'Electronics', 'Moved to VH2', '—', 'Closed'],
    ['VH1', 'VH1', '—', 'QAD-EE', '—', 'Closed'],
    ['VH4', 'VH4', 'Airbags', 'QAD-EE', '—', 'Closed']
  ]
},
    'Main Component Types': {
      desc: 'The four core safety component families that sit above the 96-part classification.',
      cols: ['Family', 'Description', 'Classifications', 'Status'],
      rows: [
        ['RETRACTORS', 'Seat belt retractor assemblies and subcomponents', '6', 'Active'],
        ['BUCKLES', 'Buckles, tongues, latch plates, and switches', '6', 'Active'],
        ['INFLATORS', 'Airbag inflator modules and initiators', '11', 'Active'],
        ['MGG', 'Micro gas generators, harnesses, and connectors', '7', 'Active']
      ]
    },
    'Status Values': {
      desc: 'Allowed lifecycle status values for any part. Replaces the old blank "Active Y/N" column.',
      cols: ['Status', 'Meaning', 'Counts Toward Active?', 'Color'],
      rows: [
        ['ACTIVE', 'In production or active service', 'Yes', 'Green'],
        ['INACTIVE', 'Not currently active, may still have demand', 'No', 'Red'],
        ['PENDING REVIEW', 'Awaiting a manager decision', 'No', 'Orange'],
        ['SERVICE ONLY', 'Out of production, service support only', 'Yes', 'Blue'],
        ['END OF LIFE', 'Past service obligation', 'No', 'Gray'],
        ['ARCHIVED', 'Hidden from working view, audit retained', 'No', 'Gray'],
        ['UNKNOWN', 'Status could not be determined', 'No', 'Gray']
      ]
    },
    'Phase Rate Matrix (Target / Floor)': {
      desc: 'Company-wide TWO-TRACK pricing schedule keyed by part life. Target \u00d7 = the rate we REQUEST/WANT (negotiation goal). Floor \u00d7 = the bare minimum we can NEVER price below. Multipliers apply to COGS. The >20 yr Target (18\u00d7) is an assumption pending management confirmation — everything else is from the source schedule.',
      cols: ['Part Life', 'Target \u00d7 (Requested)', 'Floor \u00d7 (Bare Min)', 'Negotiation Room', 'Note'],
      rows: [
        ['\u22645 years',  '1.5\u00d7', '1.1\u00d7', '0.4\u00d7', 'Newest parts'],
        ['\u226410 years', '5\u00d7',   '3\u00d7',   '2\u00d7',   'Mid service life'],
        ['\u226415 years', '10\u00d7',  '6\u00d7',   '4\u00d7',   'Late service life'],
        ['\u226420 years', '12\u00d7',  '10\u00d7',  '2\u00d7',   'Aging / wind-down'],
        ['>20 years',      '18\u00d7',  '15\u00d7',  '3\u00d7',   'ASSUMED Target — confirm with mgmt']
      ]
    },
    'Product Category Aliases': {
      desc: 'Maps the 101 messy source category spellings to canonical 96-part classifications.',
      cols: ['Source Value', 'Maps To', 'Component Family', 'Status'],
      rows: [
        ['Retractor', 'RETRACTOR ASSY', 'RETRACTORS', 'Mapped'],
        ['RETRACTOR', 'RETRACTOR ASSY', 'RETRACTORS', 'Mapped'],
        ['retractor assy', 'RETRACTOR ASSY', 'RETRACTORS', 'Mapped'],
        ['Buckle', 'BUCKLE ASSY', 'BUCKLES', 'Mapped'],
        ['BCKL', 'BUCKLE ASSY', 'BUCKLES', 'Mapped'],
        ['PAB', 'PAB MODULE', 'INFLATORS', 'Mapped'],
        ['Passenger Airbag', 'PAB MODULE', 'INFLATORS', 'Mapped'],
        ['mgg', 'MGG ASSY', 'MGG', 'Mapped'],
        ['Wire Harn', 'WIRE HARNESS', 'MGG', 'Mapped'],
        ['?', 'UNKNOWN', 'UNASSIGNED', 'Needs Review']
      ]
    },
    'Recommendation Types': {
      desc: 'The controlled set of system recommendations the AI may assign to a part.',
      cols: ['Recommendation', 'Trigger', 'Default Owner', 'Severity'],
      rows: [
        ['KEEP ACTIVE', 'Active with steady demand', 'Manager', 'Low'],
        ['REACTIVATE REVIEW', 'Inactive but future demand exists', 'Manager', 'High'],
        ['ARCHIVE CANDIDATE REVIEW', 'No demand, no backlog, EOP complete', 'Manager', 'Low'],
        ['PLANT & ORDER RISK', 'Backlog or supply shortfall', 'Manager', 'Critical'],
        ['SERVICE PRICE REVIEW', 'Thin margin or missing price', 'Pricing Admin', 'Medium'],
        ['CONFLICT REVIEW', 'Same ID, differing data', 'Admin', 'High'],
        ['DATA QUALITY REVIEW', 'Placeholder / junk identifiers', 'Admin', 'Low']
      ]
    },
    'Approval Rules': {
      desc: 'Who must approve each action before it commits. Enforced by role permissions.',
      cols: ['Action', 'Required Approver', 'Audit Logged?', 'Reversible?'],
      rows: [
        ['Archive a part', 'Service Lead or Admin', 'Yes', 'Yes (restore)'],
        ['Change service price', 'Pricing Admin', 'Yes', 'Yes'],
        ['Commit an import', 'Admin or Admin', 'Yes', 'Yes (rollback)'],
        ['Reactivate a part', 'Service Lead', 'Yes', 'Yes'],
        ['Permanently delete', 'Admin only (rare)', 'Yes', 'No'],
        ['Place / approve order', 'Planning Lead', 'Yes', 'Yes']
      ]
    },
    'Import Mapping Rules': {
      desc: 'Saved column-mapping patterns the Import Wizard remembers per OEM/file source.',
      cols: ['Source Pattern', 'Source Column', 'Maps To Field', 'Confidence'],
      rows: [
        ['Toyota Manager File', 'Part No', 'Customer Part #', '98%'],
        ['Toyota Manager File', 'JSS#', 'JSS Part #', '99%'],
        ['SAP Demand Report', 'Material', 'JSS Part #', '95%'],
        ['SAP Demand Report', 'Req Qty', 'Demand (4wk)', '92%'],
        ['GM Service Export', 'GM PN', 'Customer Part #', '97%'],
        ['Generic Plant File', 'Backorder', 'Backlog', '90%'],
        ['Prices File', 'Unit Price', 'Service Price', '96%']
      ]
    }
  };

  // ---------- DATA QUALITY ENGINE ----------
  function normId(x) {
    if (x === null || x === undefined) return null;
    var s = String(x).trim().toUpperCase();
    return s.length ? s : null;
  }
  function isPlaceholder(s) {
    if (!s) return true;
    if (['0', 'N/A', 'NA', 'NONE', 'UNKNOWN', 'TBD', '-'].indexOf(s) >= 0) return true;
    if (/^0+$/.test(s)) return true;
    if (/^S0+$/.test(s)) return true;
    if (s.length <= 1) return true;
    return false;
  }

  // build lookups
  const custCount = {};
  const custAttrs = {};
  const jssToCust = {};
  rawParts.forEach(function(p) {
    const c = normId(p.customerPart);
    const j = normId(p.jss);
    if (c && !isPlaceholder(c)) {
      custCount[c] = (custCount[c] || 0) + 1;
      const sig = [p.oem, p.desc, p.plant, p.price].join('|').toUpperCase();
      if (!custAttrs[c]) custAttrs[c] = {};
      custAttrs[c][sig] = true;
    }
    if (j && !isPlaceholder(j)) {
      if (!jssToCust[j]) jssToCust[j] = {};
      if (c) jssToCust[j][c] = true;
    }
  });

  function dqFlag(p) {
    if (p.dqResolved) return { type: 'CLEAN', tone: 'green', label: 'Clean', detail: 'Manually resolved in Data Quality Center.', family: 0 };
    const c = normId(p.customerPart);
    const j = normId(p.jss);
    const a = normId(p.altJss);
    const placeholder = isPlaceholder(c) || isPlaceholder(j) || (isPlaceholder(a) && (isPlaceholder(c) || isPlaceholder(j)));
    if (isPlaceholder(c) || (isPlaceholder(j) && isPlaceholder(c))) {
      return { type: 'PLACEHOLDER', label: 'Invalid Placeholder', tone: 'gray', detail: 'One or more identifiers are junk (0 / blank). Excluded from duplicate counts.', family: 0 };
    }
    // Service Required: S-prefix identifier means the part needs servicing — not junk
    if ((j && String(j).trim().toUpperCase() === 'S') || (c && String(c).trim().toUpperCase() === 'S')) {
      return { type: 'SERVICE_REQUIRED', label: 'Service Required', tone: 'amber', detail: 'S-prefix identifier indicates the part needs servicing. Review and complete record.', family: 1 };
    }
    // conflict: same customer part, differing attributes
    if (c && custCount[c] > 1 && Object.keys(custAttrs[c]).length > 1) {
      return { type: 'CONFLICT', label: 'Duplicate Conflict', tone: 'red', detail: 'Same Customer Part # appears with differing OEM / description / plant / price. Needs human review.', family: custCount[c] };
    }
    // exact duplicate: same customer part, identical attributes
    if (c && custCount[c] > 1 && Object.keys(custAttrs[c]).length === 1) {
      return { type: 'EXACT', label: 'Exact Duplicate', tone: 'amber', detail: 'Identical Customer Part # row appears more than once.', family: custCount[c] };
    }
    // legit one-to-many JSS family
    if (j && jssToCust[j] && Object.keys(jssToCust[j]).length > 1) {
      return { type: 'FAMILY', label: 'Linked Family', tone: 'indigo', detail: 'This JSS part serves multiple distinct Customer Part #s (legitimate one-to-many).', family: Object.keys(jssToCust[j]).length };
    }
    return { type: 'CLEAN', label: 'Clean', tone: 'green', detail: 'Unique and valid. No data-quality issue.', family: 1 };
  }

  const parts = rawParts.map(function(p) { return Object.assign({}, p, { dq: dqFlag(p) }); });
  // normalize dirty source values so filters collapse correctly
  function normOem(p){ return String(p.oem || '').trim() || 'Unknown'; }
  function normPlant(p){ var s = String(p.plant || '').trim(); return (!s || s === '0' || s === 'nan') ? 'Unassigned' : s; }
  function normCategory(p){ var s = String(p.category || p.productCategory || '').trim(); return (!s || s === 'nan') ? 'Unclassified' : s.toUpperCase(); }

  function optionCounts(normalizer){
  var map = {};
  parts.forEach(function(p){ var k = normalizer(p); map[k] = (map[k] || 0) + 1; });
  return Object.keys(map).sort(function(a,b){ return map[b] - map[a]; }).map(function(k){ return { key: k, count: map[k] }; });
  }
  const oemOptions = optionCounts(normOem);
  // Plant dropdown is driven 100% from Reference Data → Plant List (single source of truth).
  // Add / edit / delete a plant there and this dropdown updates automatically.
  const plantCounts = {};
  parts.forEach(function(p){ var k = normPlant(p); plantCounts[k] = (plantCounts[k] || 0) + 1; });
  var PLANT_REGISTRY = [
  { code:'71',  icParent:null,  acronym:'ACU-SB',     displayName:'Acuna SB',                 fullName:'Acuna — Seatbelts',                                   commodity:'Seatbelts',             erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'91',  icParent:'71',  acronym:'ACU-SB-IC',  displayName:'Acuna SB (IC)',             fullName:'Acuna — Seatbelts (Intracompany)',                     commodity:'Seatbelts',             erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'75',  icParent:null,  acronym:'MTY2-SB',    displayName:'Monterrey Plant 2 SB',      fullName:'Monterrey Plant 2 — Seatbelts',                       commodity:'Seatbelts',             erp:'F3/SAP', dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'92',  icParent:'75',  acronym:'MTY2-SB-IC', displayName:'Monterrey Plant 2 SB (IC)', fullName:'Monterrey Plant 2 — Seatbelts (Intracompany)',         commodity:'Seatbelts',             erp:'F3/SAP', dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'77',  icParent:null,  acronym:'MTY2-TR',    displayName:'Monterrey Plant 2 Trim',    fullName:'Monterrey Plant 2 — Trim & Accessories',              commodity:'Mex Mold – Trim & Accessories', erp:'F3/SAP', dc:'Eagle Pass',  company:'JSS', closed:false },
  { code:'82',  icParent:null,  acronym:'TOR-AB',     displayName:'Torreon AB',                fullName:'Torreon — Airbags',                                   commodity:'Airbags',               erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'89',  icParent:'82',  acronym:'TOR-AB-IC',  displayName:'Torreon AB (IC)',            fullName:'Torreon — Airbags (Intracompany)',                     commodity:'Airbags',               erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'84',  icParent:null,  acronym:'MON-AB',     displayName:'Monclova AB',               fullName:'Monclova — Airbags',                                  commodity:'Airbags',               erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'85',  icParent:'84',  acronym:'MON-AB-IC',  displayName:'Monclova AB (IC)',           fullName:'Monclova — Airbags (Intracompany)',                    commodity:'Airbags',               erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'86',  icParent:null,  acronym:'MTY1-SW',    displayName:'Monterrey Plant 1 SW',      fullName:'Monterrey Plant 1 — Steering Wheels',                 commodity:'Steering Wheels',       erp:'SAP',    dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'87',  icParent:'86',  acronym:'MTY1-SW-IC', displayName:'Monterrey Plant 1 SW (IC)', fullName:'Monterrey Plant 1 — Steering Wheels (Intracompany / Safety Autoparts MX)', commodity:'Steering Wheels', erp:'SAP', dc:'Eagle Pass', company:'JSS', closed:false },
  { code:'97',  icParent:null,  acronym:'ACU-AB',     displayName:'Acuna AB',                  fullName:'Acuna — Airbags',                                     commodity:'Airbags',               erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'98',  icParent:'97',  acronym:'ACU-AB-IC',  displayName:'Acuna AB (IC)',             fullName:'Acuna — Airbags (Intracompany)',                       commodity:'Airbags',               erp:'F3',     dc:'Eagle Pass',             company:'JSS', closed:false },
  { code:'MOSES LAKE', icParent:null, acronym:'MLK-INF', displayName:'Moses Lake INF',         fullName:'Moses Lake — Inflators',                              commodity:'Inflators',             erp:'F3',     dc:'',                       company:'JSS', closed:false },
  { code:'V4U2',icParent:null,  acronym:'VH2-SB',     displayName:'VH2 Seatbelts',             fullName:'VH2 — Seatbelts',                                     commodity:'Seatbelts',             erp:'QAD-EE', dc:'Loera – Brownsville TX', company:'KSS', closed:false },
  { code:'V4U5',icParent:null,  acronym:'VH2-ELEC',   displayName:'VH2 Electronics',           fullName:'VH2 — ISS Electronics',                               commodity:'ISS Electronics',       erp:'QAD-EE', dc:'Loera – Brownsville TX', company:'KSS', closed:false },
  { code:'V4U3',icParent:null,  acronym:'VH2-AB',     displayName:'VH2 Airbags',               fullName:'VH2 — Airbags',                                       commodity:'Airbags',               erp:'QAD-EE', dc:'Loera – Brownsville TX', company:'KSS', closed:false },
  { code:'V3U2',icParent:null,  acronym:'VH3-SW',     displayName:'VH3 Steering Wheels',       fullName:'VH3 — Steering Wheels',                               commodity:'Steering Wheels',       erp:'QAD-EE', dc:'Loera – Brownsville TX', company:'KSS', closed:false },
  { code:'V3U3',icParent:null,  acronym:'VH3-CF',     displayName:'VH3 Carbon Fiber',          fullName:'VH3 — ISS Carbon Fiber',                              commodity:'ISS Carbon Fiber',      erp:'QAD-EE', dc:'Loera – Brownsville TX', company:'KSS', closed:false },
  { code:'73',  icParent:null,  acronym:'PIQ-SB',     displayName:'Piqua OH (Closed)',         fullName:'Piqua, OH — Seatbelts (Closed)',                      commodity:'Seatbelts',             erp:'F3',     dc:'',                       company:'JSS', closed:true },
  { code:'74',  icParent:null,  acronym:'AGP-SB',     displayName:'Agua Prieta (Closed)',      fullName:'Agua Prieta — Seatbelts (Closed)',                    commodity:'Seatbelts',             erp:'F3',     dc:'Douglas',                company:'JSS', closed:true },
  { code:'93',  icParent:'74',  acronym:'AGP-SB-IC',  displayName:'Agua Prieta IC (Closed)',   fullName:'Agua Prieta — Seatbelts (Intracompany / Closed)',      commodity:'Seatbelts',             erp:'F3',     dc:'',                       company:'JSS', closed:true },
  { code:'76',  icParent:null,  acronym:'',           displayName:'____ (Closed)',             fullName:'____ — Seat Weight Sensors (Closed) → Moved to VH2', commodity:'Seat Weight Sensors',   erp:'F3',     dc:'',                       company:'JSS', closed:true },
  { code:'31',  icParent:null,  acronym:'',           displayName:'____ (Closed)',             fullName:'____ — Electronics (Closed) → Moved to VH2',          commodity:'Electronics',           erp:'F3',     dc:'',                       company:'JSS', closed:true },
  { code:'VH4', icParent:null,  acronym:'VH4',        displayName:'VH4 (Closed)',              fullName:'VH4 (Closed)',                                         commodity:'',                      erp:'QAD-EE', dc:'',                       company:'KSS', closed:true },
  { code:'VH1', icParent:null,  acronym:'VH1',        displayName:'VH1 (Closed)',              fullName:'VH1 (Closed)',                                         commodity:'',                      erp:'QAD-EE', dc:'',                       company:'KSS', closed:true },
  { code:'LAKELAND', icParent:null, acronym:'LKL',    displayName:'Lakeland VH (Closed)',      fullName:'Lakeland VH (Closed)',                                 commodity:'',                      erp:'QAD-EE', dc:'',                       company:'KSS', closed:true },
];
function plantCodesFor(code){ var result=[code]; PLANT_REGISTRY.forEach(function(p){ if(p.icParent===code) result.push(p.code); }); return result; }
function getPlant(code){ return PLANT_REGISTRY.find(function(p){ return p.code===String(code); })||null; }
const plantOptions = PLANT_REGISTRY.filter(function(p){ return !p.closed && !p.icParent; });
  // Product Category dropdown driven from Reference Data → Product Category Aliases.
  // Use the canonical 'Component Family' (col index 2), de-duplicated.
  const catCounts = {};
  parts.forEach(function(p){ var k = normCategory(p); catCounts[k] = (catCounts[k] || 0) + 1; });
  const _seenCat = {};
  const _refCatRows = (refData['Product Category Aliases'] && refData['Product Category Aliases'].rows.length > 0) ? refData['Product Category Aliases'].rows : [];
const categoryOptions = _refCatRows.length > 0
  ? _refCatRows.map(function(r){ return r[2]; }).filter(function(fam){ if (_seenCat[fam]) return false; _seenCat[fam] = true; return true; }).map(function(fam){ return { key: fam, count: catCounts[fam] || 0 }; })
  : Array.from(new Set(parts.map(function(p){ return p.component; }).concat(parts.map(function(p){ return p.type; })))).filter(Boolean).sort().map(function(fam){ return { key: fam, count: parts.filter(function(p){ return p.component === fam || p.type === fam; }).length }; });
if (catCounts['Unclassified']) categoryOptions.push({ key: 'Unclassified', count: catCounts['Unclassified'] });

  var oemKeys = getRefRows('OEM / Customer List').map(function(r){ return r[0]; });
  const oemDropdownOptions = oemKeys.map(function(k){ return { key: k, label: k, count: parts.filter(function(p){ return p.oem === k; }).length }; });
  const priorityOptions = ['Critical','High','Medium','Low'].map(function(k){ return { key: k, label: k, count: parts.filter(function(p){ return p.priority === k; }).length }; });
  const plantDropdownOptions = plantOptions.map(function(o){ return { key: o.code, label: o.displayName + ' (' + o.code + ')', count: plantCounts[o.code] || 0 }; });
  const categoryDropdownOptions = categoryOptions.map(function(o){ return { key: o.key, count: o.count }; });
  const subcategoryOptions = Array.from(new Set(parts.filter(function(p){ return selCategories.length === 0 || selCategories.indexOf(p.component) >= 0; }).map(function(p){ return p.subcategory; }).filter(Boolean))).sort().map(function(o){ return { key: o, label: o }; });

  function familySiblings(p) {
    const j = normId(p.jss);
    if (!j || !p.dq || p.dq.type !== 'FAMILY') return [];
    return parts.filter(function(o) { return normId(o.jss) === j && o.id !== p.id; });
  }

  const dqCounts = {
    family: parts.filter(function(p){ return p.dq.type === 'FAMILY'; }).length,
    conflict: parts.filter(function(p){ return p.dq.type === 'CONFLICT'; }).length,
    placeholder: parts.filter(function(p){ return p.dq.type === 'PLACEHOLDER'; }).length,
    exact: parts.filter(function(p){ return p.dq.type === 'EXACT'; }).length,
    unclassified: parts.filter(function(p){ return p.dq.type === 'UNCLASSIFIED'; }).length
  };

  const navGroups = [
    { label: 'Home', items: ['Quick Actions', 'Dashboard'] },
    { label: 'Service Database', items: ['Master Terminal', 'Service Life Phase', 'Archive Review'] },
    { label: 'Operations', items: ['Action Queues', 'Morning Action Report'] },
    { label: 'Data Management', items: ['Import Wizard', 'Data Quality Center', 'Reference Data'] },
    { label: 'Customer / Service', items: ['Service Price Review'] },
    { label: 'Reports', items: ['Reports & Exports', 'Audit History'] },
    { label: 'System', items: ['Admin & Roles'] }
  ];

  const filteredParts = parts.filter(function(p){
      if (archiveMode !== 'all') { var _d = partDecisions[p.id]; if (_d && _d.archiveStatus && String(_d.archiveStatus).toLowerCase() === 'archived') return false; }
      if (archiveMode === 'active' && p.active !== 'ACTIVE') return false;
      if (archiveMode === 'archived' && !isArchived(p)) return false;
      if (selOEMs.length > 0 && selOEMs.indexOf(p.oem) < 0) return false;
      if (selPriorities.length > 0 && selPriorities.indexOf(p.priority) < 0) return false;
      if (selPlants.length > 0) {
  var matched = selPlants.some(function(sel){ return plantCodesFor(sel).indexOf(String(p.plant)) >= 0; });
  if (!matched) return false;
  }
  if (eopFilter === 'Missing EOP') {
  var eop = parseInt(p.serviceEop, 10);
  if (!isNaN(eop) && String(p.serviceEop).toLowerCase().indexOf('unknown') < 0 && eop > 0) return false;
  }
  if (eopFilter === 'Has EOP') {
    var eop2 = parseInt(p.serviceEop, 10);
    if (isNaN(eop2) || String(p.serviceEop).toLowerCase().indexOf('unknown') >= 0 || eop2 <= 0) return false;
  }

      if (selCategories.length > 0 && selCategories.indexOf(p.component) < 0) return false;
      if (selSubcategories.length > 0 && selSubcategories.indexOf(p.subcategory) < 0) return false;
      return true;
    }).slice().sort(function(a, b){
      if (!sortKey) return 0;
      var av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      av = String(av || '').toLowerCase(); bv = String(bv || '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

function ActionModal() {
    if (!actionModal) return null;
    const p = actionModal.part;
    const PRIORITY_CHOICES = ['Critical', 'High', 'Medium', 'Low'];
    const ACTION_CHOICES = ['Archive Part', 'Keep Active', 'Flag for Team Review', 'Lock as Active', 'Flag Data Issue'];
    const VISIBLE_TO_CHOICES = ['OEM Account Manager', 'All Managers', 'Specific Manager'];
    const PEOPLE = ['Harry Lee', 'Patrick Kennedy', 'Tom Lickert', 'Yusuki Yamaski', 'Scott Hawkins', 'Michelle Valls', 'Sarah Florka', 'Brian Hyttinen', 'Mike Wild', 'Chad Ritz', 'Lance Bertelle', 'Li Jing', 'Jeanete Gonzalez', 'Anaidh Lopez', 'Ernest Ruiz'];

    const existing = partDecisions[p.id] || {};
    const [localAction, setLocalAction] = React.useState(existing.lastAction || '');
    const [localVisibleTo, setLocalVisibleTo] = React.useState(existing.visibleTo || 'OEM Account Manager');
    const [localSpecific, setLocalSpecific] = React.useState(existing.specificPerson || PEOPLE[0]);
    const [localPriority, setLocalPriority] = React.useState(existing.priority || p.priority || 'Medium');
    const [localNote, setLocalNote] = React.useState('');

    const derivedOwner = oemOwner(p.oem);
    const derivedGkam = oemGkam(p.oem);

    function close(){ setActionModal(null); }
    function save(){
      if (!localAction) return;
      const now = new Date();
      const ts = now.toISOString().slice(0,10) + ' ' + now.toTimeString().slice(0,5);
      const user = (typeof currentUser !== 'undefined' && currentUser && currentUser.name) ? currentUser.name : 'Michael Colon';
      const visibleResolved = localVisibleTo === 'Specific Manager' ? localSpecific : (localVisibleTo === 'OEM Account Manager' ? derivedOwner : 'All Managers');

      // Determine target IDs — bulk if multiple checked, single otherwise
      var targetIds = selectedArchiveIds.length > 1 ? selectedArchiveIds.slice() : [p.id];

      // Build the decision overlay based on action
      var overlay = { lastAction: localAction, lastBy: user, lastAt: ts, priority: localPriority, note: localNote, visibleTo: localVisibleTo, specificPerson: localSpecific, owner: derivedOwner };
      if (localAction === 'Archive Part') { overlay.status = 'ARCHIVED'; overlay.archiveStatus = 'Archived'; overlay.approvalStatus = 'Approved'; overlay.recommendation = 'ARCHIVED'; }
      else if (localAction === 'Keep Active') { overlay.status = 'ACTIVE'; overlay.dqOverride = { type: 'CLEAN', tone: 'green', label: 'Clean', detail: 'No data quality issues.' }; overlay.archiveStatus = 'Active'; overlay.approvalStatus = 'Kept Active'; overlay.recommendation = 'KEEP ACTIVE'; overlay.lockedActive = false; }
      else if (localAction === 'Flag for Team Review') { overlay.status = 'REVIEW'; overlay.archiveStatus = 'Needs Review'; overlay.approvalStatus = 'Manager Review'; overlay.recommendation = 'TEAM REVIEW'; }
      else if (localAction === 'Lock as Active') { overlay.status = 'ACTIVE'; overlay.lockedActive = true; overlay.archiveStatus = 'Blocked'; overlay.approvalStatus = 'Blocked'; overlay.recommendation = 'KEEP ACTIVE (LOCKED)'; }
      else if (localAction === 'Flag Data Issue') { overlay.dqOverride = { type: 'NEEDS_FIX', tone: 'red', label: 'Needs Fix', detail: localNote || 'Data quality issue flagged for review.' }; overlay.archiveStatus = 'Pending Data'; overlay.approvalStatus = 'Needs Owner Review'; overlay.recommendation = 'DATA QUALITY REVIEW'; }

      var targetIds = selectedArchiveIds.length > 0 ? selectedArchiveIds.slice() : [p.id];
      var targetIds = (selectedArchiveIds && selectedArchiveIds.length > 0) ? selectedArchiveIds.slice() : [p.id];
      setPartDecisions(function(prev){ var n = Object.assign({}, prev); targetIds.forEach(function(tid){ n[tid] = Object.assign({}, prev[tid] || {}, overlay); }); return n; });

      // Audit log — one entry per affected part
      var auditAction = localAction === 'Archive Part' ? 'ARCHIVE' : localAction === 'Keep Active' ? 'STATUS CHANGE' : localAction === 'Flag for Team Review' ? 'FLAG RAISED' : localAction === 'Lock as Active' ? 'STATUS CHANGE' : 'FLAG RAISED';
      var auditEntries = targetIds.map(function(tid, i){
        var tPart = parts.find(function(r){ return r.id === tid; }) || p;
        return { id: 'A-' + Date.now() + '-' + i, ts: ts, user: user, role: 'Manager', action: auditAction, module: actionModal.source || 'Master Terminal', target: 'JSS ' + tPart.jss + ' · ' + tPart.oem, before: tPart.active || '—', after: overlay.status || tPart.active || '—', note: localNote || (localAction + ' applied'), reversible: true, visibleTo: visibleResolved, priority: localPriority, live: true };
      });
      setTaskAudit(function(prev){ return auditEntries.concat(prev); });

      // Also bridge to archiveDecisions for Archive Review consistency
      if (localAction === 'Archive Part' || localAction === 'Keep Active' || localAction === 'Lock as Active') {
        setArchiveDecisions(function(prev){ var n = Object.assign({}, prev); targetIds.forEach(function(tid){ n[tid] = { status: overlay.archiveStatus, reason: localNote || (localAction + ' via Assign/Update Action') }; }); return n; });
      }

      if (targetIds.length > 1) setSelectedArchiveIds([]);
      setActionModal(null);
    }
    const noAction = !localAction;

    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Assign / Update Action</div>{selectedArchiveIds.length > 1 ? <React.Fragment><h2 className="text-lg font-bold text-gray-900 mt-1">{selectedArchiveIds.length} Parts Selected</h2><p className="text-sm text-gray-500 mt-0.5">Action will apply to all {selectedArchiveIds.length} checked parts · {actionModal.source}</p></React.Fragment> : <React.Fragment><h2 className="text-lg font-bold text-gray-900 mt-1">{p.jss}</h2>{p && <p className="text-sm text-gray-500 mt-0.5">{p.oem} · Plant {p.plant} · {actionModal.source}</p>}</React.Fragment>}</div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4"><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Action</label><select value={localAction} onChange={function(e){ setLocalAction(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"><option value="">— Select an action —</option>{ACTION_CHOICES.map(function(a){ return <option key={a} value={a}>{a}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Flag Visible To</label><select value={localVisibleTo} onChange={function(e){ setLocalVisibleTo(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{VISIBLE_TO_CHOICES.map(function(v){ return <option key={v} value={v}>{v}</option>; })}</select>{localVisibleTo === 'OEM Account Manager' && <div className="mt-1 text-xs text-gray-500">Auto-routed to: <span className="font-semibold text-gray-700">{derivedOwner}</span>{derivedGkam && derivedGkam !== derivedOwner ? <span className="text-gray-400"> · <span className="font-semibold text-gray-600">{derivedGkam}</span> (GKAM)</span> : null} ({p.oem})</div>}{localVisibleTo === 'Specific Manager' && <select value={localSpecific} onChange={function(e){ setLocalSpecific(e.target.value); }} className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{PEOPLE.map(function(person){ return <option key={person} value={person}>{person}</option>; })}</select>}</div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Priority</label><select value={localPriority} onChange={function(e){ setLocalPriority(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{PRIORITY_CHOICES.map(function(pr){ return <option key={pr} value={pr}>{pr}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Note</label><textarea value={localNote} onChange={function(e){ setLocalNote(e.target.value); }} rows={3} placeholder="Add context for the team / audit trail..." className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></textarea></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">This action updates the part on the current page, posts to the chosen visibility, and is recorded in Audit History with your name and timestamp.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={save} disabled={noAction} className={(noAction ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700') + ' rounded-lg px-4 py-2 text-sm font-medium'}>Assign Action</button></div></div></React.Fragment>;
  }

function SimplePage(props) {
    return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-gray-900">{props.title}</h1><p className="text-gray-500">{props.subtitle}</p></div>{props.cards && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{props.cards.map(function(c){ return <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} tone={c.tone} />; })}</div>}<Table rows={props.rows || parts} /></div>;
  }

  // ---------- ARCHIVE: Export Candidates drawer ----------
  // Builds an export of the archive candidate queue (filterable by status) — pre-joined and ready
  // to hand to a manager. Mirrors the Order Plan export pattern.
    function ArchiveExportModal(props) {
    if (!archiveExportOpen) return null;
    var allRows = props.rows;
    var sel = props.selectedIds || [];
    var selectedRows = allRows.filter(function(r){ return sel.indexOf(r.id) >= 0; });
    var exportView = props.exportView;
    var setExportView = props.setExportView;
    var rows = exportView === 'selected' ? selectedRows : allRows;
    function close(){ setArchiveExportOpen(false); }
    var EXP_COLS = [
      { header: 'Archive Status', key: 'archiveStatus' },
      { header: 'OEM',            key: 'oem' },
      { header: 'JSS Part No.',   key: 'jss' },
      { header: 'Description',    key: 'desc' },
      { header: 'Demand',         key: 'demand' },
      { header: 'Backlog',        key: 'backlog' },
      { header: 'Service EOP',    key: 'serviceEop' }
    ];

    function downloadArchiveCSV() {
      if (rows.length === 0) return;
      var head = EXP_COLS.map(function(c){ return '"' + c.header + '"'; }).join(',');
      var body = rows.map(function(r){
        return EXP_COLS.map(function(c){
          var v = r[c.key];
          v = (v === undefined || v === null) ? '' : String(v);
          return '"' + v.replace(/"/g, '""') + '"';
        }).join(',');
      }).join('\n');
      var blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'archive-' + exportView + '-' + new Date().getFullYear() + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      close();
    }

    async function downloadArchiveExcel() {
      if (rows.length === 0) return;
      console.log('ExcelJS is:', typeof ExcelJS);
      if (typeof ExcelJS === 'undefined') { alert('ExcelJS not loaded.'); return; }
      var wb = new ExcelJS.Workbook();
      var ws = wb.addWorksheet('Archive Candidates');
      ws.columns = EXP_COLS.map(function(c, i){ return { width: (i === 3 ? 36 : 18) }; });

      var hdr = ws.addRow(EXP_COLS.map(function(c){ return c.header; }));
      hdr.eachCell(function(cell){
        cell.font = { name: 'Aptos Narrow', size: 11, bold: true, underline: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCAEDFB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      rows.forEach(function(r){
        var row = ws.addRow(EXP_COLS.map(function(c){
          var v = r[c.key];
          return (v === undefined || v === null) ? '' : v;
        }));
        row.eachCell(function(cell){
          cell.font = { name: 'Aptos Narrow', size: 11 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXP_COLS.length } };

      var buf = await wb.xlsx.writeBuffer();
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'archive-' + exportView + '-' + new Date().getFullYear() + '.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      close();
    }
    var counts = {
      'Ready to Archive': rows.filter(function(r){ return r.archiveStatus === 'Ready to Archive'; }).length,
      'Needs Review': rows.filter(function(r){ return r.archiveStatus === 'Needs Review'; }).length,
      'Blocked': rows.filter(function(r){ return r.archiveStatus === 'Blocked'; }).length,
      'Pending Data': rows.filter(function(r){ return r.archiveStatus === 'Pending Data'; }).length
    };
    var statusStyles = { 'Ready to Archive': 'bg-green-100 text-green-800 border-green-200', 'Needs Review': 'bg-orange-100 text-orange-800 border-orange-200', 'Blocked': 'bg-red-100 text-red-800 border-red-200', 'Pending Data': 'bg-blue-100 text-blue-800 border-blue-200', 'Active': 'bg-purple-100 text-purple-800 border-purple-200', 'Archived': 'bg-gray-100 text-gray-700 border-gray-200' };
    // Columns to export from the archive queue
    var EXP_COLS = [
      { header: 'Archive Status', key: 'archiveStatus' },
      { header: 'OEM',            key: 'oem' },
      { header: 'JSS Part No.',   key: 'jss' },
      { header: 'Description',    key: 'desc' },
      { header: 'Demand',         key: 'demand' },
      { header: 'Backlog',        key: 'backlog' },
      { header: 'Service EOP',    key: 'serviceEop' }
    ];

    function downloadArchiveCSV() {
      var head = EXP_COLS.map(function(c){ return '"' + c.header + '"'; }).join(',');
      var body = rows.map(function(r){
        return EXP_COLS.map(function(c){
          var v = r[c.key];
          v = (v === undefined || v === null) ? '' : String(v);
          return '"' + v.replace(/"/g, '""') + '"';
        }).join(',');
      }).join('\n');
      var csv = head + '\n' + body;
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'archive-candidates-' + new Date().getFullYear() + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      close();
    }

    return <React.Fragment><div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Export Candidates</div><h2 className="text-lg font-bold text-gray-900 mt-1">Archive Review</h2><p className="text-sm text-gray-500 mt-0.5">{rows.length} candidate(s) {exportView === 'selected' ? 'selected' : 'in the queue'} — pre-joined and ready to export.</p></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="px-5 pt-4"><div className="inline-flex bg-gray-100 rounded-lg p-1"><button onClick={function(){ setExportView('selected'); }} className={(exportView === 'selected' ? 'bg-white shadow text-gray-900' : 'text-gray-600') + ' rounded-md px-4 py-1.5 text-sm font-medium'}>Selected ({selectedRows.length})</button><button onClick={function(){ setExportView('all'); }} className={(exportView === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600') + ' rounded-md px-4 py-1.5 text-sm font-medium'}>All candidates ({allRows.length})</button></div></div><div className="flex-1 overflow-auto p-5 space-y-4"><div className="grid grid-cols-4 gap-3">{['Ready to Archive','Needs Review','Blocked','Pending Data'].map(function(k){ return <div key={k} className="border border-gray-200 rounded-xl p-3"><div className="text-xs text-gray-500">{k}</div><div className="text-2xl font-bold text-gray-900 mt-1">{counts[k]}</div></div>; })}</div>{rows.length === 0 ? <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No rows selected. Tick rows in the Archive Candidate Queue, or switch to <button onClick={function(){ setExportView('all'); }} className="text-blue-600 underline">All candidates</button> to export the full queue.</div> : <div className="border border-gray-200 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Status</th><th className="text-left p-3">OEM</th><th className="text-left p-3">JSS Part</th><th className="text-left p-3">Description</th><th className="text-left p-3">Service EOP</th></tr></thead><tbody>{rows.map(function(r){ return <tr key={r.id} className="border-t border-gray-100"><td className="p-3"><span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (statusStyles[r.archiveStatus] || statusStyles['Needs Review'])}>{r.archiveStatus}</span></td><td className="p-3 font-medium">{r.oem}</td><td className="p-3 font-mono text-xs">{r.jss}</td><td className="p-3 max-w-xs truncate">{r.desc}</td><td className="p-3">{r.serviceEop}</td></tr>; })}</tbody></table></div></div>}<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900"><span className="font-semibold">What you'll get:</span> {exportView === 'selected' ? 'only the rows you ticked' : 'the full candidate queue'} with status, readiness reason, demand/backlog, and EOP — pre-joined into one sheet. This export is audit-logged with your name and timestamp.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1 text-xs text-gray-500">Exporting <span className="font-semibold text-gray-900">{rows.length}</span> row(s)</div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={downloadArchiveCSV} disabled={rows.length === 0} className={'rounded-lg px-4 py-2 text-sm font-medium ' + (rows.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700')}>Download CSV ({rows.length})</button><button onClick={downloadArchiveExcel} disabled={rows.length === 0} className={'rounded-lg px-4 py-2 text-sm font-medium ' + (rows.length === 0 ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white')}>Download Excel ({rows.length})</button></div></div></React.Fragment>;
  }

  // ---------- ARCHIVE: Submit Selected drawer ----------
  // Confirms the batch of checked rows being routed for archive approval. On confirm it stamps each
  // selected row as "Pending Data" and clears the selection.
  function ArchiveSubmitModal(props) {
    if (!archiveSubmitOpen) return null;
    var rows = props.rows;
    function close(){ setArchiveSubmitOpen(false); }
    var selected = rows.filter(function(r){ return selectedArchiveIds.indexOf(r.id) >= 0; });
    var blockedSel = selected.filter(function(r){ return r.archiveStatus === 'Blocked'; });
    function confirm(){
    var eligible = selected.filter(function(r){ return r.archiveStatus !== 'Blocked'; });
    if (eligible.length === 0) { setArchiveSubmitOpen(false); return; }
    setArchiveDecisions(function(prev){
        var n = Object.assign({}, prev);
        eligible.forEach(function(r){ n[r.id] = { status: 'Pending Data', reason: 'Flagged for follow-up — visible to the team in Action Queues until missing data is filled in.' }; });
        savePersistent('archiveDecisions', n);
        return n;
    });
    var ts = (function(){ var d = new Date(); var p = function(n){ return (n<10?'0':'')+n; }; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()); })();
    var entries = eligible.map(function(r, i){
        return { id: 'AR-' + Date.now() + '-' + i, ts: ts, user: currentUser.name, role: currentUser.role,
            action: 'ROUTED FOR APPROVAL', module: 'Archive Review',
            target: 'JSS ' + r.jss + ' · ' + r.oem, before: r.archiveStatus, after: 'Pending Data',
            reversible: true, note: 'Flagged for follow-up from Archive Review — visible to the team until missing data is filled in.', live: true };
    });
    setArchiveAudit(function(prev){ var next = entries.concat(prev); savePersistent('archiveAudit', next); return next; });

    // === NEW: Bridge to Action Queues ===
    var newQueueTasks = eligible.map(function(r, i){
        return {
            id: 'T-ARC-' + Date.now() + '-' + i,
            title: 'Archive approval — ' + r.oem + ' ' + r.jss + ' (' + r.desc + ')',
            role: 'Director / GKAM',
            status: 'Pending Data',
            priority: (r.demand > 0 || r.backlog > 0) ? 'High' : 'Medium',
            source: 'Archive Review',
            jss: r.jss,
            oem: r.oem,
            partId: r.id,
            ageDays: 0,
            slaDays: 3,
            suggestion: 'Follow up on archive of ' + r.jss + ' (' + r.archiveStatus + ')',
            reason: r.archiveReason || 'Flagged from Archive Review — pending follow-up info.',
            assignee: 'Unassigned',
            live: true,
            submittedBy: currentUser.name,
            submittedAt: ts
        };
    });
    setQueueTasks(function(prev){ var next = prev.concat(newQueueTasks); return next; });
    newQueueTasks.forEach(function(t){ _supa.from('tasks').insert(t); });
    // === END NEW ===

    setSelectedArchiveIds([]);
    setArchiveSubmitOpen(false);
    alert('✓ ' + eligible.length + ' part(s) flagged for follow-up. Visible to the team in Action Queues. Logged to Audit History.');
}
    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Submit Selected</div><h2 className="text-lg font-bold text-gray-900 mt-1">Archive Review</h2><p className="text-sm text-gray-500 mt-0.5">{selected.length} part(s) will be routed for archive approval.</p></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4">{selected.length === 0 ? <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">No rows selected. Tick rows in the queue (or use the header checkbox to grab all Ready-to-Archive rows) and try again.</div> : <React.Fragment>{blockedSel.length > 0 && <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-900"><span className="font-bold">{blockedSel.length} blocked row(s)</span> in your selection will be skipped — blocked parts can't be archived until their demand/backlog/EOP is cleared.</div>}<div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">JSS Part</th><th className="text-left p-3">OEM</th><th className="text-left p-3">Status</th></tr></thead><tbody>{selected.map(function(r){ return <tr key={r.id} className="border-t border-gray-100"><td className="p-3 font-mono text-xs">{r.jss}</td><td className="p-3">{r.oem}</td><td className="p-3 text-xs">{r.archiveStatus}</td></tr>; })}</tbody></table></div></React.Fragment>}<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Submitting routes these parts to the <span className="font-semibold">Pending Data</span> queue for a manager/admin to confirm. Archiving is always reversible and fully audit-logged.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={confirm} disabled={selected.length === 0} className={(selected.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700') + ' rounded-lg px-4 py-2 text-sm font-medium'}>Submit for Approval</button></div></div></React.Fragment>;
  }

  // ---------- ASSIGN / UPDATE ACTION drawer ----------
  // Generic action assignment used from the Archive Review (and reusable elsewhere). Lets the
  // reviewer pick an action, owner, priority, and note for the selected part. Records to session.
  function ActionModal() {
    if (!actionModal) return null;
    const p = actionModal.part;
    const PRIORITY_CHOICES = ['Critical', 'High', 'Medium', 'Low'];
    const ACTION_CHOICES = ['Archive Part', 'Keep Active', 'Flag for Team Review', 'Lock as Active', 'Flag Data Issue'];
    const VISIBLE_TO_CHOICES = ['OEM Account Manager', 'All Managers', 'Specific Manager'];
    const PEOPLE = ['Harry Lee', 'Patrick Kennedy', 'Tom Lickert', 'Yusuki Yamaski', 'Scott Hawkins', 'Michelle Valls', 'Sarah Florka', 'Brian Hyttinen', 'Mike Wild', 'Chad Ritz', 'Lance Bertelle', 'Li Jing', 'Jeanete Gonzalez', 'Anaidh Lopez', 'Ernest Ruiz'];

    const existing = partDecisions[p.id] || {};
    const [localAction, setLocalAction] = React.useState(existing.lastAction || '');
    const [localVisibleTo, setLocalVisibleTo] = React.useState(existing.visibleTo || 'OEM Account Manager');
    const [localSpecific, setLocalSpecific] = React.useState(existing.specificPerson || PEOPLE[0]);
    const [localPriority, setLocalPriority] = React.useState(existing.priority || p.priority || 'Medium');
    const [localNote, setLocalNote] = React.useState('');

    const derivedOwner = oemOwner(p.oem);
    const derivedGkam = oemGkam(p.oem);

    function close(){ setActionModal(null); }
    function save(){
      if (!localAction) return;
      const now = new Date();
      const ts = now.toISOString().slice(0,10) + ' ' + now.toTimeString().slice(0,5);
      const user = (typeof currentUser !== 'undefined' && currentUser && currentUser.name) ? currentUser.name : 'Michael Colon';
      const visibleResolved = localVisibleTo === 'Specific Manager' ? localSpecific : (localVisibleTo === 'OEM Account Manager' ? derivedOwner : 'All Managers');

      // Determine target IDs — bulk if multiple checked, single otherwise
      var targetIds = selectedArchiveIds.length > 1 ? selectedArchiveIds.slice() : [p.id];

      // Build the decision overlay based on action
      var overlay = { lastAction: localAction, lastBy: user, lastAt: ts, priority: localPriority, note: localNote, visibleTo: localVisibleTo, specificPerson: localSpecific, owner: derivedOwner };
      if (localAction === 'Archive Part') { overlay.status = 'ARCHIVED'; overlay.archiveStatus = 'Archived'; overlay.approvalStatus = 'Approved'; overlay.recommendation = 'ARCHIVED'; }
      else if (localAction === 'Keep Active') { overlay.status = 'ACTIVE'; overlay.dqOverride = { type: 'CLEAN', tone: 'green', label: 'Clean', detail: 'No data quality issues.' }; overlay.archiveStatus = 'Active'; overlay.approvalStatus = 'Kept Active'; overlay.recommendation = 'KEEP ACTIVE'; overlay.lockedActive = false; }
      else if (localAction === 'Flag for Team Review') { overlay.status = 'REVIEW'; overlay.archiveStatus = 'Needs Review'; overlay.approvalStatus = 'Manager Review'; overlay.recommendation = 'TEAM REVIEW'; }
      else if (localAction === 'Lock as Active') { overlay.status = 'ACTIVE'; overlay.lockedActive = true; overlay.archiveStatus = 'Blocked'; overlay.approvalStatus = 'Blocked'; overlay.recommendation = 'KEEP ACTIVE (LOCKED)'; }
      else if (localAction === 'Flag Data Issue') { overlay.dqOverride = { type: 'NEEDS_FIX', tone: 'red', label: 'Needs Fix', detail: localNote || 'Data quality issue flagged for review.' }; overlay.archiveStatus = 'Pending Data'; overlay.approvalStatus = 'Needs Owner Review'; overlay.recommendation = 'DATA QUALITY REVIEW'; }

      var targetIds = selectedArchiveIds.length > 0 ? selectedArchiveIds.slice() : [p.id];
      var targetIds = (selectedArchiveIds && selectedArchiveIds.length > 0) ? selectedArchiveIds.slice() : [p.id];
      setPartDecisions(function(prev){ var n = Object.assign({}, prev); targetIds.forEach(function(tid){ n[tid] = Object.assign({}, prev[tid] || {}, overlay); }); return n; });

      // Audit log — one entry per affected part
      var auditAction = localAction === 'Archive Part' ? 'ARCHIVE' : localAction === 'Keep Active' ? 'STATUS CHANGE' : localAction === 'Flag for Team Review' ? 'FLAG RAISED' : localAction === 'Lock as Active' ? 'STATUS CHANGE' : 'FLAG RAISED';
      var auditEntries = targetIds.map(function(tid, i){
        var tPart = parts.find(function(r){ return r.id === tid; }) || p;
        return { id: 'A-' + Date.now() + '-' + i, ts: ts, user: user, role: 'Manager', action: auditAction, module: actionModal.source || 'Master Terminal', target: 'JSS ' + tPart.jss + ' · ' + tPart.oem, before: tPart.active || '—', after: overlay.status || tPart.active || '—', note: localNote || (localAction + ' applied'), reversible: true, visibleTo: visibleResolved, priority: localPriority, live: true };
      });
      setTaskAudit(function(prev){ return auditEntries.concat(prev); });

      // Also bridge to archiveDecisions for Archive Review consistency
      if (localAction === 'Archive Part' || localAction === 'Keep Active' || localAction === 'Lock as Active') {
        setArchiveDecisions(function(prev){ var n = Object.assign({}, prev); targetIds.forEach(function(tid){ n[tid] = { status: overlay.archiveStatus, reason: localNote || (localAction + ' via Assign/Update Action') }; }); return n; });
      }

      if (targetIds.length > 1) setSelectedArchiveIds([]);
      setActionModal(null);
    }
    const noAction = !localAction;

    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Assign / Update Action</div>{selectedArchiveIds.length > 1 ? <React.Fragment><h2 className="text-lg font-bold text-gray-900 mt-1">{selectedArchiveIds.length} Parts Selected</h2><p className="text-sm text-gray-500 mt-0.5">Action will apply to all {selectedArchiveIds.length} checked parts · {actionModal.source}</p></React.Fragment> : <React.Fragment><h2 className="text-lg font-bold text-gray-900 mt-1">{p.jss}</h2>{p && <p className="text-sm text-gray-500 mt-0.5">{p.oem} · Plant {p.plant} · {actionModal.source}</p>}</React.Fragment>}</div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4"><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Action</label><select value={localAction} onChange={function(e){ setLocalAction(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"><option value="">— Select an action —</option>{ACTION_CHOICES.map(function(a){ return <option key={a} value={a}>{a}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Flag Visible To</label><select value={localVisibleTo} onChange={function(e){ setLocalVisibleTo(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{VISIBLE_TO_CHOICES.map(function(v){ return <option key={v} value={v}>{v}</option>; })}</select>{localVisibleTo === 'OEM Account Manager' && <div className="mt-1 text-xs text-gray-500">Auto-routed to: <span className="font-semibold text-gray-700">{derivedOwner}</span>{derivedGkam && derivedGkam !== derivedOwner ? <span className="text-gray-400"> · <span className="font-semibold text-gray-600">{derivedGkam}</span> (GKAM)</span> : null} ({p.oem})</div>}{localVisibleTo === 'Specific Manager' && <select value={localSpecific} onChange={function(e){ setLocalSpecific(e.target.value); }} className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{PEOPLE.map(function(person){ return <option key={person} value={person}>{person}</option>; })}</select>}</div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Priority</label><select value={localPriority} onChange={function(e){ setLocalPriority(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{PRIORITY_CHOICES.map(function(pr){ return <option key={pr} value={pr}>{pr}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Note</label><textarea value={localNote} onChange={function(e){ setLocalNote(e.target.value); }} rows={3} placeholder="Add context for the team / audit trail..." className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></textarea></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">This action updates the part on the current page, posts to the chosen visibility, and is recorded in Audit History with your name and timestamp.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={save} disabled={noAction} className={(noAction ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700') + ' rounded-lg px-4 py-2 text-sm font-medium'}>Assign Action</button></div></div></React.Fragment>;
  }

  function SimplePage(props) {
    return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-gray-900">{props.title}</h1><p className="text-gray-500">{props.subtitle}</p></div>{props.cards && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{props.cards.map(function(c){ return <StatCard key={c.title} title={c.title} value={c.value} subtitle={c.subtitle} tone={c.tone} />; })}</div>}<Table rows={props.rows || parts} /></div>;
  }

function Content() {
    if (page === 'Quick Actions') return <QuickActions />;
    if (page === 'Morning Action Report') return <MorningActionReport />;
    if (page === 'Dashboard') return <Dashboard rawAudit={rawAudit} />;
    if (page === 'Master Terminal') return <MasterTerminal />;
    if (page === 'Service Life Phase') return <ServiceLifePhase />;
    if (page === 'Archive Review') return <ArchiveReview mainScrollRef={scrollRef} onOpenDetail={setSelectedPart} appSelectedPart={selectedPart} parts={parts} archiveDecisions={archiveDecisions} setArchiveDecisions={setArchiveDecisions} manualArchiveIds={manualArchiveIds} partDecisions={partDecisions} setPartDecisions={setPartDecisions} currentUser={currentUser} _supaWrite={_supaWrite} archiveAudit={archiveAudit} setArchiveAudit={setArchiveAudit} archiveMode={archiveMode} setArchiveMode={setArchiveMode} isArchived={isArchived} resolvePart={resolvePart} setQueueTasks={setQueueTasks} />;
    if (page === 'Action Queues') return <ActionQueues />;
    if (page === 'Import Wizard') return <ImportWizard />;
    if (page === 'Data Quality Center') return <DataQualityCenter />;
    if (page === 'Service Price Review') return <ServicePriceReview />;
    if (page === 'Reference Data') return <ReferenceData />;
    if (page === 'Admin & Roles') return <AdminRoles />;
    if (page === 'Reports & Exports') return <ReportsExports />;
    if (page === 'Audit History') return <AuditHistory />;
    if (page === 'Export Terminal') return <ExportTerminal />;
    return <SimplePage title={page} subtitle="Prototype page placeholder for this workflow." rows={parts} />;
  }

  // ---------- SIGN-IN SPLASH (Microsoft SSO mockup) ----------
  // PROTOTYPE: this simulates the "Sign in with Microsoft" gate. In production this is
  // replaced by real Microsoft Entra ID (Azure AD) SSO — see the IT handoff doc.

function SignIn() {
    // Full staff roster keyed by team → title → names
    var TEAMS = [
      {
        id: 'creator', label: 'Creator',
        icon: '⭐', desc: 'System creator and primary administrator',
        roles: [
          { title: 'Creator & Main Admin', sysRole: 'Admin', people: [{ name: 'Michael Colon', email: 'Michael.Colon@joysonsafety.com' }] }
        ]
      },
      {
        id: 'service', label: 'Service & Campaign',
        icon: '🔧', desc: 'Campaign service, engineering, and procurement',
        roles: [
          { title: 'Director of Campaign Service', sysRole: 'Admin',   people: [{ name: 'Paul Smith',        email: 'Paul.Smith@joysonsafety.com' }] },
          { title: 'Service Eng',                  sysRole: 'Service', people: [{ name: 'Matt Baldassarre',  email: 'Matt.Baldassarre@joysonsafety.com' }] },
          { title: 'Service PM',                   sysRole: 'Service', people: [{ name: 'Brent Raschke',     email: 'Brent.Raschke@joysonsafety.com' }] },
          { title: 'Sr. Purchase Manager',         sysRole: 'Manager', people: [{ name: 'Laurie Brunt',      email: 'Laurie.Brunt@joysonsafety.com' }] }
        ]
      },
      {
        id: 'vp', label: 'VP / Executive',
        icon: '📊', desc: 'AME Sales executive leadership',
        roles: [
          { title: 'VP AME Sales', sysRole: 'Admin', people: [{ name: 'Sylvia Salahutdin', email: 'Sylvia.Salahutdin@joysonsafety.com' }] }
        ]
      },
      {
        id: 'account', label: 'Account Management',
        icon: '🤝', desc: 'OEM account managers and senior managers',
        roles: [
          { title: 'Sr. Manager Honda/Hyundai',         sysRole: 'Manager', people: [{ name: 'Tom Lickert',      email: 'Tom.Lickert@joysonsafety.com' }] },
          { title: 'Account Manager Toyota/Mazda',      sysRole: 'Manager', people: [{ name: 'Yusuki Yamaski',   email: 'Yusuki.Yamaski@joysonsafety.com' }] },
          { title: 'Sr. Manager STLA',                  sysRole: 'Manager', people: [{ name: 'Scott Hawkins',    email: 'Scott.Hawkins@joysonsafety.com' }] },
          { title: 'Sr. Manager Ford',                  sysRole: 'Manager', people: [{ name: 'Harry Lee',        email: 'Harry.Lee@joysonsafety.com' }] },
          { title: 'Sr. Account Manager GM',            sysRole: 'Manager', people: [{ name: 'Patrick Kennedy',  email: 'Patrick.Kennedy@joysonsafety.com' }] },
          { title: 'Sr. Manager Rivian/Slate/Specialty',sysRole: 'Manager', people: [{ name: 'Michelle Valls',   email: 'Michelle.Valls@joysonsafety.com' }] },
                { title: 'Sr. Manager VW',                    sysRole: 'Manager', people: [{ name: 'Jeanete Gonzalez', email: 'Jeanete.Gonzalez@joysonsafety.com' }] },
                { title: 'Account Manager Audi/Mercedes',     sysRole: 'Manager', people: [{ name: 'Anaidh Lopez',     email: 'Anaidh.Lopez@joysonsafety.com' }] },
                { title: 'Sr. Manager Nissan',                sysRole: 'Manager', people: [{ name: 'Ernest Ruiz',      email: 'Ernest.Ruiz@joysonsafety.com' }] },
          { title: 'Sr. Manager Tesla/BMW/Volvo',       sysRole: 'Manager', people: [{ name: 'Sarah Florka',     email: 'Sarah.Florka@joysonsafety.com' }] }
        ]
      },
      {
        id: 'gkam', label: 'GKAM / Director',
        icon: '🌐', desc: 'Global key account managers and directors',
        roles: [
          { title: 'Director JOEM/Hyundai',                    sysRole: 'Admin', people: [{ name: 'Chad Ritz',      email: 'Chad.Ritz@joysonsafety.com' }] },
          { title: 'Director STLA/ISS',                        sysRole: 'Admin', people: [{ name: 'Lance Bertelle', email: 'Lance.Bertelle@joysonsafety.com' }] },
          { title: 'GKAM Ex Director Ford',                    sysRole: 'Admin', people: [{ name: 'Brian Hyttinen', email: 'Brian.Hyttinen@joysonsafety.com' }] },
          { title: 'VP GKAM GM',                               sysRole: 'Admin', people: [{ name: 'Mike Wild',      email: 'Mike.Wild@joysonsafety.com' }] },
          { title: 'VP GKAM Tesla/EV/BMW/Volvo Specialty',     sysRole: 'Admin', people: [{ name: 'Li Jing',        email: 'Li.Jing@joysonsafety.com' }] }
        ]
      }
    ];

    var [step, setStep]           = React.useState(1);  // 1=team, 2=role, 3=name
    var [selTeam, setSelTeam]     = React.useState(null);
    var [selRole, setSelRole]     = React.useState(null);

    function pickTeam(t)  { setSelTeam(t); setSelRole(null); setStep(2); }
    function pickRole(r)  { setSelRole(r); setStep(3); }
    function goBack()     { if (step === 3) setStep(2); else { setStep(1); setSelTeam(null); setSelRole(null); } }
    function signInAs(person, role, team) {
      setCurrentUser({ name: person.name, email: person.email, role: role.sysRole, team: team.label, title: role.title, sub: team.label + ' · Joysonsafety' });
      setAuthed(true);
    }
    function msftLogin() {
      // "Sign in with Microsoft" — drops straight into app as Admin (demo default)
      setCurrentUser({ name: 'Paul Smith', email: 'Paul.Smith@joysonsafety.com', role: 'Admin', team: 'Service & Campaign', title: 'Director of Campaign Service', sub: 'Service & Campaign · Joysonsafety' });
      setAuthed(true);
    }

    var teamColors = { creator: 'border-yellow-500 bg-yellow-50', service: 'border-amber-400 bg-amber-50', vp: 'border-purple-400 bg-purple-50', account: 'border-blue-400 bg-blue-50', gkam: 'border-green-400 bg-green-50' };
    var teamHover  = { creator: 'hover:border-yellow-500 hover:bg-yellow-50', service: 'hover:border-amber-400 hover:bg-amber-50', vp: 'hover:border-purple-400 hover:bg-purple-50', account: 'hover:border-blue-400 hover:bg-blue-50', gkam: 'hover:border-green-400 hover:bg-green-50' };

    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center font-sans text-gray-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 text-white p-6">
            <div className="text-xl font-bold">Service Database</div>
            <div className="text-sm text-gray-300">Automotive Safety Control Center</div>
          </div>

          <div className="p-6 space-y-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              {step > 1 && <button onClick={goBack} className="text-blue-500 hover:text-blue-700 font-medium">← Back</button>}
              <span className={'font-semibold ' + (step === 1 ? 'text-blue-600' : 'text-gray-400')}>Team</span>
              <span>›</span>
              <span className={'font-semibold ' + (step === 2 ? 'text-blue-600' : 'text-gray-400')}>Role</span>
              <span>›</span>
              <span className={'font-semibold ' + (step === 3 ? 'text-blue-600' : 'text-gray-400')}>Name</span>
            </div>

            {/* STEP 1 — Team */}
            {step === 1 && <div>
              <div className="text-center mb-4">
                <div className="text-lg font-bold text-gray-900">Sign in to continue</div>
                <p className="text-sm text-gray-500 mt-1">Access is controlled by your company identity. Your role is set by your Microsoft Teams / security groups.</p>
              </div>
              <button onClick={msftLogin} className="w-full border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-gray-50 font-medium text-gray-800 mb-4">
                <span className="grid grid-cols-2 gap-0.5">
                  <span className="w-2 h-2 bg-red-500"></span><span className="w-2 h-2 bg-green-500"></span>
                  <span className="w-2 h-2 bg-blue-500"></span><span className="w-2 h-2 bg-yellow-500"></span>
                </span>
                Sign in with Microsoft
              </button>
              <div className="relative py-1 mb-3">
                <div className="border-t border-gray-200"></div>
                <span className="absolute inset-x-0 -top-2 text-center"><span className="bg-white px-2 text-xs text-gray-400">demo — select your team</span></span>
              </div>
              {/* Creator card — full width, highlighted */}
              <div style={{marginBottom:'0.75rem'}}>
              {TEAMS.filter(function(t){ return t.id === 'creator'; }).map(function(t) {
                return <button key={t.id} onClick={function(){ pickTeam(t); }}
                  className="w-full border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 rounded-xl p-4 text-left transition-all flex items-center gap-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{t.label}</div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                  </div>
                  <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 font-bold px-2 py-0.5 rounded-full">Full Access</span>
                </button>;
              })}
              </div>
              {/* Spacer between creator and grid */}
              <div style={{marginBottom:'0.25rem'}}></div>
              {/* Regular team grid */}
              <div className="grid grid-cols-2 gap-2">
                {TEAMS.filter(function(t){ return t.id !== 'creator'; }).map(function(t) {
                  var hoverBg = { service: '#fff1f2', vp: '#faf5ff', account: '#eff6ff', gkam: '#f0fdf4' };
                  var hoverBorder = { service: '#f87171', vp: '#c084fc', account: '#60a5fa', gkam: '#4ade80' };
                  return <button key={t.id} onClick={function(){ pickTeam(t); }}
                    style={{border: '2px solid #d1d5db', borderRadius: '0.75rem', padding: '1rem', textAlign: 'left', transition: 'all 0.15s', backgroundColor: '#fff'}}
                    onMouseEnter={function(e){ e.currentTarget.style.borderColor = hoverBorder[t.id]; e.currentTarget.style.backgroundColor = hoverBg[t.id]; }}
                    onMouseLeave={function(e){ e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.backgroundColor = '#fff'; }}>
                    <div style={{fontSize:'1.5rem', marginBottom:'0.25rem'}}>{t.icon}</div>
                    <div style={{fontSize:'0.875rem', fontWeight:'700', color:'#111827'}}>{t.label}</div>
                    <div style={{fontSize:'0.75rem', color:'#6b7280', marginTop:'0.125rem'}}>{t.desc}</div>
                  </button>;
                })}
              </div>
            </div>}

            {/* STEP 2 — Role */}
            {step === 2 && selTeam && <div>
              <div className="text-center mb-4">
                <div className="text-xs text-gray-500">{selTeam.icon} {selTeam.label}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">Select your role</div>
              </div>
              <div className="space-y-2 max-h-72 overflow-auto">
                {selTeam.roles.map(function(r) {
                  var badge = { Admin: 'bg-green-100 text-green-700', Manager: 'bg-blue-100 text-blue-700', Service: 'bg-amber-100 text-amber-700', 'Read-Only': 'bg-gray-100 text-gray-600' };
                  return <button key={r.title} onClick={function(){ pickRole(r); }}
                    className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{r.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.people.length} {r.people.length === 1 ? 'person' : 'people'}</div>
                    </div>
                    <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + (selTeam && selTeam.id === 'creator' ? 'bg-yellow-100 text-yellow-800 border border-yellow-400' : (badge[r.sysRole] || badge['Read-Only']))}>{r.sysRole}</span>
                  </button>;
                })}
              </div>
            </div>}

            {/* STEP 3 — Name */}
            {step === 3 && selRole && <div>
              <div className="text-center mb-4">
                <div className="text-xs text-gray-500">{selTeam && selTeam.icon} {selTeam && selTeam.label} · {selRole.title}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">Select your name</div>
              </div>
              <div className="space-y-2">
                {selRole.people.map(function(p) {
                  var initials = p.name.split(' ').map(function(s){ return s[0]; }).join('').slice(0,2);
                  return <button key={p.email} onClick={function(){ signInAs(p, selRole, selTeam); }}
                    className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{initials}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.email}</div>
                    </div>
                    <span className="text-blue-600 text-sm">→</span>
                  </button>;
                })}
              </div>
            </div>}

            {/* Prototype note */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">
              <span className="font-semibold">Prototype note:</span> real sign-in uses Microsoft Entra ID (Azure AD) SSO set up by IT. Here you can pick a role to see how access changes — only <span className="font-semibold">Admin</span> can edit controlled lists.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authed) return <SignIn />;

  var roleStyles = { 'Admin': 'bg-green-100 text-green-800 border-green-300', 'Manager': 'bg-blue-100 text-blue-800 border-blue-300', 'Service': 'bg-amber-100 text-amber-800 border-amber-300', 'Read-Only': 'bg-gray-100 text-gray-600 border-gray-300' };
  var userInitials = currentUser.name.split(' ').map(function(s){ return s[0]; }).join('').slice(0, 2);





  // ── Supabase write helper ─────────────────────────────────────────────────
  function _supaWrite(table, row) {
    _supa.from(table).upsert(row).then(function(r){ if(r && r.error) console.warn('Supabase write error:', table, r.error); }, function(e){ console.warn('Supabase write error:', table, e); });
  }

  // ── Reference data row helper ─────────────────────────────────────────────
  function getRefRows(listName) {
    if (refOverrides[listName] && refOverrides[listName].rows) return refOverrides[listName].rows;
    return refData[listName] ? refData[listName].rows : [];
  }

  // ── Context value — all shared state/fns for child components ──────────────
  var ctxValue = {
    // Navigation
    page, setPage,
    // Derived data
    parts,
    // Auth
    authed, setAuthed, currentUser, setCurrentUser, canEdit,
    // Core data
    rawParts, setRawParts, rawAudit, setRawAudit, _supaWrite,
    partDecisions, setPartDecisions, archiveDecisions, setArchiveDecisions,
    manualArchiveIds, setManualArchiveIds, priceDecisions, setPriceDecisions,
    // Computed parts helpers
    resolvePart, isArchived, servicePhase, dqFlag, autoMap,
    normOem, normPlant, normCategory, getRefRows, SAFE_DEFAULTS, CURRENT_YEAR,
    familySiblings, rateBandFor, evalRateBand,
    // Filters
    filter, setFilter, oemFilter, setOemFilter, plantFilter, setPlantFilter,
    categoryFilter, setCategoryFilter, sortKey, setSortKey, sortDir, setSortDir,
    selOEMs, setSelOEMs, selPriorities, setSelPriorities, selPlants, setSelPlants,
    selCategories, setSelCategories, selSubcategories, setSelSubcategories,
    phaseFilter, setPhaseFilter, oemPhaseFilter, setOemPhaseFilter,
    eopFilter, setEopFilter, archiveMode, setArchiveMode,
    dqSelOEMs, setDqSelOEMs, dqSelIdentifiers, setDqSelIdentifiers,
    dqSelPlants, setDqSelPlants, dqSelCategories, setDqSelCategories,
    dqFlagFilter, setDqFlagFilter,
    // Selected part / detail panel
    selectedPart, setSelectedPart, onOpenDetail: setSelectedPart,
    sourceHistoryFor, setSourceHistoryFor,
    // Import Wizard
    importStep, setImportStep, importFile, setImportFile, importMaps, setImportMaps,
    importSheets, setImportSheets, importSelectedSheets, setImportSelectedSheets,
    importRowFilters, setImportRowFilters, importAiReview, setImportAiReview,
    importResult, setImportResult, importBulkStatus, setImportBulkStatus,
    importGlobalOEM, setImportGlobalOEM, importGlobalPlant, setImportGlobalPlant,
    importAckNoCust, setImportAckNoCust, importSavedProfiles, setImportSavedProfiles,
    importWorkbookBuf, handleUploadClick, handleFileChosen,
    // Action Queues / Tasks
    queueTasks, setQueueTasks, customTasks, setCustomTasks,
    taskActions, setTaskActions, taskAudit, setTaskAudit,
    queueOem, setQueueOem, queueStatus, setQueueStatus,
    dismissFor, setDismissFor, reassignFor, setReassignFor,
    selectedTask, setSelectedTask,
    // Audit
    auditAction, setAuditAction, auditModule, setAuditModule,
    auditUser, setAuditUser, auditSearch, setAuditSearch, selectedAudit, setSelectedAudit,
    archiveAudit, setArchiveAudit,
    // Pricing
    priceFilter, setPriceFilter, selectedPrice, setSelectedPrice,
    priceProposal, setPriceProposal, priceHistoryFor, setPriceHistoryFor,
    // Reports / Export
    selectedReport, setSelectedReport, exportFormat, setExportFormat,
    excelStructure, setExcelStructure, reportOem, setReportOem,
    exportTerminalParts, setExportTerminalParts, handleExport,
    // Master Terminal
    mtSelectMode, setMtSelectMode, mtSelectedIds, setMtSelectedIds,
    bulkOpen, setBulkOpen, bulkAction, setBulkAction,
    // Reference Data
    refList, setRefList, refSearch, setRefSearch,
    refOverrides, setRefOverrides, refModal, setRefModal,
    // Notifications
    notifications, setNotifications, notifOpen, setNotifOpen,
    // Calendar / Events
    teamEvents, setTeamEvents, calYear, setCalYear, calMonth, setCalMonth,
    selectedEventDate, setSelectedEventDate, eventModal, setEventModal,
    MONTH_NAMES,
    // Admin
    adminRoles, setAdminRoles, adminModal, setAdminModal,
    // Misc
    yearOverride, setYearOverride, yearSettingsOpen, setYearSettingsOpen,
    eopToast, setEopToast, actionModal, setActionModal,
    scrollRef, fileInputRef,
    marManager, setMarManager,
    // Reference-derived lists
    oemKeys,
  };

  return <AppContext.Provider value={ctxValue}><div className="h-screen bg-gray-100 flex font-sans text-gray-900"><aside className="w-72 bg-gray-900 text-white overflow-auto"><div className="p-5 border-b border-gray-700"><div className="text-lg font-bold">Service Database</div><div className="text-xs text-gray-400">Automotive Safety Control Center</div></div><nav className="p-3">{navGroups.map(function(g){ return <div key={g.label} className="mb-4"><div className="text-xs uppercase tracking-wide text-gray-500 px-3 mb-2">{g.label}</div>{g.items.map(function(item){ return <button key={item} onClick={function(){setPage(item);}} className={(page === item ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800') + ' w-full text-left rounded-lg px-3 py-2 text-sm mb-1'}>{item}</button>; })}</div>; })}</nav></aside><main className="flex-1 flex overflow-hidden"><div ref={scrollRef} id="main-scroll-container" className="flex-1 overflow-auto"><div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3"><GlobalSearch parts={parts} rawTasks={rawTasks} customTasks={customTasks} riskRows={riskRows} partDecisions={partDecisions} setPage={setPage} setSelectedPart={setSelectedPart} /><input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChosen} className="hidden" /><button onClick={handleUploadClick} className="bg-gray-100 rounded-lg px-3 py-2 text-sm hover:bg-gray-200">Upload File</button><button onClick={handleExport} title="Quick export of the full Master Terminal. For filtered/section exports, use the Master Terminal tab." className="bg-gray-100 rounded-lg px-3 py-2 text-sm hover:bg-gray-200">Quick Export</button><button onClick={function(){ setYearSettingsOpen(true); }} title={yearIsPinned ? 'Reference year is PINNED to ' + CURRENT_YEAR + ' for back-dated analysis. Click to change.' : 'Reference year auto-rolls with the live clock (' + CURRENT_YEAR + '). Click to pin a year for audits.'} className={'rounded-lg px-3 py-2 text-sm font-medium border flex items-center gap-1 ' + (yearIsPinned ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')}>📅 {CURRENT_YEAR}{yearIsPinned && <span className="text-xs">· pinned</span>}</button><button onClick={function(){ setNotifOpen(!notifOpen); }} className="relative bg-blue-600 text-white rounded-lg px-3 py-2 text-sm">Notifications{unreadCount > 0 && <span className="ml-2 bg-white text-blue-700 rounded-full px-2 py-0.5 text-xs font-bold">{unreadCount}</span>}</button><div className="flex items-center gap-2 border-l border-gray-200 pl-3"><div className="w-8 h-8 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center">{userInitials}</div><div className="hidden md:block leading-tight"><div className="text-xs font-semibold text-gray-900">{currentUser.name}</div><div className="text-xs text-gray-500">{currentUser.email}</div>{currentUser.title && <div className="text-xs text-gray-400 italic">{currentUser.title}</div>}</div><div className="flex items-center gap-1"><span className="text-xs text-gray-400 hidden lg:inline">Role:</span><span className={'rounded-full border text-xs font-medium px-2 py-1 ' + (currentUser.email === 'Michael.Colon@joysonsafety.com' ? 'bg-yellow-100 text-yellow-800 border-yellow-400' : (roleStyles[currentUser.role] || roleStyles['Read-Only']))}>{currentUser.role}</span></div><button onClick={function(){ setAuthed(false); }} title="Sign out" className="text-xs text-gray-400 hover:text-gray-700 ml-1">Sign out</button></div></div><NotificationsPanel /><div className="p-6">{Content()}</div>{eventModal && <EventModal />}{actionModal && <ActionModal />}{yearSettingsOpen && <YearSettingsModal />}{/* SourceHistoryModal removed — not exported/imported; latent ReferenceError. Restore once wired to context. */}</div>{page !== 'archive' && <DetailPanel />}</main></div></AppContext.Provider>;
}


export default App;
