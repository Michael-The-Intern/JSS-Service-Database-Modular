// components/dashboard/Dashboard.jsx
// Main dashboard — KPIs, upcoming events, morning action report.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { StatCard } from '../shared/StatCard.jsx';
import { Badge } from '../shared/Badge.jsx';
import { _supa } from '../../lib/supabase.js';


function Dashboard(props) {
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
    return <div className="space-y-6"><div className="flex items-start justify-between gap-8"><div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500">Today's service cleanup and operational risk summary.</p></div><div className="hidden md:flex bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm items-center justify-center"><img src={joysonLogoUrl} alt="Joyson Safety Systems logo" className="h-16 object-contain" /></div></div><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><StatCard title="Parts Needing Review" value={parts.length.toLocaleString()} subtitle="Current working list" /><StatCard title="Critical Items" value={parts.filter(function(p){ return p.priority === 'Critical'; }).length.toLocaleString()} subtitle="Need action today" tone="red" /><StatCard title="Inactive With Demand" value={parts.filter(function(p){ return p.active === 'INACTIVE' && p.demand > 0; }).length.toLocaleString()} subtitle="Hard stop condition" tone="orange" /><StatCard title="Archive Candidates" value={parts.filter(function(p){ return p.recommendation && (p.recommendation||'').indexOf('ARCHIVE') >= 0; }).length.toLocaleString()} subtitle="Ready for review" tone="green" /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2 space-y-4"><div className="flex items-center justify-between"><h2 className="font-bold text-gray-900">Morning Action Summary</h2><span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div><div className="grid grid-cols-2 gap-3">{[{ icon: '🔴', label: 'Act Today', value: parts.filter(function(p){ return p.priority === 'Critical'; }).length, desc: 'Critical items needing same-day action', tone: 'red', page: 'Master Terminal' }, { icon: '🟠', label: 'Pending Approvals', value: parts.filter(function(p){ return p.recommendation && (p.recommendation||'').indexOf('PRICE') >= 0; }).length, desc: 'Price reviews awaiting approval', tone: 'orange', page: 'Service Price Review' }, { icon: '🟡', label: 'Backlog Risk', value: parts.filter(function(p){ return p.backlog > 0; }).length, desc: 'Parts with active backlog', tone: 'amber', }, { icon: '🟢', label: 'Data Quality Issues', value: parts.filter(function(p){ return p.dq && p.dq.type !== 'CLEAN'; }).length, desc: 'Flags needing review or resolution', tone: 'indigo', page: 'Data Quality Center' }].map(function(bucket){ return <button key={bucket.label} onClick={function(){ setPage(bucket.page); }} className="text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl p-3 transition-all"><div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{bucket.label}</span><span className="text-lg">{bucket.icon}</span></div><div className="text-2xl font-bold text-gray-900">{bucket.value}</div><div className="text-xs text-gray-500 mt-1">{bucket.desc}</div><div className="text-xs text-blue-600 mt-2 font-medium">View All →</div></button>; })}</div><div><div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Urgent Items</div><div className="space-y-2">{parts.filter(function(p){ return p.priority === 'Critical' || (p.priority === 'High' && p.backlog > 0); }).slice(0, 5).map(function(p){ var whyHere = p.priority === 'Critical' ? 'Critical priority — needs same-day decision' : p.backlog > 0 ? 'Active backlog with no confirmed supply path' : p.recommendation; return <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100"><Badge tone={p.priority}>{p.priority}</Badge><div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-900 truncate">{p.oem} · {p.jss}</div><div className="text-xs text-gray-500 truncate">{whyHere}</div></div><button onClick={function(){ setSelectedPart(p); setPage('Master Terminal'); }} className="bg-blue-600 text-white rounded-lg px-3 py-1 text-xs font-medium hover:bg-blue-700 whitespace-nowrap">Review →</button></div>; })}{parts.filter(function(p){ return p.priority === 'Critical' || (p.priority === 'High' && p.backlog > 0); }).length === 0 && <div className="text-sm text-gray-400 text-center py-3">No urgent items today. 🎉</div>}</div></div></div><div className="bg-white rounded-xl border border-gray-200 p-5"><h2 className="font-bold text-gray-900 mb-3">Recent Imports</h2>{(function(){ var imports = (rawAudit||[]).filter(function(a){ return a.action === 'IMPORT COMMIT'; }).slice(0,5); if (imports.length === 0) return <div className="text-sm text-gray-400 py-3">No imports yet.</div>; return imports.map(function(a){ var when = a.ts ? new Date(a.ts).toLocaleDateString() : '—'; return <div key={a.id} className="py-3 border-b last:border-b-0"><div className="font-medium text-sm">{a.target || 'Import'}</div><div className="text-xs text-gray-500">{when} · {a.user || '—'}</div></div>; }); })()}</div></div><UpcomingEvents /></div>;
  }

