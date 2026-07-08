// components/notifications/NotificationsPanel.jsx
// Notifications panel — real-time alerts and action items.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';


function NotificationsPanel() {
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
    if (!notifOpen) return null;
    const toneBar = { red: 'border-l-red-500', orange: 'border-l-orange-500', indigo: 'border-l-indigo-500', green: 'border-l-green-500', blue: 'border-l-blue-500' };
    function markRead(id){ setNotifications(function(prev){ return prev.map(function(n){ return n.id === id ? Object.assign({}, n, { read: true }) : n; }); }); }
    function go(n){ markRead(n.id); setNotifOpen(false); setPage(n.page); }
    function markAll(){ setNotifications(function(prev){ return prev.map(function(n){ return Object.assign({}, n, { read: true }); }); }); }
    var liveInactiveDemand = parts.filter(function(p){ return p.active === 'INACTIVE' && (Number(p.demand)||0) > 0; }).length;
    var liveMissingPrice = parts.filter(function(p){ return !p.price || p.price === 'Missing' || String(p.price).trim() === ''; }).length;
    var liveConflicts = parts.filter(function(p){ return p.dq && p.dq.type === 'CONFLICT'; });
    var liveArchiveCandidates = parts.filter(function(p){ var eop = parseInt(p.serviceEop, 10); return !isNaN(eop) && eop <= CURRENT_YEAR && (Number(p.demand)||0) === 0 && (Number(p.backlog)||0) === 0; }).length;
    var liveNotifs = notifications.map(function(n){
      if (n.id === 'N-01') return Object.assign({}, n, { title: liveInactiveDemand + ' inactive part' + (liveInactiveDemand !== 1 ? 's' : '') + ' still have demand', body: liveInactiveDemand > 0 ? 'Hard-stop condition — review before any archive run.' : 'All clear — no inactive parts with open demand.', tone: liveInactiveDemand > 0 ? 'red' : 'green' });
      if (n.id === 'N-03') return Object.assign({}, n, { title: liveMissingPrice + ' part' + (liveMissingPrice !== 1 ? 's' : '') + ' missing a service price', body: liveMissingPrice > 0 ? 'Cannot quote or ship until pricing is confirmed.' : 'All parts have a service price on file.', tone: liveMissingPrice > 0 ? 'orange' : 'green' });
      if (n.id === 'N-04') return Object.assign({}, n, { title: liveConflicts.length > 0 ? 'Duplicate conflict on customer part ' + liveConflicts[0].customerPart : 'No duplicate conflicts detected', body: liveConflicts.length > 0 ? (liveConflicts[0].dq.detail || n.body) : 'Data quality looks clean.', tone: liveConflicts.length > 0 ? 'indigo' : 'green' });
      if (n.id === 'N-05') return Object.assign({}, n, { title: liveArchiveCandidates.toLocaleString() + ' archive candidate' + (liveArchiveCandidates !== 1 ? 's' : '') + ' ready for review', body: liveArchiveCandidates > 0 ? 'Passed all safety checks. Ready to clean up.' : 'No archive candidates at this time.', tone: liveArchiveCandidates > 0 ? 'green' : 'blue' });
      return n;
    });
    return <React.Fragment><div onClick={function(){ setNotifOpen(false); }} className="fixed inset-0 z-30"></div><div className="absolute right-6 top-16 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden"><div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between"><div><div className="font-bold text-gray-900 text-sm">Notifications</div><div className="text-xs text-gray-500">{liveNotifs.filter(function(n){return !n.read;}).length} unread of {liveNotifs.length}</div></div><button onClick={markAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Mark all read</button></div><div className="max-h-96 overflow-auto">{liveNotifs.map(function(n){ return <div key={n.id} className={'border-l-4 ' + (toneBar[n.tone] || toneBar.blue) + ' border-b border-gray-100 p-3 flex gap-3 ' + (n.read ? 'bg-white' : 'bg-blue-50/40')}><div className="text-xl leading-none">{n.icon}</div><button onClick={function(){ go(n); }} className="flex-1 text-left"><div className="flex items-center gap-2"><span className={'text-sm ' + (n.read ? 'font-medium text-gray-700' : 'font-bold text-gray-900')}>{n.title}</span>{!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></span>}</div><div className="text-xs text-gray-500 mt-0.5">{n.body}</div><div className="text-xs text-blue-600 mt-1">{n.page} · {n.time} &rarr;</div></button>{!n.read && <button onClick={function(){ markRead(n.id); }} title="Mark read" className="text-gray-300 hover:text-gray-600 text-xs self-start">✓</button>}</div>; })}</div><div className="bg-gray-50 border-t border-gray-200 p-2 text-center"><button onClick={function(){ setNotifOpen(false); setPage('Action Queues'); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View all in Action Queues &rarr;</button></div></div></React.Fragment>;
  }

export { NotificationsPanel };