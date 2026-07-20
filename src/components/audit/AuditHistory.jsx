// components/audit/AuditHistory.jsx
// Audit History — full change log with filters and export.

import React from 'react';
import * as XLSX from 'xlsx';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { SearchBox } from '../shared/SearchBox.jsx';
import { StatCard } from '../shared/StatCard.jsx';


function AuditHistory() {
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
    const actionTones = {
      'IMPORT COMMIT': 'bg-blue-100 text-blue-800 border-blue-200',
      'IMPORT ROLLBACK': 'bg-red-100 text-red-800 border-red-200',
      'ORDER Resolved': 'bg-green-100 text-green-800 border-green-200',
      'ORDER Dismissed': 'bg-red-100 text-red-800 border-red-200',
      'PRICE CHANGE': 'bg-amber-100 text-amber-800 border-amber-200',
      'ARCHIVE': 'bg-gray-100 text-gray-700 border-gray-200',
      'ARCHIVE RESTORE': 'bg-green-100 text-green-800 border-green-200',
      'STATUS CHANGE': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'FLAG RAISED': 'bg-orange-100 text-orange-800 border-orange-200',
      'QUARANTINE': 'bg-orange-100 text-orange-800 border-orange-200',
      'RULE EDIT': 'bg-blue-100 text-blue-800 border-blue-200',
      'RECLASSIFY': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'ROLE CHANGE': 'bg-purple-100 text-purple-800 border-purple-200',
      'PRICE Resolved': 'bg-green-100 text-green-800 border-green-200',
      'SENT TO MANAGER': 'bg-amber-100 text-amber-800 border-amber-200',
      'COST DATA REQUESTED': 'bg-purple-100 text-purple-800 border-purple-200'
    };

function ActionBadge(props) { return <span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (actionTones[props.action] || 'bg-gray-100 text-gray-700 border-gray-200')}>{props.action}</span>; }

    // ---- LIVE PRICE DECISIONS → AUDIT ENTRIES ----
    // Every Approve / Send to Manager / Request Cost Data click in Service Price Review writes to
    // priceDecisions (with a full per-part history). Here we flatten that history into real audit
    // entries and merge them into the immutable log, so a pricing action visibly lands in Audit
    // History the moment it's made. In production these are persisted server-side the same way.
    const priceById = parts.reduce(function(acc, p){ acc[p.id] = p; return acc; }, {});
    const statusToAction = { 'Price Resolved': 'PRICE Resolved', 'Sent to Manager': 'SENT TO MANAGER', 'Cost Data Requested': 'COST DATA REQUESTED' };
    const liveAudit = archiveAudit.slice().concat(taskAudit);
    Object.keys(priceDecisions).forEach(function(pid){
      const dec = priceDecisions[pid];
      const part = priceById[pid] || { jss: pid, oem: '', customerPart: '' };
      const hist = (dec && dec.history) ? dec.history : [];
      hist.forEach(function(h, idx){
        liveAudit.push({
          id: 'PD-' + pid + '-' + (hist.length - idx),
          ts: h.ts,
          user: h.by || currentUser.name,
          role: currentUser.role === 'Admin' ? 'Admin' : 'Pricing Admin',
          action: statusToAction[h.status] || 'PRICE CHANGE',
          module: 'Service Price Review',
          target: 'JSS ' + part.jss + (part.oem ? ' · ' + part.oem : ''),
          before: 'Price ' + (priceById[pid] ? priceById[pid].price : '—'),
          after: h.price ? '$' + Number(h.price).toFixed(2) : (h.status === 'Cost Data Requested' ? 'Cost data requested' : 'Pending'),
          reversible: h.status !== 'Cost Data Requested',
          note: h.detail + ' (graded as of ' + h.gradedYear + ')',
          live: true
        });
      });
    });
    // newest first, then the static seed log
    liveAudit.sort(function(a, b){ return a.ts < b.ts ? 1 : -1; });
    const auditLog = liveAudit.concat(rawAudit);

    const actions = ['All'].concat(Object.keys(auditLog.reduce(function(acc, e){ acc[e.action] = true; return acc; }, {})));
    const modules = ['All'].concat(Object.keys(auditLog.reduce(function(acc, e){ acc[e.module] = true; return acc; }, {})));
    const users = ['All'].concat(Object.keys(auditLog.reduce(function(acc, e){ acc[e.user] = true; return acc; }, {})));

    const [localSearch, setLocalSearch] = React.useState('');
    const q = localSearch.trim().toLowerCase();
    const filtered = auditLog.filter(function(e){
      if (auditAction !== 'All' && e.action !== auditAction) return false;
      if (auditModule !== 'All' && e.module !== auditModule) return false;
      if (auditUser !== 'All' && e.user !== auditUser) return false;
      if (q && [e.target, e.note, e.before, e.after, e.action, e.module, e.user].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    const today = auditLog.filter(function(e){ return e.ts.indexOf('2026-05-29') === 0; }).length;
    const reversible = auditLog.filter(function(e){ return e.reversible; }).length;
    const byAI = auditLog.filter(function(e){ return e.user === 'AI Engine'; }).length;
    const liveCount = liveAudit.length;
    const sel = selectedAudit || filtered[0] || auditLog[0];
    function doRollBack(entry) {
      if (!entry || !entry.reversible) return;
      var jssMatch = String(entry.target || '').match(/JSS\s+([\w\-]+)/);
      var jss = jssMatch ? jssMatch[1] : null;
      var ts = new Date().toISOString().slice(0,16).replace('T',' ');

      // Restore part status / archive status based on action type
      if (jss) {
        var act = (entry.action || '').toUpperCase();
        if (act === 'ARCHIVE DECISION' || act === 'ARCHIVE' || act === 'ARCHIVE RESTORE' || act === 'ROUTED FOR APPROVAL') {
          setArchiveDecisions(function(prev){
            var n = Object.assign({}, prev);
            if (n[jss]) { n[jss] = Object.assign({}, n[jss], { status: entry.before, reason: 'Rolled back from Audit History' }); }
            return n;
          });
        }
        if (act === 'STATUS CHANGE' || act === 'FLAG RAISED' || act === 'ARCHIVE DECISION' || act === 'ARCHIVE') {
          setRawParts(function(prev){
            return prev.map(function(p){
              if (p.jss !== jss) return p;
              return Object.assign({}, p, { active: entry.before, archiveStatus: entry.before });
            });
          });
        }
      }

      // Mark original entry as no longer reversible and log a reversal entry
      var reversalEntry = {
        id: 'RVRT-' + Date.now(),
        ts: ts,
        user: currentUser.name,
        role: currentUser.role || 'Manager',
        action: 'IMPORT ROLLBACK',
        module: entry.module || 'Audit History',
        target: entry.target,
        before: entry.after,
        after: entry.before,
        reversible: false,
        note: 'Reversal of entry ' + entry.id + ' — restored to: ' + entry.before,
        live: true
      };
      setArchiveAudit(function(prev){ return [reversalEntry].concat(prev); });

      // Deselect so the panel refreshes
      setSelectedAudit(null);
      alert('\u2713 Rolled back: ' + entry.target + ' restored to "' + entry.before + '"');
    }


    return <div className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Audit History</h1><p className="text-gray-500">The immutable record of every change — imports, price/status edits, archives, flags, orders, rules, and role changes. Nothing is ever silently deleted; most actions are reversible from here.</p></div><button onClick={function(){ var EXP_COLS = [{header:'ID',key:'id'},{header:'Timestamp',key:'ts'},{header:'User',key:'user'},{header:'Role',key:'role'},{header:'Action',key:'action'},{header:'Module',key:'module'},{header:'Target',key:'target'},{header:'Before',key:'before'},{header:'After',key:'after'},{header:'Reversible',key:'reversible'},{header:'Note',key:'note'}]; var rows = [EXP_COLS.map(function(c){ return c.header; })].concat(auditLog.map(function(e){ return EXP_COLS.map(function(c){ var v = e[c.key]; return (v === undefined || v === null) ? '' : (c.key === 'reversible' ? (v ? 'Yes' : 'No') : String(v)); }); })); var ws = XLSX.utils.aoa_to_sheet(rows); var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Audit Log'); XLSX.writeFile(wb, 'audit-log-' + Date.now() + '.xlsx'); }} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">Export Log</button></div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><StatCard title="Total Entries" value={String(auditLog.length)} subtitle={liveCount > 0 ? liveCount + ' live this session' : 'Across all modules'} /><StatCard title="Changes Today" value={String(today)} subtitle={new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})} tone="blue" /><StatCard title="Reversible Actions" value={String(reversible) + ' / ' + auditLog.length} subtitle="Can be rolled back" tone="green" /><StatCard title="AI-Generated" value={String(byAI)} subtitle="System flags & reclassifies" tone="indigo" /></div>

    {liveCount > 0 && <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-900 flex items-start gap-2"><span>✅</span><span><span className="font-bold">{liveCount} live pricing decision(s)</span> from Service Price Review are now recorded here — Approve Price, Send to Manager, and Request Cost Data each land in this log automatically (highlighted rows below) with who, when, and the reference year graded under.</span></div>}

    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900"><span className="font-bold">Why this matters:</span> Every action carries who, when, the source module, the exact before → after, and whether it can be undone. AI-generated entries (flags, reclassifies) are logged the same way as human ones — full transparency on what the system did versus what a person decided.</div>

    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-3"><div className="flex-1 min-w-[200px]"><div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Search</div><input value={localSearch} onChange={function(e){ setLocalSearch(e.target.value); }} placeholder="Search target, note, value..." className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div><div><div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Action</div><select value={auditAction} onChange={function(e){ setAuditAction(e.target.value); setSelectedAudit(null); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{actions.map(function(a){ return <option key={a} value={a}>{a}</option>; })}</select></div><div><div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Module</div><select value={auditModule} onChange={function(e){ setAuditModule(e.target.value); setSelectedAudit(null); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{modules.map(function(m){ return <option key={m} value={m}>{m}</option>; })}</select></div><div><div className="text-xs text-gray-500 uppercase tracking-wide mb-1">User</div><select value={auditUser} onChange={function(e){ setAuditUser(e.target.value); setSelectedAudit(null); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">{users.map(function(u){ return <option key={u} value={u}>{u}</option>; })}</select></div>{(auditAction !== 'All' || auditModule !== 'All' || auditUser !== 'All' || localSearch) && <button onClick={function(){ setAuditAction('All'); setAuditModule('All'); setAuditUser('All'); setLocalSearch(''); }} className="bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-sm">Clear</button>}</div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Timestamp</th><th className="text-left p-3">Action</th><th className="text-left p-3">User</th><th className="text-left p-3">Module</th><th className="text-left p-3">Target</th></tr></thead><tbody>{filtered.map(function(e){ return <tr key={e.id} onClick={function(){ setSelectedAudit(e); }} className={'border-t border-gray-100 cursor-pointer ' + (sel && sel.id === e.id ? 'bg-blue-50' : 'hover:bg-blue-50')}><td className="p-3 font-mono text-xs whitespace-nowrap">{e.ts}</td><td className="p-3"><ActionBadge action={e.action} /></td><td className="p-3 text-xs">{e.user}{e.user === 'AI Engine' && <span className="ml-1 text-indigo-600">●</span>}</td><td className="p-3 text-xs">{e.module}</td><td className="p-3 text-xs max-w-xs truncate">{e.target}</td></tr>; })}</tbody></table></div>{filtered.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No audit entries match these filters.</div>}</div>

    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">{sel ? <React.Fragment><div><div className="text-xs text-gray-500 uppercase tracking-wide">Audit Entry</div><div className="flex items-center gap-2 mt-1 flex-wrap"><ActionBadge action={sel.action} />{sel.reversible ? <span className="px-2 py-1 rounded-full text-xs border font-medium bg-green-100 text-green-800 border-green-200">Reversible</span> : <span className="px-2 py-1 rounded-full text-xs border font-medium bg-red-100 text-red-800 border-red-200">Not Reversible</span>}</div><h2 className="text-base font-bold text-gray-900 mt-2">{sel.target}</h2><p className="text-sm text-gray-500 mt-1 font-mono">{sel.ts}</p></div><div className="grid grid-cols-2 gap-2 text-sm"><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">User</div><div className="font-medium text-xs">{sel.user}</div></div><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">Role</div><div className="font-medium text-xs">{sel.role}</div></div><div className="border rounded-lg p-2 col-span-2"><div className="text-xs text-gray-500">Source Module</div><div className="font-medium text-xs">{sel.module}</div></div></div><div className="border border-gray-200 rounded-xl overflow-hidden"><div className="bg-red-50 p-3 border-b border-gray-100"><div className="text-xs text-red-700 uppercase tracking-wide">Before</div><div className="text-sm text-gray-800 mt-0.5">{sel.before}</div></div><div className="bg-green-50 p-3"><div className="text-xs text-green-700 uppercase tracking-wide">After</div><div className="text-sm text-gray-800 mt-0.5">{sel.after}</div></div></div><div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><div className="text-xs text-blue-700 uppercase tracking-wide">Reason / Note</div><div className="text-sm text-blue-800 mt-1">{sel.note}</div></div><div className="grid grid-cols-2 gap-2"><button disabled={!sel.reversible} onClick={function(){ doRollBack(sel); }} className={(sel.reversible ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed') + ' rounded-lg py-2 text-sm font-medium'}>Reverse / Roll Back</button><button onClick={function(){ var tgt = String(sel.target||''); var m = tgt.match(/JSS\s+([\w\-]+)/); var jss = m ? m[1] : null; var p = jss ? (parts.filter(function(x){ return x.jss === jss; })[0]) : null; if(!p) p = { jss: jss || '—', oem: (tgt.split('·')[1]||'').trim() || '—', desc: tgt, customerPart: '—' }; setSourceHistoryFor(p); }} className="bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">Open Source Record</button></div></React.Fragment> : <div className="text-sm text-gray-500">Select an entry to see full detail.</div>}</div></div></div>;
  }

  // ---------- SERVICE PRICE REVIEW ENGINE ----------
  // Pulls every part flagged for pricing, parses price/cost, computes margin, and
  // recommends a target price. The AI suggests — the Pricing Admin approves the final number.
  const PRICE_FLOOR_MARGIN = 0.25;   // company minimum acceptable service margin
  const TARGET_MARGIN = 0.35;        // standard target service margin
  const DEFAULT_MARKUP = 1.45;       // markup applied when no price exists (cost × markup)

  function parseMoney(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).replace(/[^0-9.\-]/g, '');
    if (s === '' || isNaN(parseFloat(s))) return null;
    return parseFloat(s);
  }

  function priceAnalyze(p) {
    var price = parseMoney(p.price);
    var cost = parseMoney(p.cost);
    var hasPrice = price !== null;
    var hasCost = cost !== null;
    var margin = (hasPrice && hasCost && price > 0) ? (price - cost) / price : null;

    // recommended target price = cost grossed up to TARGET_MARGIN, or markup when cost missing
    var target = null;
    if (hasCost) target = cost / (1 - TARGET_MARGIN);
    else if (hasPrice) target = price; // nothing to base a raise on

    var issue, tone, level, note;
    if (!hasPrice && !hasCost) {
      issue = 'NO PRICE / NO COST'; tone = 'gray'; level = 2;
      note = 'Neither service price nor standard cost is on file. Cannot quote or ship. Needs cost data before a price can be set.';
    } else if (!hasPrice) {
      issue = 'MISSING PRICE'; tone = 'red'; level = 1;
      target = cost * DEFAULT_MARKUP;
      note = 'No service price on file while cost is $' + cost.toFixed(2) + '. Suggested price = cost × ' + DEFAULT_MARKUP + ' markup = $' + target.toFixed(2) + ' (' + Math.round((1 - cost / target) * 100) + '% margin).';
    } else if (!hasCost) {
      issue = 'MISSING COST'; tone = 'orange'; level = 2;
      note = 'Price $' + price.toFixed(2) + ' is set but standard cost is missing — margin cannot be verified. Confirm cost from the source file.';
    } else if (margin < 0) {
      issue = 'BELOW COST'; tone = 'red'; level = 1;
      note = 'Price $' + price.toFixed(2) + ' is BELOW cost $' + cost.toFixed(2) + ' — selling at a loss. Raise to at least $' + target.toFixed(2) + ' (' + Math.round(TARGET_MARGIN * 100) + '% margin).';
    } else if (margin < PRICE_FLOOR_MARGIN) {
      issue = 'THIN MARGIN'; tone = 'amber'; level = 1;
      note = 'Margin is ' + Math.round(margin * 100) + '% (floor is ' + Math.round(PRICE_FLOOR_MARGIN * 100) + '%). Suggested raise to $' + target.toFixed(2) + ' to reach the ' + Math.round(TARGET_MARGIN * 100) + '% target.';
    } else {
      issue = 'HEALTHY MARGIN'; tone = 'green'; level = 3;
      note = 'Margin is ' + Math.round(margin * 100) + '% — at or above the floor. No change required; confirm and clear the flag.';
    }
    return { price: price, cost: cost, hasPrice: hasPrice, hasCost: hasCost, margin: margin, target: target, issue: issue, tone: tone, level: level, note: note };
  }

  // ---------- SERVICE PRICE: per-part decision History drawer ----------
  // Shows the running trail of pricing decisions made on a part this session (approve / manager /
  // cost-request), each stamped with who, when, the price, and the reference year graded under.

export { AuditHistory };
