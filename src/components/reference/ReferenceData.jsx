// components/reference/ReferenceData.jsx
// Reference Data management — programs, statuses, and lookup tables.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';


function ReferenceData() {
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
    const listNames = Object.keys(refData);
    const active = refData[refList] || refData[listNames[0]];
    const liveRows = getRefRows(refList);
    const [localSearch, setLocalSearch] = React.useState('');
    const q = localSearch.trim().toLowerCase();
    // keep the true index so Edit/Delete target the right underlying row even when filtered
    const indexed = liveRows.map(function(r, i){ return { r: r, i: i }; });
    const rows = q ? indexed.filter(function(o){ return o.r.join(' ').toLowerCase().indexOf(q) >= 0; }) : indexed;
    const statusStyle = function(v){
      var s = String(v).toLowerCase();
      if (s === 'active' || s === 'mapped') return 'bg-green-100 text-green-800';
      if (s === 'placeholder' || s === 'needs review') return 'bg-orange-100 text-orange-800';
      if (s === 'critical' || s === 'high') return 'bg-red-100 text-red-800';
      if (s === 'medium') return 'bg-amber-100 text-amber-800';
      return 'bg-gray-100 text-gray-700';
    };
    const lastCol = active.cols.length - 1;
    // ---- GATING: only Admin may edit controlled lists. Everyone else is read-only. ----
    const ro = !canEdit();
    var oemPartCounts = {};
    if (refList === 'OEM / Customer List') {
      parts.forEach(function(p){ if (p.oem) oemPartCounts[p.oem] = (oemPartCounts[p.oem] || 0) + 1; });
    }

    function openAdd(){ if (ro) return; setRefModal({ mode: 'add', list: refList, rowIndex: null, values: active.cols.map(function(){ return ''; }) }); }
    function openEdit(rowIdx){ if (ro) return; setRefModal({ mode: 'edit', list: refList, rowIndex: rowIdx, values: liveRows[rowIdx].slice() }); }

    return <div className="space-y-5">
  {eopToast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-xl px-5 py-3 shadow-xl flex items-center gap-4 text-sm">
    <span>⚠️ <span className="font-semibold">Filter Applied — Missing EOP parts highlighted in Master Terminal.</span></span>
    <button onClick={function(){ setPage('Master Terminal'); setEopToast(false); }} className="bg-blue-500 hover:bg-blue-400 text-white rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap">Go to Master Terminal →</button>
    <button onClick={function(){ setEopToast(false); setMissingEopFilter(false); }} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
  </div>}<div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Reference Data</h1><p className="text-gray-500">The single source of truth. Every import and rule validates against these controlled lists.</p></div>{!ro && <button onClick={openAdd} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">+ Add Entry</button>}</div>{ro && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"><span className="text-xl leading-none">🔒</span><div><div className="font-bold text-amber-900 text-sm">Read-only — you need the <span className="underline">Admin</span> role to edit Reference Data</div><p className="text-sm text-amber-800 mt-0.5">You're signed in as <span className="font-semibold">{currentUser.role}</span>. You can view and search these controlled lists, but adding, editing, and deleting entries is restricted to Admins. Use the role switcher (top right) to demo Admin access.</p></div></div>}<div className="grid grid-cols-1 lg:grid-cols-4 gap-5"><div className="lg:col-span-1 space-y-2">{listNames.map(function(n){ const count = getRefRows(n).length; return <button key={n} onClick={function(){ setRefList(n); setLocalSearch(''); }} className={(refList === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50') + ' w-full text-left rounded-xl border px-4 py-3 text-sm flex items-center justify-between'}><span className="font-medium">{n}</span><span className={(refList === n ? 'bg-white text-blue-700' : 'bg-gray-100 text-gray-600') + ' rounded-full px-2 py-0.5 text-xs'}>{count}</span></button>; })}</div><div className="lg:col-span-3 space-y-4"><div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start justify-between gap-3"><div><div className="font-bold text-gray-900">{refList}</div><p className="text-sm text-blue-900 mt-1">{active.desc}</p></div>{!ro && <button onClick={openAdd} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap">+ Add Entry</button>}</div><div className="flex gap-2"><input value={localSearch} onChange={function(e){ setLocalSearch(e.target.value); }} placeholder={'Search ' + refList + '...'} className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm" /><button className="bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-sm">Export</button>{!ro && <button className="bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-sm">Import</button>}</div><div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr>{active.cols.map(function(c){ return <th key={c} className="text-left p-3">{c}</th>; })}{!ro && <th className="text-right p-3">Edit</th>}</tr></thead><tbody>{rows.map(function(o){ var r = o.r; var ri = o.i; return <tr key={ri} className="border-t border-gray-100 hover:bg-blue-50"><td className="p-3 font-mono text-xs">{r[0]}</td>{r.slice(1).map(function(cell, ci){ const realIdx = ci + 1; const isStatus = realIdx === lastCol; var liveCell = (refList === 'OEM / Customer List' && realIdx === 2) ? String(oemPartCounts[r[0]] || 0) : cell; return <td key={ci} className="p-3">{isStatus ? <span className={'px-2 py-1 rounded-full text-xs font-medium ' + statusStyle(liveCell)}>{liveCell}</span> : <span className={ci === 0 ? 'font-medium text-gray-900' : 'text-gray-600'}>{liveCell}</span>}</td>; })}{!ro && <td className="p-3 text-right"><button onClick={function(){ openEdit(ri); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button></td>}</tr>; })}</tbody></table></div>{rows.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No entries match "{localSearch}".</div>}</div><div className="text-xs text-gray-400">Showing {rows.length} of {liveRows.length} entries · {ro ? 'Read-only view — editing requires the Admin role.' : 'Changes here are audit-logged and apply to all future imports and validations.'}</div></div></div>{refModal && <ReferenceEntryModal />}</div>;
  }

  // Add/Edit drawer for any Reference Data list. Works generically off the list's columns.

