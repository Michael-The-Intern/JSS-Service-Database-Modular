// components/dq/DataQualityCenter.jsx
// Data Quality Center — flags and resolves data quality issues.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { DQBadge } from '../shared/Badge.jsx';
import { SearchBox } from '../shared/SearchBox.jsx';


function DataQualityCenter() {
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
    marManager, setMarManager, canEdit, currentUser, authed, CANONICAL_OEMS, dqCounts, plantCodesFor, plantOptions, refData
  } = ctx;
    const dqOemOpts = ((refData['OEM / Customer List'] && refData['OEM / Customer List'].rows.length > 0) ? refData['OEM / Customer List'].rows.map(function(r){ return r[0]; }) : CANONICAL_OEMS).map(function(k){ return { key: k, label: k }; });
    const dqPlantOpts = plantOptions.map(function(p){ return { key: p.code, label: p.acronym + ' — ' + p.displayName + ' · ' + p.commodity }; });
    const dqCatOpts = (refData['Product Category Aliases'] && refData['Product Category Aliases'].rows.length > 0) ? Array.from(new Set(refData['Product Category Aliases'].rows.map(function(r){ return r[2]; }))).filter(Boolean).map(function(o){ return { key: o, label: o }; }) : Array.from(new Set(parts.map(function(p){ return p.component; }))).filter(Boolean).sort().map(function(o){ return { key: o, label: o }; });
    const dqIdentifierOpts = [{ key: 'Duplicates', label: 'Duplicates' }, { key: 'Conflicts', label: 'Conflicts' }, { key: 'Placeholders', label: 'Placeholders' }];
  function dqResolve(p) {
  setRawParts(function(prev){ return prev.map(function(pt){
    return pt.id === p.id ? Object.assign({}, pt, { dqResolved: true }) : pt;
  }); });
  setTaskAudit(function(prev){ return prev.concat([{
    id: 'TA-DQ-' + p.id + '-' + Date.now(),
    ts: new Date().toISOString(),
    user: currentUser.name,
    role: currentUser.role,
    action: 'STATUS CHANGE',
    module: 'Data Quality Center',
    target: p.jss + ' · ' + p.customerPart,
    before: p.dq.label,
    after: 'Clean',
    reversible: false,
    note: 'DQ flag manually resolved. Previous issue: ' + p.dq.detail,
    live: true
  }]); });
}
function dqEscalate(p) {
  var task = {
    id: 'T-' + new Date().getFullYear() + '-' + (customTasks.length + 1001),
    title: 'DQ Escalation — ' + p.dq.label + ' · ' + p.jss,
    oem: p.oem,
    relatedPart: p.jss,
    priority: 'High',
    assignTo: 'Manager',
    role: 'Manager',
    assignee: 'Unassigned',
    dueDate: '',
    notes: 'Escalated from Data Quality Center. Issue: ' + p.dq.detail,
    status: 'Open',
    source: 'Data Quality',
    createdAt: new Date().toISOString(),
    createdBy: 'Current User',
    suggestion: 'Review and resolve the ' + p.dq.label + ' flag on this part.',
    reason: p.dq.detail,
    live: true
  };
  setCustomTasks(customTasks.concat([task]));
  _supaWrite('tasks', task);
}
    const dqFiltered = parts.filter(function(p){
      if (dqSelOEMs.length > 0 && dqSelOEMs.indexOf(p.oem) < 0) return false;
      if (dqSelPlants.length > 0) {
  var dqMatched = dqSelPlants.some(function(sel){ return plantCodesFor(sel).indexOf(String(p.plant)) >= 0; });
  if (!dqMatched) return false;
  } 
      if (dqSelCategories.length > 0 && dqSelCategories.indexOf(p.component) < 0) return false;
      if (dqSelIdentifiers.length > 0) {
        var dqType = p.dq && p.dq.type;
        var matchDup = dqSelIdentifiers.indexOf('Duplicates') >= 0 && (dqType === 'DUPLICATE' || dqType === 'EXACT');
        var matchConf = dqSelIdentifiers.indexOf('Conflicts') >= 0 && dqType === 'CONFLICT';
        var matchPlace = dqSelIdentifiers.indexOf('Placeholders') >= 0 && dqType === 'PLACEHOLDER';
        if (!matchDup && !matchConf && !matchPlace) return false;
      }
      if (!p.dq || p.dq.type === 'CLEAN') return false;
      if (dqFlagFilter !== 'All' && p.dq && p.dq.label !== dqFlagFilter) return false;
      return true;
    });
    return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-gray-900">Data Quality Center</h1><p className="text-gray-500">Duplicates, conflicts, placeholders, and source-file disagreements across all identifiers.</p></div><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><StatCard title="Linked Families" value={String(dqCounts.family)} subtitle="Legit one-to-many JSS parts" tone="indigo" /><StatCard title="Duplicate Conflicts" value={String(dqCounts.conflict)} subtitle="Same customer part, differing data" tone="red" /><StatCard title="Exact Duplicates" value={String(dqCounts.exact)} subtitle="Identical rows" tone="orange" /></div><div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900"><span className="font-bold">How to read this:</span> Linked Families are normal (one Joyson part serving several customer numbers) and are shown grouped, not as errors. Conflicts and Placeholders are the real cleanup targets. The engine checks all three identifiers (Customer Part #, JSS Part #, Alt JSS Part #) on every row and import.</div><div className="bg-white rounded-xl border border-gray-200 p-4"><div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Flag Key</div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{[{ tone: 'indigo', label: 'Linked Family', means: 'One JSS part legitimately serves multiple customer #s.', action: 'None — normal, just grouped.' },{ tone: 'red', label: 'Duplicate Conflict', means: 'Same customer part with differing OEM / price / plant / description.', action: 'Review & resolve.' },{ tone: 'amber', label: 'Exact Duplicate', means: 'Identical customer part row appears more than once.', action: 'De-dupe.' },].map(function(k){ return <div key={k.label} className="border border-gray-100 rounded-lg p-3 bg-gray-50"><DQBadge dq={{ type: k.label === 'Linked Family' ? 'LABELONLY' : 'LABELONLY', tone: k.tone, label: k.label, family: 0 }} /><div className="text-xs text-gray-600 mt-2">{k.means}</div><div className="text-xs mt-2"><span className="font-semibold text-gray-700">Action: </span><span className="text-gray-600">{k.action}</span></div></div>; })}</div></div><div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end" style={{position:"sticky",top:0,zIndex:20}}><MultiSelectDropdown label="OEM" options={dqOemOpts} selected={dqSelOEMs} onChange={setDqSelOEMs} /><MultiSelectDropdown label="Plant" options={dqPlantOpts} selected={dqSelPlants} onChange={setDqSelPlants} /><div className="flex flex-col gap-1"><div className="text-xs text-gray-500 font-medium mb-1">Flag Type</div><div className="relative"><select value={dqFlagFilter} onChange={function(e){ setDqFlagFilter(e.target.value); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 font-medium cursor-pointer appearance-none pr-7" style={{minWidth:'180px'}}><option value="All">All Flags</option><option value="Needs Classification">Needs Classification</option><option value="Linked Family">Linked Family</option><option value="Duplicate Conflict">Duplicate Conflict</option><option value="Exact Duplicate">Exact Duplicate</option></select><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">▾</span></div></div>{(dqSelOEMs.length + dqSelPlants.length > 0 || dqFlagFilter !== 'All') && <button onClick={function(){ setDqSelOEMs([]); setDqSelPlants([]); setDqFlagFilter('All'); }} className="text-sm text-blue-600 underline self-center">Clear all filters</button>}<div className="ml-auto text-sm text-gray-500 self-center">Showing <span className="font-bold text-gray-900">{dqFiltered.length}</span> of {parts.length}</div></div>
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide"><tr><th className="text-left p-3">Flag</th><th className="text-left p-3">OEM</th><th className="text-left p-3">Plant</th><th className="text-left p-3">JSS Part</th><th className="text-left p-3">Customer Part</th><th className="text-left p-3">Description</th><th className="text-left p-3">Status</th><th className="text-left p-3">Issue Detail</th><th className="text-left p-3">Action</th></tr></thead><tbody>{dqFiltered.filter(function(p){ return archiveMode === 'all' || (archiveMode === 'archived' ? isArchived(p) : !isArchived(p)); }).map(function(rawP){ var p = resolvePart(rawP); return <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="p-3"><DQBadge dq={p.dq} /></td><td className="p-3 font-medium">{p.oem}</td><td className="p-3">{p.plant}</td><td className="p-3 font-mono text-xs">{p.jss}</td><td className="p-3 font-mono text-xs">{p.customerPart}</td><td className="p-3 max-w-xs truncate">{p.desc}</td><td className="p-3"><Badge tone={p.active === 'ACTIVE' ? 'Active' : p.active === 'INACTIVE' ? 'Inactive' : 'Unknown'}>{p.active}</Badge></td><td className="p-3 text-xs text-gray-600 max-w-xs">{p.dq.detail}</td><td className="p-3"><div className="flex gap-1"><button onClick={function(){ setSelectedPart(p); }} className="bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-1 text-xs font-medium hover:bg-blue-100">Review</button><button onClick={function(){ dqResolve(p); }} className="bg-green-50 text-green-700 border border-green-100 rounded px-2 py-1 text-xs font-medium hover:bg-green-100">Resolve</button><button onClick={function(){ dqEscalate(p); setPage('Action Queues'); }} className="bg-red-50 text-red-700 border border-red-100 rounded px-2 py-1 text-xs font-medium hover:bg-red-100">Escalate</button></div></td></tr>; })}</tbody></table></div>{dqFiltered.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No data quality issues match the current filters.</div>}</div></div>;
  }


  // ── Configure & Filter Step ─────────────────────────────────────────────────
  // Self-contained component so typing/clicking NEVER re-renders the parent App.

export { DataQualityCenter };