function UpcomingEvents() {
  const ctx = React.useContext(AppContext);
  const { MONTH_NAMES, teamEvents, calYear, setCalYear, calMonth, setCalMonth, selectedEventDate, setSelectedEventDate, eventModal, setEventModal } = ctx;
    const monthName = MONTH_NAMES[calMonth] + ' ' + calYear;
    // events for the visible month only
    const monthEvents = teamEvents.filter(function(e){ return e.year === calYear && e.month === calMonth; });
    const selectedEvents = monthEvents.filter(function(e){ return e.day === selectedEventDate; });
    const firstDow = new Date(calYear, calMonth, 1).getDay();          // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const calendarCells = [];
    for (let i = 0; i < firstDow; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

    function shiftMonth(delta){
      var m = calMonth + delta, y = calYear;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      setCalMonth(m); setCalYear(y); setSelectedEventDate(1);
    }
    function goToday(){ var n = new Date(); setCalYear(n.getFullYear()); setCalMonth(n.getMonth()); setSelectedEventDate(n.getDate()); }
    function openAddEvent(day){ setEventModal({ mode: 'add', id: null, year: calYear, month: calMonth, day: day || selectedEventDate, title: '', type: EVENT_TYPES[0], details: '' }); }
    function openEditEvent(e){ setEventModal(Object.assign({ mode: 'edit' }, e)); }

    return <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="flex items-start justify-between mb-4 gap-4 flex-wrap"><div><h2 className="font-bold text-gray-900">Upcoming Events</h2><p className="text-sm text-gray-500">Team-wide events only. Individual tasks and personal reminders should stay out of this group calendar.</p></div><div className="flex items-center gap-2"><Badge tone="Blue">{monthEvents.length} this month · {teamEvents.length} total</Badge><button onClick={function(){ openAddEvent(); }} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium">+ Add Event</button></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="border border-gray-200 rounded-xl p-4"><div className="flex items-center justify-between mb-3"><button onClick={function(){ shiftMonth(-1); }} className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg w-8 h-8 flex items-center justify-center text-lg">‹</button><div className="flex items-center gap-2"><div className="font-semibold text-gray-900">{monthName}</div><button onClick={goToday} className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-full px-2 py-0.5">Today</button></div><button onClick={function(){ shiftMonth(1); }} className="text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg w-8 h-8 flex items-center justify-center text-lg">›</button></div><div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function(day){ return <div key={day}>{day}</div>; })}</div><div className="grid grid-cols-7 gap-1">{calendarCells.map(function(day, idx){ const eventsForDay = day ? monthEvents.filter(function(e){return e.day === day;}) : []; const isSelected = day === selectedEventDate; const hasEvents = eventsForDay.length > 0; return <button key={idx} disabled={!day} onClick={function(){ if(day) setSelectedEventDate(day); }} className={(isSelected ? 'bg-blue-600 text-white border-blue-600' : hasEvents ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-100') + ' min-h-14 rounded-lg border p-1 text-sm relative disabled:bg-transparent disabled:border-transparent hover:border-blue-300'}>{day && <div className="font-medium">{day}</div>}{hasEvents && <div className={(isSelected ? 'bg-white text-blue-700' : 'bg-blue-600 text-white') + ' mx-auto mt-1 rounded-full w-5 h-5 text-xs flex items-center justify-center'}>{eventsForDay.length}</div>}</button>; })}</div></div><div className="border border-gray-200 rounded-xl p-4"><div className="flex items-center justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Selected Date</div><div className="text-xl font-bold text-gray-900 mt-1">{MONTH_NAMES[calMonth]} {selectedEventDate}, {calYear}</div></div><button onClick={function(){ openAddEvent(selectedEventDate); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-2 text-xs font-medium">+ Add to this day</button></div><div className="mt-4 space-y-3">{selectedEvents.length > 0 ? selectedEvents.map(function(event){ return <div key={event.id} className="border border-blue-100 bg-blue-50 rounded-xl p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-bold text-blue-900">{MONTH_NAMES[calMonth]} {event.day} - {event.title}</div><div className="text-sm text-blue-800 mt-1">{event.details}</div><button onClick={function(){ openEditEvent(event); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2">Edit event</button></div><span className={'text-xs border rounded-full px-2 py-1 whitespace-nowrap ' + (TYPE_TONES[event.type] || 'bg-white text-blue-700 border-blue-200')}>{event.type}</span></div></div>; }) : <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-500">No team-wide events on this date. Click <span className="font-medium">+ Add to this day</span> to create one.</div>}</div><div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm text-yellow-800">Calendar rule: only events that affect the full team or require group awareness should be added here.</div></div></div></div>;
  }

  // Add/Edit-event drawer for the team calendar.

function EventModal() {
    if (!eventModal) return null;
    const daysInModalMonth = new Date(eventModal.year, eventModal.month + 1, 0).getDate();

    // LOCAL state — isolates typing from parent re-renders
    const [localTitle, setLocalTitle] = React.useState(eventModal.title);
    const [localDetails, setLocalDetails] = React.useState(eventModal.details);
    const [localMonth, setLocalMonth] = React.useState(eventModal.month);
    const [localDay, setLocalDay] = React.useState(eventModal.day);
    const [localYear, setLocalYear] = React.useState(eventModal.year);
    const [localType, setLocalType] = React.useState(eventModal.type);

    function close(){ setEventModal(null); }
    function save(){
      const title = localTitle.trim();
      if (!title) return;
      if (eventModal.mode === 'add') {
        var ev = { id: 'EV-' + Date.now(), year: localYear, month: localMonth, day: localDay, type: localType, title: title, details: localDetails };
        setTeamEvents(function(prev){ return prev.concat([ev]); });
        setCalYear(localYear); setCalMonth(localMonth); setSelectedEventDate(localDay);
      } else {
        setTeamEvents(function(prev){ return prev.map(function(e){ return e.id === eventModal.id ? { id: e.id, year: localYear, month: localMonth, day: localDay, type: localType, title: title, details: localDetails } : e; }); });
        setSelectedEventDate(localDay);
      }
      setEventModal(null);
    }
    function remove(){
      setTeamEvents(function(prev){ return prev.filter(function(e){ return e.id !== eventModal.id; }); });
      setEventModal(null);
    }
    const noTitle = String(localTitle).trim() === '';

    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">{eventModal.mode === 'add' ? 'Add Team Event' : 'Edit Team Event'}</div><h2 className="text-lg font-bold text-gray-900 mt-1">Upcoming Events</h2></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4"><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Event Title</label><input value={localTitle} onChange={function(e){ setLocalTitle(e.target.value); }} placeholder="e.g. Q3 Service Review" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div><div className="grid grid-cols-3 gap-2"><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Month</label><select value={localMonth} onChange={function(e){ setLocalMonth(parseInt(e.target.value, 10)); }} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white">{MONTH_NAMES.map(function(m, i){ return <option key={m} value={i}>{m}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Day</label><select value={localDay} onChange={function(e){ setLocalDay(parseInt(e.target.value, 10)); }} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white">{Array.from({length: daysInModalMonth}, function(_, i){ return i + 1; }).map(function(d){ return <option key={d} value={d}>{d}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Year</label><input type="number" value={localYear} onChange={function(e){ setLocalYear(parseInt(e.target.value, 10) || localYear); }} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" /></div></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Type</label><select value={localType} onChange={function(e){ setLocalType(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{EVENT_TYPES.map(function(t){ return <option key={t} value={t}>{t}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Details</label><textarea value={localDetails} onChange={function(e){ setLocalDetails(e.target.value); }} rows={3} placeholder="What is this event about?" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></textarea></div><div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-800">Only add events that affect the full team or require group awareness — keep personal reminders out of the shared calendar.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2">{eventModal.mode === 'edit' && <button onClick={remove} className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm font-medium">Delete</button>}<div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={save} disabled={noTitle} className={(noTitle ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white') + ' rounded-lg px-4 py-2 text-sm font-medium'}>{eventModal.mode === 'add' ? 'Add Event' : 'Save Changes'}</button></div></div></React.Fragment>;
  }

function MorningActionReport() {
  const ctx = React.useContext(AppContext);
  const { parts, marManager, setMarManager, setPage, oemKeys } = ctx;
    const today = 'June 9, 2026';
    const marOems = React.useMemo(function(){ return ['All'].concat(oemKeys); }, [oemKeys]);
    // OEM scope helper — every list below is filtered through this so the whole
    // report narrows to one manager's customer when an OEM is picked.
    function inScope(oem){ return marManager === 'All' ? true : String(oem).toUpperCase().indexOf(marManager.toUpperCase()) >= 0; }
    // pull live signals from the engines already built (then scope to the selected OEM)
    const backorderItems = [];
    const reorderItems = [];
    const excessItems = [];
    const inactiveWithDemand = parts.filter(function(p){ return p.active === 'INACTIVE' && p.demand > 0 && inScope(p.oem); });
    const conflictItems = parts.filter(function(p){ return p.dq.type === 'CONFLICT' && inScope(p.oem); });
    const placeholderItems = parts.filter(function(p){ return p.dq.type === 'PLACEHOLDER' && inScope(p.oem); });
    const priceItems = parts.filter(function(p){ return ((p.recommendation||'').indexOf('PRICE') >= 0 || p.price === 'Missing') && inScope(p.oem); });
    const fineExposure = backorderItems.filter(function(r){ return r.fineRisk; });
    const managerWord = marManager === 'All' ? 'service' : marManager;

function Section(props) {
      if (!props.items || props.items.length === 0) return null;
      const toneBar = { red: 'border-red-400 bg-red-50', orange: 'border-orange-400 bg-orange-50', indigo: 'border-indigo-400 bg-indigo-50', blue: 'border-blue-400 bg-blue-50', green: 'border-green-400 bg-green-50' };
      return <div className={'border-l-4 rounded-r-xl ' + (toneBar[props.tone] || toneBar.blue) + ' p-4'}><div className="flex items-center justify-between"><div className="font-bold text-gray-900">{props.icon} {props.title}</div><span className="bg-white border border-gray-200 rounded-full px-2 py-1 text-xs font-medium">{props.items.length} item(s)</span></div><p className="text-sm text-gray-600 mt-1">{props.blurb}</p><div className="mt-3 space-y-2">{props.items.map(function(it){ return <button key={it.id} onClick={props.onClick ? function(){ props.onClick(it); } : null} className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-gray-900">{it.jss} <span className="font-normal text-gray-500">· {it.oem}{it.plant ? ' · Plant ' + it.plant : ''}</span></div><div className="text-xs text-gray-500">{props.line ? props.line(it) : it.desc}</div></div><span className="text-gray-400">&rarr;</span></button>; })}</div></div>;
    }

    const totalActions = backorderItems.length + inactiveWithDemand.length + conflictItems.length + placeholderItems.length + reorderItems.length + priceItems.length + excessItems.length;

    return <div className="space-y-5"><div className="flex items-start justify-between gap-4 flex-wrap"><div><h1 className="text-2xl font-bold text-gray-900">Everything a <span className="text-blue-600">{managerWord}</span> manager needs to do today</h1><p className="text-gray-500">{today} · Pulled live from the risk, data-quality, and service engines{marManager !== 'All' ? ' · scoped to ' + marManager : ''}.</p></div><div className="flex items-center gap-2 flex-wrap"><div className="flex items-center gap-2"><span className="text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">Manager / OEM</span><select value={marManager} onChange={function(e){ setMarManager(e.target.value); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{marOems.map(function(o){ return <option key={o} value={o}>{o === 'All' ? 'All OEMs' : o}</option>; })}</select></div><button onClick={function(){ var lines = ['Morning Action Report — ' + today, 'Manager / OEM: ' + (marManager === 'All' ? 'All OEMs' : marManager), 'Prepared by: ' + currentUser.name, 'Generated: ' + new Date().toLocaleString(), '', '--- SUMMARY ---', 'Total Actions Today: ' + totalActions, 'Backorder / Fine Risk: ' + backorderItems.length, 'Inactive With Demand: ' + inactiveWithDemand.length, 'Reorder Soon: ' + reorderItems.length, 'Duplicate Conflicts: ' + conflictItems.length, 'Placeholder / Junk IDs: ' + placeholderItems.length, 'Price Review: ' + priceItems.length, 'Excess / Overstock: ' + excessItems.length, '']; if (backorderItems.length) { lines.push('--- BACKORDER & FINE RISK ---'); backorderItems.forEach(function(r){ lines.push('  • ' + r.jss + ' · ' + r.oem + (r.plant ? ' · Plant ' + r.plant : '') + ' · cover ' + r.risk.coverWeeks.toFixed(1) + 'w'); }); lines.push(''); } if (inactiveWithDemand.length) { lines.push('--- INACTIVE WITH DEMAND ---'); inactiveWithDemand.forEach(function(p){ lines.push('  • ' + p.jss + ' · ' + p.oem + ' · demand ' + p.demand); }); lines.push(''); } if (priceItems.length) { lines.push('--- PRICE REVIEW ---'); priceItems.forEach(function(p){ lines.push('  • ' + p.jss + ' · ' + p.oem + ' · ' + p.price); }); lines.push(''); } var subject = encodeURIComponent('[Service Database] Morning Action Report — ' + today + (marManager !== 'All' ? ' · ' + marManager : '')); var body = encodeURIComponent(lines.join('\n')); window.location.href = 'mailto:' + encodeURIComponent(currentUser.email) + '?subject=' + subject + '&body=' + body; }} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200">✉ Email Report</button><button onClick={function(){ var sections=[{title:'BACKORDER & FINE RISK',color:'#fee2e2',items:backorderItems},{title:'INACTIVE WITH DEMAND',color:'#ffedd5',items:inactiveWithDemand},{title:'REORDER SOON',color:'#dbeafe',items:reorderItems},{title:'DUPLICATE CONFLICTS',color:'#e0e7ff',items:conflictItems},{title:'PLACEHOLDER / JUNK IDs',color:'#e0e7ff',items:placeholderItems},{title:'PRICE REVIEW',color:'#ffedd5',items:priceItems},{title:'EXCESS / OVERSTOCK',color:'#dcfce7',items:excessItems}]; var html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>td{font-family:Calibri,Arial,sans-serif;font-size:11pt;padding:4px 8px;}th{font-family:Calibri,Arial,sans-serif;font-size:11pt;padding:4px 8px;}</style></head><body><table>'; sections.forEach(function(s){ if(!s.items.length) return; html+='<tr><td colspan="7" style="background:'+s.color+';font-weight:bold;font-size:13pt;padding:6px 8px;border-bottom:2px solid #94a3b8;">'+s.title+' ('+s.items.length+' item'+(s.items.length!==1?'s':'')+')</td></tr>'; html+='<tr style="background:#1e3a5f;"><th style="color:#fff;font-weight:bold;width:160px;">JSS Part Number</th><th style="color:#fff;font-weight:bold;width:160px;">Customer Part</th><th style="color:#fff;font-weight:bold;width:120px;">OEM</th><th style="color:#fff;font-weight:bold;width:80px;">Plant</th><th style="color:#fff;font-weight:bold;width:280px;">Description</th><th style="color:#fff;font-weight:bold;width:100px;">Priority</th><th style="color:#fff;font-weight:bold;width:100px;">Status</th></tr>'; s.items.forEach(function(p,i){ var bg=i%2===0?'#ffffff':'#f8fafc'; html+='<tr style="background:'+bg+';"><td>'+String(p.jss||'')+'</td><td>'+String(p.customerPart||'')+'</td><td>'+String(p.oem||'')+'</td><td>'+String(p.plant||'')+'</td><td>'+String(p.description||'')+'</td><td>'+String(p.priority||'')+'</td><td>'+String(p.status||'')+'</td></tr>'; }); html+='<tr><td colspan="7" style="padding:6px;"></td></tr>'; }); html+='</table></body></html>'; var a=document.createElement('a'); a.href='data:application/vnd.ms-excel;charset=utf-8,'+encodeURIComponent(html); a.download='MorningActionReport_'+new Date().toISOString().slice(0,10)+'.xls'; a.click(); }} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Export Excel</button></div></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
    <div className="text-4xl font-semibold text-blue-600">{String(totalActions)}</div>
    <div className="text-sm font-semibold mt-1 opacity-90">Actions Today</div>
    <div className="text-xs mt-0.5 opacity-70">Across all categories</div>
    <div className="absolute -bottom-3 -right-3 text-6xl opacity-10 select-none">⚡</div>
  </div>
  <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
    <div className="text-4xl font-semibold text-red-500">{String(backorderItems.length)}</div>
    <div className="text-sm font-semibold mt-1 opacity-90">Backorder / Fine Risk</div>
    <div className="text-xs mt-0.5 opacity-70">{fineExposure.length} with chargeback exposure</div>
    <div className="absolute -bottom-3 -right-3 text-6xl opacity-10 select-none">🚨</div>
  </div>
  <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
    <div className="text-4xl font-semibold text-orange-500">{String(inactiveWithDemand.length)}</div>
    <div className="text-sm font-semibold mt-1 opacity-90">Inactive With Demand</div>
    <div className="text-xs mt-0.5 opacity-70">Hard-stop before archive</div>
    <div className="absolute -bottom-3 -right-3 text-6xl opacity-10 select-none">🛑</div>
  </div>
  <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
    <div className="text-4xl font-semibold text-indigo-500">{String(conflictItems.length + placeholderItems.length)}</div>
    <div className="text-sm font-semibold mt-1 opacity-90">Data-Quality Flags</div>
    <div className="text-xs mt-0.5 opacity-70">Conflicts + placeholders</div>
    <div className="absolute -bottom-3 -right-3 text-6xl opacity-10 select-none">⚠️</div>
  </div>
</div><div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900"><span className="font-bold">How to use this:</span> Work top to bottom — red sections are time-sensitive (line-down fines, stockouts), then supply planning, then data cleanup. Click any item to jump to its detail. The AI ranks and explains; you make the final call.</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="space-y-4"><Section icon="🛑" title="Inactive With Demand" tone="orange" blurb="Parts marked inactive that still have future demand — do NOT archive. Reactivate or confirm service path first." items={inactiveWithDemand} line={function(p){ return 'Demand ' + p.demand + ' · ' + p.recommendation; }} onClick={function(it){ setSelectedPart(it); setPage('Master Terminal'); }} /></div><div className="space-y-4"><Section icon="⚠️" title="Duplicate Conflicts" tone="indigo" blurb="Same part number with differing OEM, plant, or price across sources. Needs human review before trusting the record." items={conflictItems} line={function(p){ return p.customerPart + ' · ' + p.dq.detail; }} onClick={function(it){ setSelectedPart(it); setPage('Data Quality Center'); }} /><Section icon="🧹" title="Placeholder / Junk IDs" tone="indigo" blurb="Rows with S / 0 / blank identifiers polluting the database. Clean up or remove." items={placeholderItems} line={function(p){ return 'Identifiers: ' + p.jss + ' / ' + p.customerPart; }} onClick={function(it){ setSelectedPart(it); setPage('Data Quality Center'); }} /><Section icon="💲" title="Price Review" tone="orange" blurb="Missing service price or thin margin vs. cost. Confirm pricing before quoting or shipping." items={priceItems} line={function(p){ return 'Price ' + p.price + ' · cost ' + p.cost; }} onClick={function(it){ setSelectedPart(it); setPage('Service Price Review'); }} /></div></div></div>;
  }
export { Dashboard };