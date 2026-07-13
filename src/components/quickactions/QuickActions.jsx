// components/quickactions/QuickActions.jsx
// Quick Actions widget — common one-click operations.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';


function QuickActions() {
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
    joysonLogoUrl
  } = ctx;
    const moduleCards = [
      { tab: 'Master Terminal', icon: '🗃️', tone: 'blue', desc: 'Open the full service part database with Excel-style filters for status, priority, duplicates, backlog, and price review.' },
      { tab: 'Morning Action Report', icon: '☀️', tone: 'amber', desc: 'Your daily start-of-day briefing — backorder/fine risks, inactive-with-demand stops, data-quality issues, and archive candidates in one list.' },
      { tab: 'Archive Review', icon: '📦', tone: 'green', desc: 'Safety-gated cleanup workspace for inactive, obsolete, and no-demand parts — never deletes, always archives with an audit trail.' },
      { tab: 'Data Quality Center', icon: '🔍', tone: 'indigo', desc: 'Find duplicate conflicts, linked one-to-many families, and invalid placeholder IDs across all three part-number fields.' },
      { tab: 'Import Wizard', icon: '📥', tone: 'blue', desc: 'Upload messy OEM, manager, plant, and SAP files — auto-detect headers, map columns, validate, and preview before commit.' },
      { tab: 'Service Price Review', icon: '💲', tone: 'orange', desc: 'Confirm service price, cost, and customer pricing on flagged parts where margin is thin or price data is missing.' },
      { tab: 'Action Queues', icon: '✅', tone: 'green', desc: 'Role-based work lists for cleanup, review, and approvals — see what is assigned, waiting, and Closed.' },
      { tab: 'Reports & Exports', icon: '📊', tone: 'blue', desc: 'Generate controlled Excel, CSV, and summary outputs for managers, OEM reviews, and leadership.' }
    ];
    const toneRing = { blue: 'hover:border-blue-400', red: 'hover:border-red-400', green: 'hover:border-green-400', amber: 'hover:border-amber-400', orange: 'hover:border-orange-400', indigo: 'hover:border-indigo-400' };
    const toneText = { blue: 'text-blue-600', red: 'text-red-600', green: 'text-green-600', amber: 'text-amber-600', orange: 'text-orange-600', indigo: 'text-indigo-600' };
    return <div className="space-y-6"><div className="flex items-start justify-between gap-8"><div><h1 className="text-2xl font-bold text-gray-900">Quick Actions</h1><p className="text-gray-500">Jump straight into any module. Each card explains what the tool does — click the arrow to go there.</p></div><div className="hidden md:flex bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm items-center justify-center"><img src={joysonLogoUrl} alt="Joyson Safety Systems logo" className="h-16 object-contain" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{moduleCards.map(function(c){ return <button key={c.tab} onClick={function(){setPage(c.tab);}} className={'group text-left bg-white rounded-xl border border-gray-200 p-5 transition-all hover:shadow-md ' + (toneRing[c.tone] || toneRing.blue)}><div className="flex items-start justify-between"><div className="text-3xl">{c.icon}</div><span className={'text-xl opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all ' + (toneText[c.tone] || toneText.blue)}>&rarr;</span></div><div className="font-bold text-gray-900 mt-3">{c.tab}</div><div className="text-sm text-gray-500 mt-1 leading-relaxed">{c.desc}</div><div className={'text-xs font-medium mt-3 ' + (toneText[c.tone] || toneText.blue)}>Go to {c.tab} &rarr;</div></button>; })}</div></div>;
  }

export { QuickActions };