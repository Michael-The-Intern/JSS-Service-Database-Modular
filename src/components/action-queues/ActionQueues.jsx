// components/action-queues/ActionQueues.jsx
// Action Queues — triage, reassign, dismiss, and resolve service actions.
// REBUILT: all hooks + helpers properly nested inside function ActionQueues().
// Orphaned module-scope useState/useEffect blocks removed (App.jsx owns global state).

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { Badge } from '../shared/Badge.jsx';
import { SearchBox } from '../shared/SearchBox.jsx';
import { MultiSelectDropdown } from '../shared/MultiSelectDropdown.jsx';
import { StatCard } from '../shared/StatCard.jsx';

function ActionQueues() {
  const ctx = React.useContext(AppContext);
  const { page, setPage, parts, rawParts, setRawParts, rawTasks, _supaWrite,
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
    customTasks, setCustomTasks, rawTasks, riskRows, taskActions, setTaskActions, taskAudit, setTaskAudit,
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

    const roles = ['All Roles', 'Admin', 'VP', 'Director / GKAM', 'Manager', 'Read Only'];
    const statuses = ['All', 'Open', 'In Progress', 'Pending Data', 'Completed', 'Dismissed'];

    const [queueRole, setQueueRole] = React.useState('All Roles');
    const [queueOem, setQueueOem] = React.useState([]);
    const [queueStatus, setQueueStatus] = React.useState('Open');
    const [oemPanelOpen, setOemPanelOpen] = React.useState(true);
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [reassignFor, setReassignFor] = React.useState(null);
    const [dismissFor, setDismissFor] = React.useState(null);
    const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
    const [newTask, setNewTask] = React.useState({ title: '', oem: '', relatedPart: '', priority: 'Medium', assignTo: 'Manager', dueDate: '', notes: '' });
    

    function generateTaskId(){
      var year = new Date().getFullYear();
      var existing = customTasks.length + 1;
      var padded = ('0000' + existing).slice(-4);
      return 'T-' + year + '-' + padded;
    }
    function submitNewTask(){
      if (!newTask.title.trim() || !newTask.oem || !newTask.priority || !newTask.assignTo || !newTask.notes.trim()) {
        alert('Please fill in all required fields: Title, OEM, Priority, Assign To, and Notes.');
        return;
      }
      var task = {
        id: generateTaskId(),
        title: newTask.title.trim(),
        oem: newTask.oem,
        relatedPart: newTask.relatedPart.trim(),
        priority: newTask.priority,
        assignTo: newTask.assignTo,
        dueDate: newTask.dueDate,
        notes: newTask.notes.trim(),
        status: 'Open',
        source: 'Manual Entry',
        createdAt: new Date().toISOString(),
        createdBy: 'Current User'
      };
      setCustomTasks(customTasks.concat([task]));
      _supaWrite('tasks', task);
      setTaskAudit(function(prev){ return prev.concat([{ id: 'TA-' + task.id + '-' + Date.now(), ts: new Date().toISOString(), user: currentUser.name, role: currentUser.role, action: 'STATUS CHANGE', module: 'Action Queues', target: task.id + ' · ' + task.title, before: '—', after: 'Open', reversible: false, note: 'Manual task created · OEM: ' + task.oem + ' · Priority: ' + task.priority + ' · Assigned to: ' + task.assignTo + (task.notes ? ' · ' + task.notes : ''), live: true }]); });
      setNewTask({ title: '', oem: '', relatedPart: '', priority: 'Medium', assignTo: 'Manager', dueDate: '', notes: '' });
      setCreateTaskOpen(false);
    }

   const statusStyles = {
      'Open': 'bg-gray-100 text-gray-700 border-gray-200',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending Data': 'bg-amber-100 text-amber-800 border-amber-200',
      'Completed': 'bg-green-100 text-green-800 border-green-200',
      'Dismissed': 'bg-red-100 text-red-800 border-red-200'
    };

function StatusBadge(props) { return <span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (statusStyles[props.status] || statusStyles['Open'])}>{props.status}</span>; }
    function slaInfo(t) {
      // open-ended statuses count against SLA; closed ones don't
      const closed = t.status === 'Completed' || t.status === 'Dismissed';
      if (closed) return { label: 'Closed', tone: 'text-gray-400' };
      // derive ageDays from createdAt if missing (manual tasks)
      var ageDays = (typeof t.ageDays === 'number') ? t.ageDays : (t.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000)) : 0);
      // derive slaDays: explicit field > dueDate-based > priority default
      var slaDays;
      if (typeof t.slaDays === 'number') { slaDays = t.slaDays; }
      else if (t.dueDate) {
        var due = new Date(t.dueDate).getTime();
        var created = t.createdAt ? new Date(t.createdAt).getTime() : Date.now();
        slaDays = Math.max(1, Math.ceil((due - created) / 86400000));
      } else {
        // fallback by priority: Critical=2, High=5, Medium=10, Low=20
        slaDays = t.priority === 'Critical' ? 2 : t.priority === 'High' ? 5 : t.priority === 'Low' ? 20 : 10;
      }
      if (ageDays > slaDays) return { label: 'Overdue (' + ageDays + 'd / ' + slaDays + 'd SLA)', tone: 'text-red-600 font-semibold' };
      if (ageDays >= slaDays) return { label: 'Due today', tone: 'text-amber-600 font-semibold' };
      return { label: ageDays + 'd old · ' + (slaDays - ageDays) + 'd left', tone: 'text-gray-500' };
    }

    // ---- MERGE LIVE-ROUTED TASKS ----
    // queueTasks are created in-app (Send to Manager / Request Cost Data from Service Price Review).
    // They sit on top of the seeded backlog so a routed action is an immediately ownable, SLA-tracked
    // task — exactly what a real Action Queue backend would persist.
    // Apply any in-app action result (taskActions) over each task so a manager's decision
    // (Approve/Complete, Start/Take, Reassign, Reject) is reflected on both seeded and live tasks.
    const allTasks = queueTasks.concat(rawTasks).concat(customTasks.map(function(c){ return { id: c.id, title: c.title, role: c.assignTo, status: c.status, priority: c.priority, source: c.source, oem: c.oem || 'General', jss: c.relatedPart || '—', suggestion: 'Manual task — review and act', reason: c.notes, assignee: 'Unassigned', createdAt: c.createdAt, dueDate: c.dueDate, createdBy: c.createdBy }; })).map(function(t){
      const a = taskActions[t.id];
      return a ? Object.assign({}, t, { status: a.status, assignee: a.assignee !== undefined ? a.assignee : t.assignee, actionNote: a.note, actionBy: a.by, actionTs: a.ts }) : t;
    });
    const liveQueueCount = queueTasks.length;
    const actedCount = Object.keys(taskActions).length;

    // ---- TASK ACTION HANDLERS ----
    // Each records a transition stamped with who + when. Start/Take also assigns the task to the
    // current user. In production these are persisted server-side and written to Audit History.
    function actStamp(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); }
    function recordTaskAction(task, patch){
      var stamp = actStamp();
      setTaskActions(function(prev){ var n = Object.assign({}, prev); n[task.id] = Object.assign({ ts: stamp, by: currentUser.name }, patch); return n; });
      setSelectedTask(function(prevSel){ return prevSel && prevSel.id === task.id ? Object.assign({}, prevSel, patch) : prevSel; });
      var action = patch.status === 'Completed' ? 'STATUS CHANGE' : patch.status === 'Open' ? 'STATUS CHANGE' : patch.status === 'In Progress' ? 'STATUS CHANGE' : patch.status === 'Dismissed' ? 'ORDER Dismissed' : patch.assignee ? 'ROLE CHANGE' : 'STATUS CHANGE';
      setTaskAudit(function(prev){ return prev.concat([{ id: 'TA-' + task.id + '-' + Date.now(), ts: new Date().toISOString(), user: currentUser.name, role: currentUser.role, action: action, module: 'Action Queues', target: task.id + ' · ' + task.title, before: task.status, after: patch.status || task.status, reversible: false, note: patch.note || '', live: true }]); });
      _supaWrite('tasks', Object.assign({}, task, patch));
    }
    function doApproveTask(task){ if (!task) return; var isPending = task.status === 'Pending Data'; if (isPending) { recordTaskAction(task, { status: 'Open', note: 'Data received by ' + currentUser.name + ' — task unblocked and ready for action review.' }); } else { recordTaskAction(task, { status: 'Completed', note: 'Completed by ' + currentUser.name + '.' }); } }
    function doStartTask(task){ if (!task) return; recordTaskAction(task, { status: 'In Progress', assignee: currentUser.name, note: 'Picked up by ' + currentUser.name + ' — now in progress.' }); }
    function doDismissTask(task, reason){ if (!task) return; recordTaskAction(task, { status: 'Dismissed', note: 'Dismissed by ' + currentUser.name + (reason ? ' — ' + reason : '') + '.' }); setDismissFor(null); }
    function applyReassign(task, assignee, note){ recordTaskAction(task, { status: task.status, assignee: assignee, note: 'Reassigned to ' + assignee + ' by ' + currentUser.name + (note ? ' — ' + note : '') + '.' }); setReassignFor(null); }

    const byRole = allTasks.filter(function(t){ return queueRole === 'All Roles' ? true : t.role === queueRole; });
    const byOem = byRole.filter(function(t){ return queueOem.length === 0 ? true : queueOem.indexOf(t.oem) >= 0; });
    const filtered = byOem.filter(function(t){ return queueStatus === 'All' ? true : t.status === queueStatus; });

    // counts for the current role scope
    const open = byRole.filter(function(t){ return t.status === 'Open'; }).length;
    const inReview = byRole.filter(function(t){ return t.status === 'In Progress' || t.status === 'In Progress'; }).length;
    const waiting = byRole.filter(function(t){ return t.status === 'Pending Data' || t.status === 'Pending Data'; }).length;
    const overdue = byRole.filter(function(t){ var c = t.status === 'Resolved' || t.status === 'Closed' || t.status === 'Dismissed' || t.status === 'Resolved' || t.status === 'Closed' || t.status === 'Dismissed'; return !c && t.ageDays > t.slaDays; }).length;
    const doneWeek = byRole.filter(function(t){ return t.status === 'Resolved' || t.status === 'Closed' || t.status === 'Resolved' || t.status === 'Closed'; }).length;

    // per-OEM summary chips (always full scope, ignores OEM filter)
    // OEM workload chips — driven from Reference Data → OEM / Customer List (single source of truth).
    // Adding or removing an OEM in Reference Data automatically updates this chip list.
    const OEM_LIST = oemKeys.filter(function(k){ return k !== 'UNKNOWN'; });
    const oemSummary = OEM_LIST.map(function(o){
      const items = allTasks.filter(function(t){ return t.oem === o; });
      const openish = items.filter(function(t){ return t.status === 'Open' || t.status === 'In Progress' || t.status === 'In Progress' || t.status === 'Pending Data' || t.status === 'Pending Data'; }).length;
      const od = items.filter(function(t){ var c = t.status === 'Resolved' || t.status === 'Closed' || t.status === 'Dismissed' || t.status === 'Resolved' || t.status === 'Closed' || t.status === 'Dismissed'; return !c && t.ageDays > t.slaDays; }).length;
      return { oem: o, openCount: openish, overdue: od };
    }).filter(function(rs){ return rs.openCount > 0 || rs.overdue > 0; });

    // resolve the selected task against the override-applied list so the detail panel always
    // shows its latest status/assignee after an action.
    const selBase = selectedTask || filtered[0] || byRole[0] || allTasks[0];
    const sel = selBase ? (allTasks.filter(function(t){ return t.id === selBase.id; })[0] || selBase) : null;
    const selSla = sel ? slaInfo(sel) : null;
    const selClosed = sel ? (sel.status === 'Completed' || sel.status === 'Dismissed') : false;

    return <div className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Action Queues</h1><p className="text-gray-500">Shared follow-up board. Any teammate can pick up, complete, or close out flagged items. Tasks are tagged by OEM so the right teammate sees them first, but anyone on the team can take action. Every move is visible to the team and audit-logged.</p></div><button onClick={function(){ setCreateTaskOpen(true); }} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">+ Create Task</button></div>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-4"><StatCard title="Open" value={String(open)} subtitle="Not yet started" /><StatCard title="In Progress" value={String(inReview)} subtitle="Being worked" tone="blue" /><StatCard title="Pending Data" value={String(waiting)} subtitle="Awaiting info" tone="orange" /><StatCard title="Overdue" value={String(overdue)} subtitle="Past SLA" tone="red" /><StatCard title="Resolved This Week" value={String(doneWeek)} subtitle="Closed out" tone="green" /></div>

    {liveQueueCount > 0 && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-900 flex items-start gap-2"><span>📨</span><span><span className="font-bold">{liveQueueCount} task(s) routed live this session</span> from Service Price Review — <span className="font-semibold">Send to Manager</span> creates a sign-off task in the Pricing Admin queue, and <span className="font-semibold">Request Cost Data</span> creates a COGS task in the Admin queue. They appear at the top of the list below, owned and SLA-tracked. In production these persist server-side and notify the owner.</span></div>}

    {actedCount > 0 && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 flex items-start gap-2"><span>⚡</span><span><span className="font-bold">{actedCount} task(s) acted on this session</span> — Approve/Complete, Start/Take, Reassign, and Reject all update the task live (status, assignee, and a stamped action note shown in the detail panel). Closed tasks lock their buttons. In production each transition is persisted and written to Audit History.</span></div>}

    <div style={{position:"sticky",top:0,zIndex:30,background:"#f9fafb",paddingTop:"12px",paddingBottom:"8px",marginBottom:"4px"}}>
    <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center justify-between mb-3"><div><div className="text-xs uppercase tracking-wide text-gray-500">Workload by OEM · click to filter (multi-select)</div><div className="text-xs text-gray-400 mt-0.5">Only OEMs with at least one active task are shown. If an OEM is not listed, there is no open workload assigned to it at this time.</div></div>{queueOem.length > 0 && <button onClick={function(){ setQueueOem([]); setSelectedTask(null); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Clear filter ({queueOem.length} selected)</button>}<button onClick={function(){ setOemPanelOpen(function(v){ return !v; }); }} title={oemPanelOpen ? 'Collapse Workload by OEM' : 'Expand Workload by OEM'} className="ml-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md px-2 py-1 transition-colors" style={{flexShrink:0}}>{oemPanelOpen ? <React.Fragment><span style={{fontSize:'10px'}}>▲</span> Collapse</React.Fragment> : <React.Fragment><span style={{fontSize:'10px'}}>▼</span> Expand</React.Fragment>}</button></div>{oemPanelOpen && <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mt-1">{oemSummary.map(function(rs){ var active = queueOem.indexOf(rs.oem) >= 0; return <button key={rs.oem} onClick={function(){ setQueueOem(function(prev){ var arr = Array.isArray(prev) ? prev : []; return active ? arr.filter(function(o){ return o !== rs.oem; }) : arr.concat([rs.oem]); }); setSelectedTask(null); }} className={'text-left rounded-xl border p-3 transition-all ' + (active ? 'border-blue-500 ring-2 ring-offset-1 ring-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300')}><div className="text-sm font-semibold text-gray-900">{rs.oem}</div><div className="flex items-center gap-2 mt-2"><span className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">{rs.openCount} active</span>{rs.overdue > 0 && <span className="bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-xs font-medium">{rs.overdue} overdue</span>}</div></button>; })}{oemSummary.length === 0 && <div className="col-span-full text-sm text-gray-500 text-center py-4">No active OEM workload right now.</div>}</div>}</div>

      <div className="flex flex-wrap items-center gap-3 pt-2"><div className="flex items-center gap-2"><span className="text-xs text-gray-500 uppercase tracking-wide">Role</span><select value={queueRole} onChange={function(e){ setQueueRole(e.target.value); setSelectedTask(null); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{roles.map(function(r){ return <option key={r} value={r}>{r}</option>; })}</select></div><div className="flex gap-2 flex-wrap">{statuses.map(function(s){ return <button key={s} onClick={function(){ setQueueStatus(s); }} className={(queueStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700') + ' rounded-lg px-3 py-2 text-sm'}>{s}</button>; })}</div></div>
    </div>{/* /sticky-aq-header */}

    <div style={{marginBottom:"16px"}}>{(function(){var fp=priceRows.filter(function(p){ return !!p.reviewFlag; });if(fp.length===0) return null;return <div style={{background:"#fffbeb",border:"1px solid #fbbf24",borderRadius:"12px",padding:"16px"}}><div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}><span style={{fontSize:"16px"}}>🔖</span><span style={{fontWeight:700,color:"#92400e",fontSize:"15px"}}>Price Review — Flagged</span><span style={{background:"#fbbf24",color:"#78350f",borderRadius:"9999px",fontSize:"11px",fontWeight:700,padding:"2px 8px"}}>{fp.length}</span><span style={{fontSize:"12px",color:"#b45309"}}>parts waiting for pricing decision</span></div><div style={{display:"flex",flexDirection:"column",gap:"6px"}}>{fp.map(function(p){return <div key={p.id} style={{background:"#fff",border:"1px solid #fde68a",borderRadius:"8px",padding:"10px 14px",display:"flex",alignItems:"center",gap:"12px",cursor:"pointer"}} onClick={function(){ setActiveTab("Service Price Review"); setSelectedPrice(p); setPriceFilter("Flagged"); }}><span style={{background:"#fef3c7",color:"#92400e",borderRadius:"6px",padding:"2px 8px",fontSize:"11px",fontWeight:600}}>{p.oem}</span><span style={{fontWeight:600,color:"#1f2937",fontSize:"13px"}}>{p.jss}</span><span style={{color:"#6b7280",fontSize:"12px",flex:1}}>{p.desc}</span>{p.reviewNote ? <span style={{fontSize:"11px",color:"#b45309",fontStyle:"italic",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{p.reviewNote}"</span> : null}<span style={{fontSize:"11px",color:"#9ca3af"}}>{p.reviewFlaggedAt ? new Date(p.reviewFlaggedAt).toLocaleDateString() : ""}</span><span style={{color:"#2563eb",fontSize:"12px",fontWeight:600,whiteSpace:"nowrap"}}>Open in SPR →</span></div>;})}</div></div>;})()}</div><div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Priority</th><th className="text-left p-3">Task</th><th className="text-left p-3">Suggested Owner</th><th className="text-left p-3">Status</th><th className="text-left p-3">SLA</th><th className="text-left p-3">Assignee</th></tr></thead><tbody>{filtered.map(function(t){ var s = slaInfo(t); return <tr key={t.id} onClick={function(){ setSelectedTask(t); }} className={'border-t border-gray-100 cursor-pointer ' + (sel && sel.id === t.id ? 'bg-blue-50' : 'hover:bg-blue-50')}><td className="p-3"><Badge tone={t.priority}>{t.priority}</Badge></td><td className="p-3"><div className="font-medium text-gray-900 max-w-xs truncate flex items-center gap-2">{t.title}{t.live && <span className="bg-green-100 text-green-800 border border-green-200 rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap">LIVE</span>}</div><div className="text-xs text-gray-500">{t.source} · {t.oem}</div></td><td className="p-3 text-xs">{t.role}</td><td className="p-3"><StatusBadge status={t.status} /></td><td className={'p-3 text-xs ' + s.tone}>{s.label}</td><td className="p-3 text-xs">{t.assignee}</td></tr>; })}</tbody></table></div>{filtered.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No tasks in this view.</div>}</div>

    <div style={{position:"sticky",top:"160px",maxHeight:"calc(100vh - 176px)",overflowY:"auto",alignSelf:"start"}} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">{sel ? <React.Fragment><div><div className="text-xs text-gray-500 uppercase tracking-wide">Task Detail</div><div className="flex items-center gap-2 mt-1 flex-wrap"><Badge tone={sel.priority}>{sel.priority}</Badge><StatusBadge status={sel.status} /></div><h2 className="text-base font-bold text-gray-900 mt-2">{sel.title}</h2><p className="text-sm text-gray-500 mt-1">{sel.source} · {sel.oem} · JSS {sel.jss}</p></div><div className="grid grid-cols-2 gap-2 text-sm"><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">Suggested Owner</div><div className="font-medium text-xs">{sel.role}</div></div><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">Assignee</div><div className="font-medium text-xs">{sel.assignee}</div></div><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">SLA</div><div className={'font-medium text-xs ' + selSla.tone}>{selSla.label}</div></div><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">Source Module</div><div className="font-medium text-xs">{sel.source}</div></div></div><div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><div className="text-xs text-blue-700 uppercase tracking-wide">AI Suggested Action</div><div className="font-bold text-blue-900 mt-1">{sel.suggestion}</div><div className="text-sm text-blue-800 mt-2">{sel.reason}</div><div className="text-xs text-blue-600 mt-2 italic">Suggestion only — any teammate can pick this up and make the final call.</div></div>{sel.actionNote && <div className="bg-green-50 border border-green-200 rounded-xl p-3"><div className="text-xs text-green-700 uppercase tracking-wide">Last Action</div><div className="text-sm text-green-900 mt-0.5">{sel.actionNote}</div><div className="text-xs text-green-600 mt-1">by {sel.actionBy} · {sel.actionTs}</div></div>}<div className="flex flex-col gap-2"><button onClick={function(){ doStartTask(sel); }} disabled={selClosed || sel.status === 'In Progress'} className={((selClosed || sel.status === 'In Progress') ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700') + ' w-full rounded-lg py-2 text-sm font-semibold'}>▶ Start / Take</button><div className="grid grid-cols-2 gap-2"><button onClick={function(){ doApproveTask(sel); }} disabled={selClosed} className={(selClosed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700') + ' rounded-lg py-2 text-sm font-semibold'}>✔ {sel.status === 'Pending Data' ? 'Mark Received' : 'Complete'}</button><button onClick={function(){ setDismissFor(sel); }} disabled={selClosed} className={(selClosed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700') + ' rounded-lg py-2 text-sm font-semibold'}>✕ Dismiss</button></div><button onClick={function(){ setReassignFor(sel); }} disabled={selClosed} className={(selClosed ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'border border-gray-300 text-gray-600 hover:bg-gray-50') + ' w-full rounded-lg py-2 text-sm font-medium'}>↩ Reassign</button></div>{selClosed && <div className="text-xs text-gray-400 text-center">This task is finalized ({sel.status}). Reopening is disabled in the prototype.</div>}<button onClick={function(){ var p = parts.filter(function(x){ return x.jss === sel.jss; })[0] || { jss: sel.jss, oem: sel.oem, desc: sel.title, customerPart: sel.customerPart || '—' }; setSourceHistoryFor(p); }} className="w-full bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">Open Source Record &amp; History</button></React.Fragment> : <div className="text-sm text-gray-500">Select a task to see details.</div>}</div></div>{reassignFor && <ReassignModal task={reassignFor} onApply={applyReassign} onClose={function(){ setReassignFor(null); }} />}{dismissFor && <DismissModal task={dismissFor} onApply={doDismissTask} onClose={function(){ setDismissFor(null); }} />}{createTaskOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"><div className="p-5 border-b border-gray-200 flex justify-between items-center"><div><h2 className="text-xl font-bold text-gray-900">Create Task</h2><p className="text-sm text-gray-500 mt-1">Manually add a follow-up task to the Action Queue.</p></div><button onClick={function(){ setCreateTaskOpen(false); }} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button></div><div className="p-5 space-y-4"><div><label className="block text-xs font-medium text-gray-700 mb-1">Task Title <span className="text-red-500">*</span></label><input type="text" value={newTask.title} onChange={function(e){ setNewTask(Object.assign({}, newTask, { title: e.target.value })); }} placeholder="e.g. Follow up with GM on missing EOPs" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-700 mb-1">OEM <span className="text-red-500">*</span></label><select value={newTask.oem} onChange={function(e){ setNewTask(Object.assign({}, newTask, { oem: e.target.value })); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select OEM...</option><option value="General / Multi-OEM">General / Multi-OEM</option>{oemKeys.map(function(o){ return <option key={o} value={o}>{o}</option>; })}</select></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Related Part (JSS)</label><input type="text" value={newTask.relatedPart} onChange={function(e){ setNewTask(Object.assign({}, newTask, { relatedPart: e.target.value })); }} placeholder="Optional — e.g. 3135520-A" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-700 mb-1">Priority <span className="text-red-500">*</span></label><select value={newTask.priority} onChange={function(e){ setNewTask(Object.assign({}, newTask, { priority: e.target.value })); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Assign To <span className="text-red-500">*</span></label><select value={newTask.assignTo} onChange={function(e){ setNewTask(Object.assign({}, newTask, { assignTo: e.target.value })); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="Admin">Admin</option><option value="VP">VP</option><option value="Director / GKAM">Director / GKAM</option><option value="Manager">Manager</option><option value="Pricing Admin">Pricing Admin</option><option value="Read Only">Read Only</option></select></div></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label><input type="date" value={newTask.dueDate} onChange={function(e){ setNewTask(Object.assign({}, newTask, { dueDate: e.target.value })); }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div><div><label className="block text-xs font-medium text-gray-700 mb-1">Description / Notes <span className="text-red-500">*</span></label><textarea value={newTask.notes} onChange={function(e){ setNewTask(Object.assign({}, newTask, { notes: e.target.value })); }} placeholder="Describe what needs to be done and why..." rows="4" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" /></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900"><span className="font-semibold">Source:</span> Manual Entry · <span className="font-semibold">Status:</span> Open · <span className="font-semibold">Task ID:</span> auto-generated · This task will be logged to Audit History.</div></div><div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-2"><button onClick={function(){ setCreateTaskOpen(false); setNewTask({ title: '', oem: '', relatedPart: '', priority: 'Medium', assignTo: 'Manager', dueDate: '', notes: '' }); }} className="bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-300">Cancel</button><button onClick={submitNewTask} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">Create Task</button></div></div></div>}</div>;
  

// ---------- ACTION QUEUES: Reassign drawer ----------
  // Lets a manager move a task to a different owner role / named assignee with a short note.
  function SourceHistoryModal(props){
    var p = props.part;
    if(!p) return null;
    function close(){ props.onClose(); }
    var history = [];
    try {
      var all = (typeof liveAudit !== 'undefined' ? liveAudit : []).concat(typeof rawAudit !== 'undefined' ? rawAudit : []);
      history = all.filter(function(e){ return String(e.target||'').indexOf(p.jss) >= 0; });
    } catch(e){ history = []; }
    var dec = archiveDecisions && archiveDecisions[p.id];
    if(dec){ history.unshift({ id:'AD-'+p.id, ts: dec.ts || 'Recent', user: dec.user || currentUser.name, role:'—', action:'ARCHIVE DECISION', module:'Archive Review', target:'JSS '+p.jss, before:'—', after: dec.status, note: dec.reason || '' }); }
    history.sort(function(a,b){ return a.ts < b.ts ? 1 : -1; });
    // Build sourceFiles from real import audit entries for this part
    var importEntries = rawAudit.filter(function(a){ return a.action === 'Import' && a.jss && a.jss.split(',').map(function(s){return s.trim();}).indexOf(part.jss) !== -1; });
    var sourceFiles = importEntries.length > 0
      ? importEntries.map(function(a){ return { name: a.note || 'Import', ts: a.ts ? new Date(a.ts).toLocaleString() : '—', rows: a.jss || '' }; })
      : [ { name:'No import history found', ts:'—', rows:'Use Import Wizard to log source files' } ];
    return <React.Fragment>
      <div onClick={close} className="fixed inset-0 bg-black/40 z-40"></div>
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-400">Source Files & History</div>
            <div className="font-bold text-gray-900 text-lg mt-0.5">JSS {p.jss}</div>
            <div className="text-sm text-gray-500">{p.oem} · {p.desc || '—'}</div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-5">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Part Record (Live)</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div><span className="text-gray-500">Customer Part:</span> <span className="font-medium">{p.customerPart || '—'}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{p.active || '—'}</span></div>
              <div><span className="text-gray-500">Demand:</span> <span className="font-medium">{p.demand != null ? p.demand : '—'}</span></div>
              <div><span className="text-gray-500">Backlog:</span> <span className="font-medium">{p.backlog != null ? p.backlog : '—'}</span></div>
              <div><span className="text-gray-500">Service EOP:</span> <span className="font-medium">{p.serviceEop || '—'}</span></div>
              <div><span className="text-gray-500">Price:</span> <span className="font-medium">{p.price ? '$' + p.price : '—'}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Plant:</span> <span className="font-medium">{p.plant || '—'}</span></div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Source Files ({sourceFiles.length})</div>
            <div className="space-y-2">
              {sourceFiles.map(function(f,i){ return <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"><div className="flex items-center gap-2"><span>📄</span><div><div className="font-medium text-gray-900">{f.name}</div><div className="text-xs text-gray-500">{f.rows}</div></div></div><div className="text-xs text-gray-400">{f.ts}</div></div>; })}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Change History ({history.length})</div>
            {history.length === 0 ? <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-4 border border-gray-200">No recorded changes for this part yet.</div> :
              <div className="space-y-2">{history.map(function(e){
                return <div key={e.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">{e.action}</div>
                    <div className="text-xs text-gray-400">{e.ts}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{e.module} · {e.user}{e.role ? ' (' + e.role + ')' : ''}</div>
                  <div className="text-xs text-gray-700 mt-2"><span className="text-gray-400">Before:</span> {e.before} <span className="text-gray-400 ml-2">→ After:</span> {e.after}</div>
                  {e.note ? <div className="text-xs text-gray-500 italic mt-1">{e.note}</div> : null}
                </div>;
              })}</div>
            }
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200">Close</button>
        </div>
      </div>
    </React.Fragment>;
  }

  function ReassignModal(props) {
    const task = props.task;
    const PEOPLE = ['Unassigned', currentUser.name, 'Harry Lee', 'Patrick Kennedy', 'Tom Lickert', 'Yusuki Yamaski', 'Scott Hawkins', 'Michelle Valls', 'Sarah Florka', 'Brian Hyttinen', 'Mike Wild', 'Chad Ritz', 'Lance Bertelle', 'Li Jing', 'Jeanete Gonzalez', 'Anaidh Lopez', 'Ernest Ruiz'];
    const [assignee, setAssignee] = React.useState(task.assignee || 'Unassigned');
    const [note, setNote] = React.useState('');
    function close(){ props.onClose(); }
    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Reassign Task</div><h2 className="text-lg font-bold text-gray-900 mt-1 max-w-xs">{task.title}</h2><p className="text-sm text-gray-500 mt-0.5">{task.source} · {task.oem} · JSS {task.jss}</p></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4"><div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">Current owner role: <span className="font-semibold text-gray-800">{task.role}</span> · current assignee: <span className="font-semibold text-gray-800">{task.assignee}</span></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Assign to person</label><select value={assignee} onChange={function(e){ setAssignee(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{PEOPLE.map(function(p){ return <option key={p} value={p}>{p}</option>; })}</select></div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Note (optional)</label><textarea value={note} onChange={function(e){ setNote(e.target.value); }} rows={3} placeholder="Why is this being reassigned?" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></textarea></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Reassigning is stamped with your name and timestamp and recorded to the task's history (and Audit History in production).</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={function(){ props.onApply(task, assignee, note.trim()); }} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">Apply Reassignment</button></div></div></React.Fragment>;
  }

  // ---------- ACTION QUEUES: Dismiss drawer ----------
  // Lets a teammate close out a follow-up task with a one-line reason. Logged to history.
  function DismissModal(props) {
    const task = props.task;
    const [reason, setReason] = React.useState('');
    function close(){ props.onClose(); }
    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Dismiss Task</div><h2 className="text-lg font-bold text-gray-900 mt-1 max-w-xs">{task.title}</h2><p className="text-sm text-gray-500 mt-0.5">{task.source} · {task.oem} · JSS {task.jss}</p></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4"><div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">Dismissing closes this follow-up without action. Use this when the suggestion no longer applies, the issue resolved itself, or it's a duplicate of another task.</div><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Reason for dismissing <span className="text-red-600">*</span></label><textarea value={reason} onChange={function(e){ setReason(e.target.value); }} rows={4} placeholder="e.g. Service contract still active until Q3 — keep part live. Or: duplicate of T-PR-1124." className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></textarea></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Your reason is stamped to the task and visible to the whole team in Audit History — so teammates understand why this was closed.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={function(){ if (reason.trim()) { props.onApply(task, reason.trim()); } }} disabled={!reason.trim()} className={(reason.trim() ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed') + ' rounded-lg px-4 py-2 text-sm font-medium'}>Dismiss Task</button></div></div></React.Fragment>;
  }
}

export { ActionQueues };
