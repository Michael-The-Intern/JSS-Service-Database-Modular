// components/admin/AdminRoles.jsx
// Admin Roles management — assign roles and permissions to users.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';


function AdminRoles() {
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
    ADMIN_PERMS, ADMIN_PERM_LABELS
  } = ctx;
    // ---- GATING: only Admin may change roles/permissions. Everyone else is read-only. ----
    const ro = !canEdit();
    // toggle a single permission checkoff for a role
    function togglePerm(roleId, perm){ if (ro) return; setAdminRoles(function(prev){ return prev.map(function(r){ return r.id === roleId ? Object.assign({}, r, { [perm]: !r[perm] }) : r; }); }); }
    function openAdd(){ if (ro) return; setAdminModal({ mode: 'add', id: null, role: '', editParts: false, approvePrice: false, approveImport: false, adminOverride: false }); }
    function openEdit(r){ if (ro) return; setAdminModal(Object.assign({ mode: 'edit' }, r)); }

    // a checkoff cell — clickable for Admins, static (display-only) when read-only

function Check(props){
      if (ro) return <td className="p-3 text-center"><span title={props.on ? 'Granted' : 'Not granted'} className={'w-7 h-7 rounded-md border inline-flex items-center justify-center ' + (props.on ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-300')}>{props.on ? '✓' : '—'}</span></td>;
      return <td className="p-3 text-center"><button onClick={function(){ togglePerm(props.roleId, props.perm); }} title={(props.on ? 'Granted' : 'Not granted') + ' — click to toggle'} className={'w-7 h-7 rounded-md border inline-flex items-center justify-center transition-colors ' + (props.on ? 'bg-green-500 border-green-600 text-white hover:bg-green-600' : 'bg-gray-50 border-gray-300 text-gray-300 hover:bg-gray-100')}>{props.on ? '✓' : '—'}</button></td>;
    }

    const totalGranted = adminRoles.reduce(function(a, r){ return a + ADMIN_PERMS.filter(function(p){ return r[p]; }).length; }, 0);

    return <div className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Admin &amp; Roles</h1><p className="text-gray-500">Manage roles, permissions, approval routing, rules, and audit settings.</p></div>{!ro && <button onClick={openAdd} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">+ Add Role</button>}</div>

    {ro ? <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"><span className="text-xl leading-none">🔒</span><div><div className="font-bold text-amber-900 text-sm">Read-only — you need the <span className="underline">Admin</span> role to manage roles &amp; permissions</div><p className="text-sm text-amber-800 mt-0.5">You're signed in as <span className="font-semibold">{currentUser.role}</span>. You can view the role/permission matrix, but creating roles, editing them, and toggling permissions is restricted to Admins. Use the role switcher (top right) to demo Admin access. <span className="font-semibold">{totalGranted}</span> permissions currently granted across {adminRoles.length} roles.</p></div></div> : <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900"><span className="font-bold">How to use this:</span> Click any checkoff in the matrix to grant or revoke that permission for a role — green ✓ means granted, grey — means not. Use <span className="font-semibold">+ Add Role</span> to create a new role, or <span className="font-semibold">Edit</span> to rename a role and set its permissions at once. Every change here is audit-logged. <span className="font-semibold">{totalGranted}</span> permissions currently granted across {adminRoles.length} roles.</div>}

    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Role</th>{ADMIN_PERMS.map(function(p){ return <th key={p} className="p-3 text-center">{ADMIN_PERM_LABELS[p]}</th>; })}{!ro && <th className="p-3 text-right">Edit</th>}</tr></thead><tbody>{adminRoles.map(function(r){ return <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50"><td className="p-3 font-medium">{r.role}</td>{ADMIN_PERMS.map(function(p){ return <Check key={p} roleId={r.id} perm={p} on={r[p]} />; })}{!ro && <td className="p-3 text-right"><button onClick={function(){ openEdit(r); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button></td>}</tr>; })}</tbody></table></div></div>

    <div className="text-xs text-gray-400">Tip: the <span className="font-semibold">Admin Override</span> permission should stay limited to a small number of roles — it bypasses normal approval gates.</div>

    {adminModal && <AdminRoleModal />}</div>;
  }

  // Add/Edit-role drawer for Admin & Roles. Lets you name the role and set every permission checkoff at once.

function AdminRoleModal() {
    if (!adminModal) return null;
    function setField(k, v){ setAdminModal(function(prev){ return Object.assign({}, prev, { [k]: v }); }); }
    function close(){ setAdminModal(null); }
    function save(){
      var name = String(adminModal.role).trim();
      if (!name) return;
      if (adminModal.mode === 'add') {
        var newRole = { id: 'AR-' + Date.now(), role: name, editParts: adminModal.editParts, approvePrice: adminModal.approvePrice, approveImport: adminModal.approveImport, adminOverride: adminModal.adminOverride };
        setAdminRoles(function(prev){ return prev.concat([newRole]); });
      } else {
        setAdminRoles(function(prev){ return prev.map(function(r){ return r.id === adminModal.id ? { id: r.id, role: name, editParts: adminModal.editParts, approvePrice: adminModal.approvePrice, approveImport: adminModal.approveImport, adminOverride: adminModal.adminOverride } : r; }); });
      }
      setAdminModal(null);
    }
    function remove(){ setAdminRoles(function(prev){ return prev.filter(function(r){ return r.id !== adminModal.id; }); }); setAdminModal(null); }
    const noName = String(adminModal.role).trim() === '';
    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">{adminModal.mode === 'add' ? 'Add Role' : 'Edit Role'}</div><h2 className="text-lg font-bold text-gray-900 mt-1">Admin &amp; Roles</h2></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4"><div><label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Role Name</label><input value={adminModal.role} onChange={function(e){ setField('role', e.target.value); }} placeholder="e.g. Quality Lead" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div><div><div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Permissions</div><div className="space-y-2">{ADMIN_PERMS.map(function(p){ return <button key={p} onClick={function(){ setField(p, !adminModal[p]); }} className={'w-full flex items-center justify-between rounded-lg border p-3 transition-colors ' + (adminModal[p] ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50')}><span className="text-sm font-medium text-gray-900">{ADMIN_PERM_LABELS[p]}</span><span className={'w-6 h-6 rounded-md border inline-flex items-center justify-center ' + (adminModal[p] ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-300')}>{adminModal[p] ? '✓' : ''}</span></button>; })}</div></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Role and permission changes are audit-logged and take effect on the next sign-in.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2">{adminModal.mode === 'edit' && <button onClick={remove} className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm font-medium">Delete</button>}<div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={save} disabled={noName} className={(noName ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white') + ' rounded-lg px-4 py-2 text-sm font-medium'}>{adminModal.mode === 'add' ? 'Add Role' : 'Save Changes'}</button></div></div></React.Fragment>;
  }

  // ---------- ACTION QUEUES: role-based work lists ----------
  // Every task carries: owner role, status, SLA age, source module, and the AI's suggested action + reason.
  // Status flow: Open → In Progress → Pending Data→ Resolved/Closed (or Dismissed/Reassigned).
  const rawTasks = []

export { AdminRoles };