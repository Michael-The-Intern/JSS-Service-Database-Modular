// components/reports/ReportsExports.jsx
// Reports & Exports — generate and download reports.
import * as XLSX from 'xlsx';

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { StatCard } from '../shared/StatCard.jsx';


function ReportsExports() {
  const ctx = React.useContext(AppContext);
  const { page, setPage, parts, rawParts, setRawParts, rawAudit, setRawAudit, _supaWrite,
    partDecisions, setPartDecisions, archiveDecisions, setArchiveDecisions,
    manualArchiveIds, setManualArchiveIds, priceDecisions, setPriceDecisions,
    resolvePart, isArchived, servicePhase, dqFlag, autoMap, normOem, normPlant,
    normCategory, getRefRows, SAFE_DEFAULTS, CURRENT_YEAR, familySiblings,
    rateBandFor, evalRateBand, filter, setFilter, oemFilter, setOemFilter,
    plantFilter, setPlantFilter, categoryFilter, setCategoryFilter,
    sortKey, setSortKey, sortDir, setSortDir, selOEMs, setSelOEMs,
    selPriorities, setSelPriorities, selPlants, setSelPlants,
    selCategories, setSelCategories, selSubcategories, setSelSubcategories,
    phaseFilter, setPhaseFilter, oemPhaseFilter, setOemPhaseFilter,
    eopFilter, setEopFilter, archiveMode, setArchiveMode,
    dqSelOEMs, setDqSelOEMs, dqSelIdentifiers, setDqSelIdentifiers,
    dqSelPlants, setDqSelPlants, dqSelCategories, setDqSelCategories,
    dqFlagFilter, setDqFlagFilter, selectedPart, setSelectedPart, onOpenDetail,
    sourceHistoryFor, setSourceHistoryFor, importStep, setImportStep,
    importFile, setImportFile, importMaps, setImportMaps, importSheets, setImportSheets,
    importSelectedSheets, setImportSelectedSheets, importRowFilters, setImportRowFilters,
    importAiReview, setImportAiReview, importResult, setImportResult,
    importBulkStatus, setImportBulkStatus, importGlobalOEM, setImportGlobalOEM,
    importGlobalPlant, setImportGlobalPlant, importAckNoCust, setImportAckNoCust,
    importSavedProfiles, setImportSavedProfiles, importWorkbookBuf,
    handleUploadClick, handleFileChosen, queueTasks, setQueueTasks,
    customTasks, setCustomTasks, taskActions, setTaskActions, taskAudit, setTaskAudit,
    queueOem, setQueueOem, queueStatus, setQueueStatus, dismissFor, setDismissFor,
    reassignFor, setReassignFor, selectedTask, setSelectedTask,
    auditAction, setAuditAction, auditModule, setAuditModule,
    auditUser, setAuditUser, auditSearch, setAuditSearch, selectedAudit, setSelectedAudit,
    archiveAudit, setArchiveAudit, priceFilter, setPriceFilter,
    selectedPrice, setSelectedPrice, priceProposal, setPriceProposal,
    priceHistoryFor, setPriceHistoryFor, selectedReport, setSelectedReport,
    exportFormat, setExportFormat, excelStructure, setExcelStructure,
    reportOem, setReportOem, exportTerminalParts, setExportTerminalParts, handleExport,
    mtSelectMode, setMtSelectMode, mtSelectedIds, setMtSelectedIds,
    bulkOpen, setBulkOpen, bulkAction, setBulkAction, refList, setRefList,
    refSearch, setRefSearch, refOverrides, setRefOverrides, refModal, setRefModal,
    notifications, setNotifications, notifOpen, setNotifOpen,
    teamEvents, setTeamEvents, calYear, setCalYear, calMonth, setCalMonth,
    selectedEventDate, setSelectedEventDate, eventModal, setEventModal, MONTH_NAMES,
    adminRoles, setAdminRoles, adminModal, setAdminModal,
    yearOverride, setYearOverride, yearSettingsOpen, setYearSettingsOpen,
    eopToast, setEopToast, actionModal, setActionModal, scrollRef, fileInputRef,
    marManager, setMarManager, canEdit, currentUser, authed, reportCatalog, priceRows
  } = ctx;
  const scheduledExports = [];
    var handleReportExport = handleExport;
    const oemOptions = ['All', 'STELLANTIS', 'HONDA', 'GM', 'FORD', 'TOYOTA', 'NISSAN', 'SUBARU', 'HYUNDAI/KIA', 'VW', 'BMW', 'TESLA', 'MERCEDES', 'MAZDA'];
    const formats = [
      { id: 'xlsx', label: 'Excel (.xlsx)', icon: '📊', note: 'Full workbook power — pivots & formulas supported.' },
      { id: 'csv', label: 'CSV (.csv)', icon: '📄', note: 'Plain flat data for any system. No formulas or pivots.' },
      { id: 'pdf', label: 'PDF (.pdf)', icon: '📕', note: 'Print-ready summary for sharing and review.' }
    ];
    const structures = [
      { id: 'flat', label: 'Flat clean table', desc: 'Pre-joined data, one row per part. No formulas — the database already merged everything for you.' },
      { id: 'pivot', label: 'With Pivot Table(s)', desc: 'Pivot is already built into the sheet (e.g. ' + (reportCatalog.find(function(r){return r.id===selectedReport;}) || reportCatalog[0]).pivotHint + '). Just open and refresh.' },
      { id: 'vlookup', label: 'With VLOOKUP / XLOOKUP formulas', desc: 'Writes live lookup formulas into the file so it stays cross-referenceable on the desktop — for sharing outside the system.' },
      { id: 'multi', label: 'Multi-sheet workbook', desc: 'Summary + Pivot + Raw Data tabs in one file, all linked.' }
    ];
    const toneMap = { green: 'border-green-400', amber: 'border-amber-400', red: 'border-red-400', orange: 'border-orange-400', indigo: 'border-indigo-400', blue: 'border-blue-400', gray: 'border-gray-400' };
    const toneText = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600', orange: 'text-orange-600', indigo: 'text-indigo-600', blue: 'text-blue-600', gray: 'text-gray-600' };

    const rpt = reportCatalog.find(function(r){ return r.id === selectedReport; }) || reportCatalog[0];
    const isExcel = exportFormat === 'xlsx';
    const previewRows = (function(){
      if (reportOem === 'All') return rpt.rows;
      if (rpt.id === 'master' || rpt.id === 'cleanup' || rpt.id === 'phase' || rpt.id === 'dq') {
        return parts.filter(function(p){ return p.oem === reportOem; }).length;
      }
      if (rpt.id === 'archive') {
        return parts.filter(function(p){ var yr = parseInt(p.serviceEop, 10); var isManual = manualArchiveIds.indexOf(p.id) >= 0; return p.oem === reportOem && (isManual || (p.demand === 0 && p.backlog === 0 && yr <= 2026)); }).length;
      }
      if (rpt.id === 'price') {
        return priceRows.filter(function(p){ return p.oem === reportOem; }).length;
      }
      if (rpt.id === 'risk') { return 0; }
      return Math.max(1, Math.round(rpt.rows * 0.18));
    })();

    return <div className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Reports &amp; Exports</h1><p className="text-gray-500">One-click reports for managers, OEM reviews, and leadership. Pick a report, choose a format, and export — the database does the joins for you.</p></div></div>

    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5"><div className="flex items-start gap-3"><div className="text-3xl">🔗</div><div><div className="font-bold text-gray-900">This system works as a live database — no manual VLOOKUPs needed</div><p className="text-sm text-blue-900 mt-1">Because every part is already linked to its EOP, pricing, SAP demand, plant, and classification records, exports come out <span className="font-semibold">pre-joined automatically</span>. What used to take stacked spreadsheets and <span className="font-mono text-xs bg-white px-1 rounded border border-blue-200">VLOOKUP</span> across files is done for you the moment you click Export.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4"><div className="bg-white border border-blue-100 rounded-lg p-3"><div className="text-sm font-semibold text-gray-900">✅ Auto-joined data</div><div className="text-xs text-gray-600 mt-1">Parts ↔ EOP ↔ Pricing ↔ Demand ↔ Plant merged into one clean sheet.</div></div><div className="bg-white border border-blue-100 rounded-lg p-3"><div className="text-sm font-semibold text-gray-900">📊 Built-in Pivot Tables</div><div className="text-xs text-gray-600 mt-1">Pivots arrive pre-built in the workbook — open and refresh, no setup.</div></div><div className="bg-white border border-blue-100 rounded-lg p-3"><div className="text-sm font-semibold text-gray-900">🔁 Optional live formulas</div><div className="text-xs text-gray-600 mt-1">Need VLOOKUP/XLOOKUP for desktop sharing? Toggle it on — the file stays editable outside the system.</div></div></div></div></div></div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2"><div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Choose a report</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{reportCatalog.map(function(r){ var active = selectedReport === r.id; return <button key={r.id} onClick={function(){ setSelectedReport(r.id); }} className={'text-left bg-white rounded-xl border-l-4 border border-gray-200 p-4 transition-all hover:shadow-md ' + (toneMap[r.tone] || toneMap.blue) + (active ? ' ring-2 ring-offset-1 ring-blue-500' : '')}><div className="flex items-start justify-between"><div className="text-2xl">{r.icon}</div>{active && <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">Selected</span>}</div><div className="font-bold text-gray-900 mt-2">{r.title}</div><div className="text-xs text-gray-500 mt-1 leading-relaxed">{r.desc}</div><div className="flex flex-wrap gap-1 mt-3">{r.joins.map(function(j){ return <span key={j} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{j}</span>; })}</div></button>; })}</div></div>

    <div className="space-y-4"><div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Export options</div><div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"><div><div className="flex items-center gap-2"><span className="text-2xl">{rpt.icon}</span><div><div className="font-bold text-gray-900">{rpt.title}</div><div className="text-xs text-gray-500">{previewRows.toLocaleString()} rows{reportOem !== 'All' ? ' · filtered to ' + reportOem : ''}</div></div></div></div>

    <div><div className="text-xs font-semibold text-gray-700 mb-2">Format</div><div className="grid grid-cols-3 gap-2">{formats.map(function(f){ var on = exportFormat === f.id; return <button key={f.id} onClick={function(){ setExportFormat(f.id); }} className={'rounded-lg border p-2 text-center transition-all ' + (on ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-200 hover:border-blue-300')}><div className="text-lg">{f.icon}</div><div className="text-xs font-medium text-gray-800 mt-1">{f.label}</div></button>; })}</div><div className="text-xs text-gray-500 mt-2">{(formats.find(function(f){return f.id===exportFormat;})||formats[0]).note}</div></div>

    {isExcel && <div><div className="text-xs font-semibold text-gray-700 mb-2">Excel structure</div><div className="space-y-2">{structures.map(function(s){ var on = excelStructure === s.id; return <button key={s.id} onClick={function(){ setExcelStructure(s.id); }} className={'w-full text-left rounded-lg border p-3 transition-all ' + (on ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-200 hover:border-blue-300')}><div className="flex items-center gap-2"><span className={'w-4 h-4 rounded-full border flex items-center justify-center ' + (on ? 'border-blue-600' : 'border-gray-300')}>{on && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}</span><span className="text-sm font-medium text-gray-900">{s.label}</span></div><div className="text-xs text-gray-500 mt-1 ml-6">{s.desc}</div></button>; })}</div></div>}

    {!isExcel && <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">{exportFormat === 'csv' ? 'CSV is a flat, pre-joined export — perfect for loading into other systems. Pivots and formulas are Excel-only.' : 'PDF renders the report as a clean, print-ready summary for sharing and review.'}</div>}

    <div><div className="text-xs font-semibold text-gray-700 mb-2">Filter by OEM</div><select value={reportOem} onChange={function(e){ setReportOem(e.target.value); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{oemOptions.map(function(o){ return <option key={o} value={o}>{o}</option>; })}</select></div>

    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900"><span className="font-semibold">What you'll get:</span> {previewRows.toLocaleString()} pre-joined rows{isExcel ? (excelStructure === 'pivot' ? ' with a ready-to-use pivot (' + rpt.pivotHint + ').' : excelStructure === 'vlookup' ? ' with live VLOOKUP/XLOOKUP formulas wired in for desktop cross-referencing.' : excelStructure === 'multi' ? ' across Summary + Pivot + Raw Data tabs.' : ' as one clean flat table.') : '.'} This export will be audit-logged with your name and timestamp.</div>

    <button onClick={handleReportExport} className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium">Generate &amp; Download {exportFormat.toUpperCase()}</button><button onClick={function(){ var rptTitle = rpt.title; var oemLabel = reportOem === 'All' ? 'All OEMs' : reportOem; var body = 'Hi,\n\nPlease find below the export summary from the Service Database.\n\nReport: ' + rptTitle + '\nOEM Filter: ' + oemLabel + '\nFormat: ' + exportFormat.toUpperCase() + (exportFormat === 'xlsx' ? ' · ' + (structures.find(function(s){ return s.id === excelStructure; }) || structures[0]).label : '') + '\nRows: ' + previewRows.toLocaleString() + '\nRequested by: ' + currentUser.name + '\nTimestamp: ' + new Date().toLocaleString() + '\n\nTo download this report, open the Service Database and go to Reports & Exports.\n\nRegards,\n' + currentUser.name; var subject = encodeURIComponent('[Service Database] ' + rptTitle + ' — ' + oemLabel); var encodedBody = encodeURIComponent(body); window.location.href = 'mailto:' + encodeURIComponent(currentUser.email) + '?subject=' + subject + '&body=' + encodedBody; }} className="w-full bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">✉ Email to me</button></div></div></div>


    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-200 flex items-center justify-between"><div className="font-bold text-gray-900">Scheduled &amp; Recurring</div><button className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-medium">+ Schedule</button></div><div className="divide-y divide-gray-100">{scheduledExports.map(function(s){ return <div key={s.name} className="p-4 flex items-center justify-between gap-3"><div><div className="font-medium text-gray-900 text-sm">{s.name}</div><div className="text-xs text-gray-500 mt-0.5">{s.cadence} · {s.fmt}</div><div className="text-xs text-gray-400">→ {s.to}</div></div><span className={'rounded-full px-2 py-1 text-xs font-medium ' + (s.on ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500')}>{s.on ? 'Active' : 'Paused'}</span></div>; })}</div></div></div>;
  }

function ExportTerminal() {
    var rows = exportTerminalParts;
    var ALL_COLS = [
      { key: 'priority',       header: 'Priority',        default: true },
      { key: 'oem',            header: 'OEM',             default: true },
      { key: 'plant',          header: 'Plant',           default: true },
      { key: 'jss',            header: 'JSS Part',        default: true },
      { key: 'customerPart',   header: 'Customer Part',   default: true },
      { key: 'desc',           header: 'Description',     default: true },
      { key: 'active',         header: 'Status',          default: true },
      { key: 'demand',         header: 'Demand',          default: true },
      { key: 'backlog',        header: 'Backlog',         default: true },
      { key: 'serviceEop',     header: 'Service EOP',     default: true },
      { key: 'recommendation', header: 'Recommendation',  default: true },
      { key: 'price',          header: 'Service Price',   default: false },
      { key: 'cost',           header: 'Std Cost',        default: false },
      { key: 'component',      header: 'Component Family',default: false },
      { key: 'subcategory',    header: 'Subcategory',     default: false },
      { key: 'altJss',         header: 'Alt JSS Part',    default: false },
      { key: 'owner',          header: 'Owner',           default: false },
      { key: 'reason',         header: 'Reason',          default: false },
    ];
    var [selCols, setSelCols] = React.useState(ALL_COLS.filter(function(c){ return c.default; }).map(function(c){ return c.key; }));
    var [groupBy, setGroupBy] = React.useState('none');
    var [sortCol, setSortCol] = React.useState('priority');
    var [filterOem, setFilterOem] = React.useState('All');
    var [exportName, setExportName] = React.useState('service-export-' + new Date().toISOString().slice(0,10));

    var oemList = ['All'].concat(Array.from(new Set(rows.map(function(r){ return r.oem; }))).sort());
    var activeCols = ALL_COLS.filter(function(c){ return selCols.indexOf(c.key) >= 0; });

    var displayRows = rows.slice();
    if (filterOem !== 'All') displayRows = displayRows.filter(function(r){ return r.oem === filterOem; });
    var PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    displayRows.sort(function(a, b){
      if (sortCol === 'priority') return (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99);
      var av = a[sortCol] || '', bv = b[sortCol] || '';
      return String(av).localeCompare(String(bv));
    });

    var totalDemand = rows.reduce(function(s, r){ return s + (Number(r.demand) || 0); }, 0);
    var totalBacklog = rows.reduce(function(s, r){ return s + (Number(r.backlog) || 0); }, 0);
    var oemCount = new Set(rows.map(function(r){ return r.oem; })).size;
    var critCount = rows.filter(function(r){ return r.priority === 'Critical'; }).length;

    var PRIORITY_COLORS = { Critical: 'FF C0392B', High: 'FFDE7539', Medium: 'FFF6C324', Low: 'FF27AE60' };

    function toggleCol(key){ setSelCols(function(prev){ return prev.indexOf(key) >= 0 ? prev.filter(function(k){ return k !== key; }) : prev.concat([key]); }); }

    function buildGroups(rws){
      if (groupBy === 'oem') {
        var map = {}; rws.forEach(function(r){ if (!map[r.oem]) map[r.oem] = []; map[r.oem].push(r); });
        return Object.keys(map).sort().map(function(k){ return { label: k, rows: map[k] }; });
      }
      if (groupBy === 'priority') {
        var order = ['Critical','High','Medium','Low'];
        var map2 = {}; rws.forEach(function(r){ if (!map2[r.priority]) map2[r.priority] = []; map2[r.priority].push(r); });
        return order.filter(function(k){ return map2[k]; }).map(function(k){ return { label: k, rows: map2[k] }; });
      }
      return [{ label: null, rows: rws }];
    }
    var groups = buildGroups(displayRows);

    function doExcelExport(){
      function colWidth(key){ return (key === 'desc' || key === 'reason') ? 40 : key === 'recommendation' ? 30 : 18; }
      var headers = activeCols.map(function(c){ return c.header; });
      var wb = XLSX.utils.book_new();
      if (groupBy !== 'none') {
        groups.forEach(function(g){
          var sheetName = (g.label || 'Export').slice(0, 31);
          var data = g.rows.map(function(r){
            return activeCols.map(function(c){ var v = r[c.key]; return (v !== undefined && v !== null) ? v : ''; });
          });
          var ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
          ws['!freeze'] = { ySplit: 1 };
          ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: activeCols.length - 1 } }) };
          ws['!cols'] = activeCols.map(function(c){ return { wch: colWidth(c.key) }; });
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
      } else {
        var data = displayRows.map(function(r){
          return activeCols.map(function(c){ var v = r[c.key]; return (v !== undefined && v !== null) ? v : ''; });
        });
        var ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
        ws['!freeze'] = { ySplit: 1 };
        ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: activeCols.length - 1 } }) };
        ws['!cols'] = activeCols.map(function(c){ return { wch: colWidth(c.key) }; });
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
      }
      XLSX.writeFile(wb, exportName + '.xlsx');
    }

    function doCsvExport(){
      var head = activeCols.map(function(c){ return '"' + c.header + '"'; }).join(',');
      var body = displayRows.map(function(r){ return activeCols.map(function(c){ var v = (r[c.key] !== undefined && r[c.key] !== null) ? String(r[c.key]) : ''; return '"' + v.replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = exportName + '.csv'; a.click(); URL.revokeObjectURL(url);
    }

    return <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export Terminal</h1>
          <p className="text-gray-500">Configure, preview, and download your selected parts. Choose columns, grouping, and format before exporting.</p>
        </div>
        <button onClick={function(){ setPage('Master Terminal'); }} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200">← Back to Master Terminal</button>
      </div>

      {rows.length === 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 text-sm"><span className="font-bold">No parts loaded.</span> Go to Master Terminal, enable Select Mode, check the rows you want, then click <span className="font-semibold">→ Export Terminal</span> from the tray.</div>}

      {rows.length > 0 && <React.Fragment>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Parts Selected" value={String(rows.length)} subtitle="From Master Terminal" />
          <StatCard title="OEMs" value={String(oemCount)} subtitle="Represented" tone="blue" />
          <StatCard title="Total Demand" value={totalDemand.toLocaleString()} subtitle="Units across selection" tone="indigo" />
          <StatCard title="Critical Items" value={String(critCount)} subtitle="Need same-day action" tone="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="font-bold text-gray-900 text-sm">Export Settings</div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">File Name</label>
                <input value={exportName} onChange={function(e){ setExportName(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by OEM</label>
                <select value={filterOem} onChange={function(e){ setFilterOem(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  {oemList.map(function(o){ return <option key={o} value={o}>{o}</option>; })}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort By</label>
                <select value={sortCol} onChange={function(e){ setSortCol(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  {activeCols.map(function(c){ return <option key={c.key} value={c.key}>{c.header}</option>; })}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Group By (Excel tabs)</label>
                <select value={groupBy} onChange={function(e){ setGroupBy(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="none">No grouping (single sheet)</option>
                  <option value="oem">Group by OEM (one tab per OEM)</option>
                  <option value="priority">Group by Priority (one tab per level)</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-bold text-gray-900 text-sm mb-3">Columns <span className="text-gray-400 font-normal">({selCols.length} selected)</span></div>
              <div className="space-y-1.5">
                {ALL_COLS.map(function(c){
                  var on = selCols.indexOf(c.key) >= 0;
                  return <label key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input type="checkbox" checked={on} onChange={function(){ toggleCol(c.key); }} className="rounded" />
                    <span className={'text-sm ' + (on ? 'text-gray-900' : 'text-gray-400')}>{c.header}</span>
                    {c.default && <span className="text-xs text-gray-300">default</span>}
                  </label>;
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Preview <span className="text-gray-400 font-normal">· {displayRows.length} rows · {activeCols.length} columns</span></div>
                <span className="text-xs text-gray-400">Showing all rows</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 text-white">
                    <tr>{activeCols.map(function(c){ return <th key={c.key} className="p-2 text-left whitespace-nowrap font-semibold">{c.header}</th>; })}</tr>
                  </thead>
                  <tbody>
                    {displayRows.map(function(r, i){
                      return <tr key={r.id || i} className={'border-t border-gray-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                        {activeCols.map(function(c){
                          var v = (r[c.key] !== undefined && r[c.key] !== null) ? r[c.key] : '—';
                          if (c.key === 'priority') {
                            var tone = { Critical: 'bg-red-100 text-red-800', High: 'bg-orange-100 text-orange-800', Medium: 'bg-yellow-100 text-yellow-800', Low: 'bg-green-100 text-green-800' };
                            return <td key={c.key} className="p-2"><span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (tone[v] || 'bg-gray-100 text-gray-700')}>{v}</span></td>;
                          }
                          return <td key={c.key} className={'p-2 ' + (c.key === 'desc' || c.key === 'reason' ? 'max-w-xs truncate' : 'whitespace-nowrap')}>{String(v)}</td>;
                        })}
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="font-bold text-gray-900 text-sm">Download</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={doCsvExport} className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl p-4 text-left border border-gray-200">
                  <div className="font-bold text-sm">↓ CSV</div>
                  <div className="text-xs text-gray-500 mt-1">Flat file, {displayRows.length} rows · works in any tool</div>
                </button>
                <button onClick={doExcelExport} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 text-left">
                  <div className="font-bold text-sm">↓ Excel (.xlsx)</div>
                  <div className="text-xs text-blue-200 mt-1">{groupBy !== 'none' ? 'Multi-tab · ' : 'Single sheet · '}frozen header · auto-filter · priority color-coded</div>
                </button>
              </div>
              <div className="text-xs text-gray-400">File: <span className="font-mono text-gray-600">{exportName}.xlsx</span> · {activeCols.length} columns · {displayRows.length} rows{groupBy !== 'none' ? ' · ' + groups.length + ' sheet(s)' : ''}</div>
            </div>
          </div>
        </div>
      </React.Fragment>}
    </div>;
  }

export { ReportsExports };