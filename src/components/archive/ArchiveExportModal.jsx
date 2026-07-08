// components/archive/ArchiveExportModal.jsx
// Modal for exporting archive records to Excel.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { Badge, ArchiveBadge } from '../shared/Badge.jsx';


function ArchiveExportModal({ rows, selectedIds, exportView, setExportView, archiveExportOpen, setArchiveExportOpen }) {
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
    marManager, setMarManager, canEdit, currentUser, authed
  } = ctx;
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

export { ArchiveExportModal };