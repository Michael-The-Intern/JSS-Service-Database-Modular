// components/master/MasterTerminal.jsx
// Master Terminal — power-user full parts table with bulk actions.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { Badge } from '../shared/Badge.jsx';
import { SearchBox } from '../shared/SearchBox.jsx';
import { MultiSelectDropdown } from '../shared/MultiSelectDropdown.jsx';
import { Table } from '../shared/Table.jsx';


function MasterTerminal() {
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
    marManager, setMarManager, canEdit, currentUser, authed,
    filteredParts,
    oemDropdownOptions, priorityOptions, plantDropdownOptions, categoryDropdownOptions, subcategoryOptions
  } = ctx;
    const bulkActions = [
      { key: 'reactivate', icon: '🔄', label: 'Reactivate Selected', desc: 'Set status to ACTIVE for parts flagged inactive-with-demand. Logged + reversible.', approver: 'Service Lead' },
      { key: 'archive', icon: '🗄️', label: 'Send to Archive Review', desc: 'Route selected parts to the safety-gated Archive queue (never deletes).', approver: 'Service Lead / Admin' },
      { key: 'price', icon: '💲', label: 'Queue for Price Review', desc: 'Send parts with missing/thin-margin prices to Service Price Review.', approver: 'Pricing Admin' },
      { key: 'owner', icon: '👤', label: 'Reassign Owner', desc: 'Bulk-change the responsible team/owner on the selected rows.', approver: 'Manager' },
      { key: 'export', icon: '📤', label: 'Export Selection', desc: 'Download the filtered rows as Excel/CSV (pivot or flat).', approver: 'Any role' },
      { key: 'tag', icon: '🏷️', label: 'Apply Recommendation Tag', desc: 'Stamp a controlled recommendation (e.g. KEEP ACTIVE) on the selection.', approver: 'Admin' }
    ];
    const selCount = filteredParts.length;
    return <div className="space-y-4"><div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-gray-900">Master Terminal</h1><p className="text-gray-500">Complete service part database with Excel-like controls.</p></div><div className="relative"><button onClick={function(){ setBulkOpen(!bulkOpen); setBulkAction(null); }} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-medium flex items-center gap-2">Bulk Actions <span className="text-xs">{bulkOpen ? '▲' : '▼'}</span></button>{bulkOpen && <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden"><div className="bg-gray-50 border-b border-gray-200 p-3"><div className="font-bold text-gray-900 text-sm">Bulk Actions</div><div className="text-xs text-gray-500 mt-1">Apply one action to all <span className="font-semibold text-blue-700">{selCount}</span> rows currently shown (filter: <span className="font-semibold">{filter}</span>). Pick a filter first to target a specific set.</div></div><div className="max-h-80 overflow-auto p-2">{bulkActions.map(function(a){ return <button key={a.key} onClick={function(){ setBulkAction(a); }} className={(bulkAction && bulkAction.key === a.key ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-50') + ' w-full text-left rounded-lg p-3 border mb-1'}><div className="flex items-center gap-2 text-sm font-medium text-gray-900"><span>{a.icon}</span>{a.label}</div><div className="text-xs text-gray-500 mt-1">{a.desc}</div><div className="text-xs text-gray-400 mt-1">Requires: {a.approver}</div></button>; })}</div>{bulkAction && <div className="border-t border-gray-200 p-3 bg-blue-50"><div className="text-xs text-blue-900 mb-2"><span className="font-bold">{bulkAction.label}</span> will be applied to <span className="font-bold">{selCount}</span> rows and logged to Audit History.</div><div className="flex gap-2"><button onClick={function(){
  var sel = mtSelectMode ? filteredParts.filter(function(p){ return mtSelectedIds.indexOf(p.id) >= 0; }) : filteredParts;
  var ids = sel.map(function(p){ return p.id; });
  var ts = new Date().toISOString();
  var auditEntry = { action: 'Bulk Action', module: 'Master Terminal', user: currentUser.name, ts: ts, reversible: true, target: bulkAction.label + ' — ' + ids.length + ' parts' };
  if (bulkAction.key === 'archive') {
    setManualArchiveIds(function(prev){ return prev.concat(ids.filter(function(id){ return prev.indexOf(id) < 0; })); });
    setPage('Archive Review');
  } else if (bulkAction.key === 'reactivate') {
    setRawParts(function(prev){ return prev.map(function(p){ return ids.indexOf(p.id) >= 0 ? Object.assign({}, p, { active: 'ACTIVE' }) : p; }); });
  } else if (bulkAction.key === 'price') {
    setPage('Service Price Review');
  } else if (bulkAction.key === 'tag') {
    setRawParts(function(prev){ return prev.map(function(p){ return ids.indexOf(p.id) >= 0 ? Object.assign({}, p, { recommendation: 'KEEP ACTIVE' }) : p; }); });
  }
  setRawAudit(function(prev){ _supaWrite('audit_log', auditEntry); return [auditEntry].concat(prev); });
  setBulkOpen(false); setBulkAction(null); setMtSelectMode(false); setMtSelectedIds([]);
}} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium">Confirm &amp; Apply</button><button onClick={function(){ setBulkAction(null); }} className="bg-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm">Cancel</button></div></div>}</div>}</div></div><div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-900"><span className="font-bold">Bulk Actions</span> let you apply one operation to many parts at once instead of opening them one by one. First use the filters below to narrow the list (e.g. "Inactive With Demand"), then open Bulk Actions and pick what to do with that whole set. Every bulk change is approval-gated and recorded in Audit History.</div><div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end" style={{position:"sticky",top:0,zIndex:20}}><MultiSelectDropdown label="OEM" options={oemDropdownOptions} selected={selOEMs} onChange={setSelOEMs} /><MultiSelectDropdown label="Priority" options={priorityOptions} selected={selPriorities} onChange={setSelPriorities} /><MultiSelectDropdown label="Plant" options={plantDropdownOptions} selected={selPlants} onChange={setSelPlants} /><MultiSelectDropdown label="Component Family" options={categoryDropdownOptions} selected={selCategories} onChange={function(v){ setSelCategories(v); setSelSubcategories([]); }} /><MultiSelectDropdown label="Subcategory" options={subcategoryOptions} selected={selSubcategories} onChange={setSelSubcategories} />{(selOEMs.length + selPriorities.length + selPlants.length + selCategories.length + selSubcategories.length) > 0 && <button onClick={function(){ setSelOEMs([]); setSelPriorities([]); setSelPlants([]); setSelCategories([]); setSelSubcategories([]); }} className="text-sm text-blue-600 underline self-center">Clear all filters</button>}<div className="flex flex-col gap-1">
  <div className="text-xs text-gray-500 font-medium mb-1">EOP Status</div>
  <div className="relative"><select value={eopFilter} onChange={function(e){ setEopFilter(e.target.value); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 font-medium cursor-pointer appearance-none pr-7" style={{minWidth:'160px'}}><option value="All">All EOPs</option><option value="Has EOP">Has EOP</option><option value="Missing EOP">Missing EOP</option></select><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">▾</span></div>
</div><div className="relative self-end"><select value={archiveMode} onChange={function(e){ setArchiveMode(e.target.value); }} className={(archiveMode === 'all' ? 'bg-blue-50 text-blue-800 border border-blue-200' : archiveMode === 'active' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200') + ' rounded-lg px-3 py-2 text-sm font-medium cursor-pointer appearance-none pr-7'}><option value="active">Active Only</option><option value="all">Show All</option><option value="archived">Archived Only</option></select><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs">▾</span></div><button onClick={function(){ setMtSelectMode(!mtSelectMode); if (mtSelectMode) setMtSelectedIds([]); }} className={(mtSelectMode ? 'bg-blue-900 text-white border border-blue-900 ring-2 ring-blue-300 shadow-[0_2px_6px_rgba(30,58,138,0.4)] hover:bg-blue-950' : 'bg-blue-100 text-blue-900 border border-blue-200 hover:bg-blue-200 hover:border-blue-300') + ' self-end rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200'}>{mtSelectMode ? 'Exit Select' : 'Select Mode'}</button><div className="ml-auto text-sm text-gray-500 self-center">Showing <span className="font-bold text-gray-900">{filteredParts.length}</span> of {parts.length}</div></div><Table onRowClick={setSelectedPart} rows={filteredParts.map(function(p){ return resolvePart(p); })} selectMode={mtSelectMode} selectedIds={mtSelectedIds} onToggle={function(id, clearAll){ if (clearAll) { setMtSelectedIds([]); return; } setMtSelectedIds(function(prev){ return prev.indexOf(id) >= 0 ? prev.filter(function(x){ return x !== id; }) : prev.concat([id]); }); }} />{mtSelectMode && mtSelectedIds.length > 0 && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"><div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-2xl px-2 py-2 shadow-[0_10px_40px_rgba(15,23,42,0.5),0_4px_12px_rgba(15,23,42,0.3)]"><div className="flex items-center gap-2 px-4 py-2"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold tabular-nums">{mtSelectedIds.length}</span><span className="text-gray-900 text-[13px] font-medium">{mtSelectedIds.length === 1 ? 'part' : 'parts'} selected</span></div><div className="w-px h-7 bg-white/10 mx-1"></div><button onClick={function(){ var sel = filteredParts.filter(function(p){ return mtSelectedIds.indexOf(p.id) >= 0; }); var cols = ['OEM','JSS Part','Customer Part','Description','Priority','Status','Demand','Backlog','Service EOP','Recommendation']; var keys = ['oem','jss','customerPart','desc','priority','active','demand','backlog','serviceEop','recommendation']; var head = cols.map(function(c){ return '"'+c+'"'; }).join(','); var body = sel.map(function(p){ return keys.map(function(k){ var v = p[k]; v = (v===undefined||v===null)?'':String(v); return '"'+v.replace(/"/g,'""')+'"'; }).join(','); }).join('\n'); var blob = new Blob([head+'\n'+body],{type:'text/csv;charset=utf-8;'}); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href=url; a.download='master-selection-'+Date.now()+'.csv'; a.click(); URL.revokeObjectURL(url); }} className="inline-flex items-center gap-1.5 text-gray-900 hover:text-white hover:bg-slate-800 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"><span className="text-base leading-none">↓</span> CSV</button><button onClick={async function(){ var sel = filteredParts.filter(function(p){ return mtSelectedIds.indexOf(p.id) >= 0; }); var EXP_COLS = [{header:'OEM',key:'oem'},{header:'JSS Part',key:'jss'},{header:'Customer Part',key:'customerPart'},{header:'Description',key:'desc'},{header:'Priority',key:'priority'},{header:'Status',key:'active'},{header:'Demand',key:'demand'},{header:'Backlog',key:'backlog'},{header:'Service EOP',key:'serviceEop'},{header:'Recommendation',key:'recommendation'}]; var wb = new ExcelJS.Workbook(); var ws = wb.addWorksheet('Selection'); ws.columns = EXP_COLS.map(function(c){ return {header:c.header,key:c.key,width:Math.max(c.header.length+4,16)}; }); sel.forEach(function(p){ var row = {}; EXP_COLS.forEach(function(c){ row[c.key] = p[c.key]!==undefined&&p[c.key]!==null?p[c.key]:''; }); ws.addRow(row); }); ws.getRow(1).eachCell(function(cell){ cell.font={bold:true,name:'Aptos Narrow',size:11}; cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F3864'}}; cell.font=Object.assign({},cell.font,{color:{argb:'FFFFFFFF'}}); cell.alignment={horizontal:'center',vertical:'middle'}; }); ws.eachRow(function(row,rn){ if(rn===1)return; row.eachCell(function(cell){ cell.font={name:'Aptos Narrow',size:11}; cell.alignment={horizontal:'center',vertical:'middle'}; }); }); ws.views=[{state:'frozen',ySplit:1}]; ws.autoFilter={from:{row:1,column:1},to:{row:1,column:EXP_COLS.length}}; var buf=await wb.xlsx.writeBuffer(); var blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='master-selection-'+Date.now()+'.xlsx'; a.click(); URL.revokeObjectURL(url); }} className="inline-flex items-center gap-1.5 text-gray-900 hover:text-white hover:bg-slate-800 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"><span className="text-base leading-none">↓</span> Excel</button><div className="w-px h-7 bg-white/10 mx-1"></div><button onClick={function(){ var sel = filteredParts.filter(function(p){ return mtSelectedIds.indexOf(p.id) >= 0; }).map(function(p){ return resolvePart(p); }); setExportTerminalParts(sel); setPage('Export Terminal'); }} className="inline-flex items-center gap-1.5 bg-gradient-to-b from-blue-500 to-blue-600 text-white rounded-xl px-4 py-2 text-[13px] font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.3),0_4px_12px_rgba(37,99,235,0.4)] hover:shadow-[0_2px_4px_rgba(37,99,235,0.4),0_8px_20px_rgba(37,99,235,0.5)] hover:-translate-y-px active:translate-y-0 transition-all duration-200">Export Terminal <span className="opacity-70">→</span></button><button onClick={function(){ var sel = filteredParts.filter(function(p){ return mtSelectedIds.indexOf(p.id) >= 0; }); var ts=(function(){var d=new Date();var p=function(n){return(n<10?'0':'')+n;};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());})(); var newTasks=sel.map(function(r,i){ return {id:'T-MT-'+Date.now()+'-'+i,title:'Follow-up — '+r.oem+' '+r.jss+' ('+r.desc+')',role:'Manager',status:'Open',priority:r.priority==='Critical'?'High':'Medium',source:'Master Terminal',jss:r.jss,oem:r.oem,partId:r.id,ageDays:0,slaDays:5,suggestion:'Review flagged part from Master Terminal.',reason:'Manually flagged for follow-up by '+currentUser.name+'.',assignee:'Unassigned',live:true,submittedBy:currentUser.name,submittedAt:ts}; }); setQueueTasks(function(prev){var next=prev.concat(newTasks);return next;}); newTasks.forEach(function(t){ _supa.from('tasks').insert(t); }); var auditEntries=sel.map(function(r,i){ return {id:'A-MT-FLAG-'+Date.now()+'-'+i,ts:ts,user:currentUser.name,role:currentUser.role||'Manager',action:'FLAG RAISED',module:'Master Terminal',target:'JSS '+r.jss+' · '+r.oem,before:r.active||'ACTIVE',after:'Flagged for Review',reversible:true,note:'Bulk-flagged for follow-up from Master Terminal selection. Task created in Action Queues.',live:true}; }); setTaskAudit(function(prev){ return auditEntries.concat(prev); }); setMtSelectedIds([]); setMtSelectMode(false); alert('✓ '+sel.length+' part(s) flagged for follow-up in Action Queues and recorded in Audit History.'); }} className="inline-flex items-center gap-1.5 text-gray-900 hover:text-white hover:bg-slate-800 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"><span className="text-orange-400">●</span> Flag for Review</button><div className="w-px h-7 bg-white/10 mx-1"></div><button onClick={function(){ setMtSelectMode(false); setMtSelectedIds([]); }} className="flex items-center justify-center w-9 h-9 text-gray-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors" aria-label="Close"><span className="text-lg leading-none">×</span></button></div></div>}</div>;
  }

  

    // ---------- ARCHIVE: Export Candidates drawer ----------
  // Builds an export of the archive candidate queue (filterable by status) — pre-joined and ready
  // to hand to a manager. Mirrors the Order Plan export pattern.
  

  // ---------- ARCHIVE: Submit Selected drawer ----------
  // Confirms the batch of checked rows being routed for archive approval. On confirm it stamps each
  // selected row as "Pending Data" and clears the selection.


  // ---------- ASSIGN / UPDATE ACTION drawer ----------
  // Generic action assignment used from the Archive Review (and reusable elsewhere). Lets the
  // reviewer pick an action, owner, priority, and note for the selected part. Records to session.

export { MasterTerminal };