function ReferenceEntryModal() {
    if (!refModal) return null;
    const cols = refData[refModal.list].cols;
    const isStatusCol = function(idx){ return idx === cols.length - 1; };
    const statusChoices = ['Active', 'Placeholder', 'Mapped', 'Needs Review'];
    const [localValues, setLocalValues] = React.useState(function(){ return refModal.values.slice(); });
    function setVal(idx, v){ setLocalValues(function(prev){ var nv = prev.slice(); nv[idx] = v; return nv; }); }
    function close(){ setRefModal(null); }
    function save(){
      var listName = refModal.list;
      var current = getRefRows(listName).slice();
      var clean = localValues.map(function(v){ return String(v).trim(); });
      if (refModal.mode === 'add') current.push(clean);
      else current[refModal.rowIndex] = clean;
      setRefOverrides(function(prev){ return Object.assign({}, prev, { [listName]: { rows: current } }); });
      setRefModal(null);
    }
    function remove(){
      var listName = refModal.list;
      var current = getRefRows(listName).slice();
      current.splice(refModal.rowIndex, 1);
      setRefOverrides(function(prev){ return Object.assign({}, prev, { [listName]: { rows: current } }); });
      setRefModal(null);
    }
    const firstEmpty = localValues[0].trim() === '';
    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">{refModal.mode === 'add' ? 'Add Entry' : 'Edit Entry'}</div><h2 className="text-lg font-bold text-gray-900 mt-1">{refModal.list}</h2></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4">{cols.map(function(c, idx){ return <div key={c}><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{c}</label>{isStatusCol(idx) && statusChoices.indexOf(String(refModal.values[idx])) >= 0 || (isStatusCol(idx) && refModal.mode==='add') ? <select value={localValues[idx]} onChange={function(e){ setVal(idx, e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"><option value="">— Select —</option>{statusChoices.map(function(s){ return <option key={s} value={s}>{s}</option>; })}</select> : <input value={localValues[idx]} onChange={function(e){ setVal(idx, e.target.value); }} placeholder={'Enter ' + c.toLowerCase()} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />}</div>; })}<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Changes to this controlled list are audit-logged and apply to all future imports and validations.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2">{refModal.mode === 'edit' && <button onClick={remove} className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm font-medium">Delete</button>}<div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={save} disabled={firstEmpty} className={(firstEmpty ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white') + ' rounded-lg px-4 py-2 text-sm font-medium'}>{refModal.mode === 'add' ? 'Add Entry' : 'Save Changes'}</button></div></div></React.Fragment>;
  }

export { ReferenceData };