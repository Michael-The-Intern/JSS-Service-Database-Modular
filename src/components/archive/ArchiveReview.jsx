// components/archive/ArchiveReview.jsx
import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';
import { Badge, ArchiveBadge } from '../shared/Badge.jsx';
import { ArchiveSubmitModal } from './ArchiveSubmitModal.jsx';
import { _supa } from '../../lib/supabase.js';
import { StatCard } from '../shared/StatCard.jsx';

var ArchiveReview = React.memo(function ArchiveReview({ mainScrollRef, onOpenDetail, appSelectedPart, parts, archiveDecisions, setArchiveDecisions, manualArchiveIds, partDecisions, setPartDecisions, currentUser, _supaWrite, archiveAudit, setArchiveAudit, archiveMode, setArchiveMode, isArchived, resolvePart, setQueueTasks }) {
    // ---- archive-only state (local — does NOT trigger outer App re-renders) ----
    const [selectedPart, setSelectedPart] = React.useState(null);
    const pageScrollSave = React.useRef(0);
    // Track scroll position continuously
    React.useEffect(function() {
      var el = mainScrollRef && mainScrollRef.current;
      if (!el) return;
      function onScroll() { pageScrollSave.current = el.scrollTop; }
      el.addEventListener('scroll', onScroll, { passive: true });
      return function() { el.removeEventListener('scroll', onScroll); };
    }, []);
    // After EVERY render, if drawer is open, restore scroll before browser paints
    React.useLayoutEffect(function() {
      if (appSelectedPart && mainScrollRef && mainScrollRef.current) {
        mainScrollRef.current.scrollTop = pageScrollSave.current;
      }
    });

    // Compute dqCounts locally (parts is already a prop)
    const dqCounts = {
      family: parts.filter(function(p){ return p.dq && p.dq.type === 'FAMILY'; }).length,
      conflict: parts.filter(function(p){ return p.dq && p.dq.type === 'CONFLICT'; }).length,
      placeholder: parts.filter(function(p){ return p.dq && p.dq.type === 'PLACEHOLDER'; }).length,
      exact: parts.filter(function(p){ return p.dq && p.dq.type === 'EXACT'; }).length,
      unclassified: parts.filter(function(p){ return p.dq && !['FAMILY','CONFLICT','PLACEHOLDER','EXACT'].includes(p.dq.type); }).length,
    };
    const [selectedArchiveIds, setSelectedArchiveIds] = React.useState([]);
    const [archiveExportOpen, setArchiveExportOpen] = React.useState(false);
    const [exportView, setExportView] = React.useState('selected');
    const [archiveSubmitOpen, setArchiveSubmitOpen] = React.useState(false);
    // ---- derive archive rows ----
    const archiveRows = parts.map(function(p, idx) {
      const isManualRouted = manualArchiveIds.indexOf(p.id) >= 0;
      const serviceEopYear = parseInt(p.serviceEop, 10);
      const blocked = !isManualRouted && (p.demand > 0 || p.backlog > 0 || serviceEopYear > 2026 || p.active === 'ACTIVE');
      const ready = !blocked && (isManualRouted || (p.demand === 0 && p.backlog === 0 && serviceEopYear <= 2026));
      const needsReview = isManualRouted ? false : (!ready && !blocked);
      let archiveStatus = ready ? 'Ready to Archive' : blocked ? 'Blocked' : needsReview ? 'Needs Review' : 'Needs Review';
      let reason = ready ? 'No demand, no backlog, and service EOP appears complete.'
        : blocked ? 'Do not archive until demand, backlog, active status, or future service timing is cleared.'
        : 'Missing or uncertain information requires manager confirmation.';
            const decided = archiveDecisions[p.id];
      if (decided) { archiveStatus = decided.status; reason = decided.reason; }
      return Object.assign({}, p, {
        archiveStatus: archiveStatus,
        archiveReason: reason,
        approvalStatus: archiveStatus === 'Archived' ? 'Archived'
          : archiveStatus === 'Ready to Archive' ? 'Not Submitted'
          : archiveStatus === 'Pending Data' ? 'Manager Review'
          : archiveStatus === 'Blocked' ? 'Blocked'
          : archiveStatus === 'Active' ? 'Kept Active'
          : 'Needs Owner Review'
      });
    });

    // ---- stat counts ----
    const counts = archiveRows.reduce(function(acc, r) {
      acc[r.archiveStatus] = (acc[r.archiveStatus] || 0) + 1;
      return acc;
    }, {});
    const nowM = new Date().getMonth(), nowY = new Date().getFullYear();
    const archivedThisMonth = Object.keys(archiveDecisions || {}).filter(function(k) {
      const d = archiveDecisions[k];
      if (!d || d.status !== 'Archived' || !d.ts) return false;
      const dt = new Date(d.ts);
      return dt.getMonth() === nowM && dt.getFullYear() === nowY;
    }).length;

    // ---- selected part ----
    const selectedArchivePart = (selectedPart && archiveRows.find(function(r) { return r.id === selectedPart.id; }))
      || selectedPart || null;
    const selCount = selectedArchiveIds.length;

    // ---- status styles ----
    const statusStyles = {
      'Ready to Archive': 'bg-green-100 text-green-800 border-green-200',
      'Needs Review':     'bg-orange-100 text-orange-800 border-orange-200',
      'Blocked':          'bg-red-100 text-red-800 border-red-200',
      'Pending Data':     'bg-blue-100 text-blue-800 border-blue-200',
      'Active':           'bg-purple-100 text-purple-800 border-purple-200',
      'Archived':         'bg-gray-100 text-gray-700 border-gray-200'
    };

    function ArchiveBadge(props) {
      return (
        <span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (statusStyles[props.status] || statusStyles['Needs Review'])}>
          {props.status}
        </span>
      );
    }

    function CheckRow(props) {
      return (
        <div className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0">
          <span className="text-sm text-gray-700">{props.label}</span>
          <span className={(props.pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') + ' rounded-full px-2 py-1 text-xs font-medium'}>
            {props.pass ? 'PASS' : 'HOLD'}
          </span>
        </div>
      );
    }

    // ---- selection helpers ----
    function toggleSelect(id) {
      setSelectedArchiveIds(function(prev) {
        return prev.indexOf(id) >= 0 ? prev.filter(function(x) { return x !== id; }) : prev.concat([id]);
      });
    }
    const readyRows = archiveRows.filter(function(r) { return r.archiveStatus === 'Ready to Archive'; });
    const allReadySelected = readyRows.length > 0 && readyRows.every(function(r) { return selectedArchiveIds.indexOf(r.id) >= 0; });
    function toggleSelectAllReady() {
      setSelectedArchiveIds(allReadySelected ? [] : readyRows.map(function(r) { return r.id; }));
    }

    // ---- tab filtering ----
    const ARCHIVE_TABS = ['All', 'Ready to Archive', 'Needs Review', 'Blocked', 'Pending Data', 'Archived'];
    const [archiveTab, setArchiveTab] = React.useState('All');
    const tableScrollRef = React.useRef(null);
    const savedScroll = React.useRef({tbl:0, pg:0});
    // Restore scroll position after any selectedArchiveIds re-render
    React.useLayoutEffect(function(){
      var tbl = tableScrollRef.current;
      var pg = (mainScrollRef && mainScrollRef.current);
      if(tbl){ tbl.scrollTop = savedScroll.current.tbl; tbl.scrollLeft = savedScroll.current.tbl_x || 0; }
      if(pg){ pg.scrollTop = savedScroll.current.pg; }
    }, [selectedArchiveIds]);
    // Restore scroll when selected part changes (row click)
    const savedScrollPart = React.useRef({tbl:0, tbl_x:0, pg:0});
    React.useLayoutEffect(function(){
      var tbl = tableScrollRef.current;
      var pg = (mainScrollRef && mainScrollRef.current);
      if(tbl){ tbl.scrollTop = savedScrollPart.current.tbl; tbl.scrollLeft = savedScrollPart.current.tbl_x || 0; }
      if(pg){ pg.scrollTop = savedScrollPart.current.pg; }
    }, [selectedPart]);
    const visibleRows = archiveRows.filter(function(r) {
      // When on Archived tab, always show archived parts regardless of mode
      var modeOk = archiveTab === 'Archived'
        ? isArchived(r)
        : archiveMode === 'all' || (archiveMode === 'archived' ? isArchived(r) : !isArchived(r));
      var tabOk = archiveTab === 'All' || r.archiveStatus === archiveTab;
      return modeOk && tabOk;
    });

    // ---- decide (approve / keep / manager / block) ----
    function decide(part, status, reason) {
      var targetIds = selectedArchiveIds.length > 0 ? selectedArchiveIds.slice() : (part ? [part.id] : []);
      if (targetIds.length === 0) return;
      var targets = archiveRows.filter(function(r) { return targetIds.indexOf(r.id) >= 0; });
      setArchiveDecisions(function(prev) {
        var n = Object.assign({}, prev);
        targetIds.forEach(function(tid) {
          n[tid] = { status: status, reason: reason };
          _supaWrite('archive_decisions', { id: tid + '_' + Date.now(), jss: tid, oem: (targets.find(function(r) { return r.id === tid; }) || {}).oem || '', status: status, reason: reason, user: currentUser.name, ts: new Date().toISOString() });
        });
        savePersistent('archiveDecisions', n);
        return n;
      });
      var statusMap = {
        'Archived':     { status: 'ARCHIVED', archiveStatus: 'Archived',     approvalStatus: 'Approved',        recommendation: 'ARCHIVED' },
        'Active':       { status: 'ACTIVE',   archiveStatus: 'Active',       approvalStatus: 'Kept Active',     recommendation: 'KEEP ACTIVE' },
        'Pending Data': { status: 'REVIEW',   archiveStatus: 'Pending Data', approvalStatus: 'Manager Review',  recommendation: 'TEAM REVIEW' },
        'Blocked':      { status: 'ACTIVE',   archiveStatus: 'Blocked',      approvalStatus: 'Blocked',         recommendation: 'KEEP ACTIVE (LOCKED)' }
      };
      var pdOverlay = statusMap[status] || { archiveStatus: status };
      setPartDecisions(function(prev) {
        var n = Object.assign({}, prev);
        targetIds.forEach(function(tid) {
          n[tid] = Object.assign({}, prev[tid] || {}, pdOverlay, { lastAction: status, lastBy: currentUser.name, lastAt: new Date().toISOString().slice(0, 10) });
        });
        savePersistent('partDecisions', n);
        return n;
      });
      var ts = (function() { var d = new Date(); var p = function(n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); })();
      var actionMap = { 'Archived': 'ARCHIVE Resolved', 'Active': 'KEPT ACTIVE', 'Pending Data': 'ROUTED FOR APPROVAL', 'Blocked': 'ARCHIVE BLOCKED' };
      var entries = targets.map(function(r, i) {
        return { id: 'AR-' + Date.now() + '-' + i, ts: ts, user: currentUser.name, role: currentUser.role, action: actionMap[status] || 'ARCHIVE DECISION', module: 'Archive Review', target: 'JSS ' + r.jss + ' · ' + r.oem, before: r.archiveStatus, after: status, reversible: status !== 'Archived', note: reason, live: true };
      });
      setArchiveAudit(function(prev) { var next = entries.concat(prev); savePersistent('archiveAudit', next); return next; });
      setSelectedArchiveIds([]);
    }

    return (
      <div className="space-y-5">

        {/* ── Page header ── */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Archive Review</h1>
            <p className="text-gray-500 text-sm">Controlled cleanup workspace for inactive, obsolete, duplicate, and no-demand service parts.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="relative">
              <select
                value={archiveMode}
                onChange={function(e) { setArchiveMode(e.target.value); }}
                className={(archiveMode === 'all' ? 'bg-blue-50 text-blue-800 border-blue-200' : archiveMode === 'active' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200') + ' rounded-lg px-4 py-2 text-sm font-medium cursor-pointer appearance-none pr-7 border'}
              >
                <option value="active">Active Only</option>
                <option value="all">Show All</option>
                <option value="archived">Archived Only</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs">▾</span>
            </div>
            <button
              onClick={function() { setExportView(selectedArchiveIds.length > 0 ? 'selected' : 'all'); setArchiveExportOpen(true); }}
              className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200"
            >Export Candidates</button>
            <button
              onClick={function() { if (selectedArchiveIds.length === 0) setSelectedArchiveIds(readyRows.map(function(r) { return r.id; })); setArchiveSubmitOpen(true); }}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >Flag for Follow-up{selectedArchiveIds.length > 0 ? ' (' + selectedArchiveIds.length + ')' : ''}</button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Ready to Archive" value={(counts['Ready to Archive'] || 0).toLocaleString()} subtitle="Passed all safety checks" tone="green" />
          <StatCard title="Needs Review"     value={(counts['Needs Review'] || 0).toLocaleString()} subtitle="Missing or uncertain data" tone="orange" />
          <StatCard title="Unclassified"     value={String(dqCounts.unclassified)} subtitle="Imported, unclassified parts" tone="orange" />
          <StatCard title="Blocked"          value={(counts['Blocked'] || 0).toLocaleString()} subtitle="Demand, backlog, or future service" tone="red" />
          <StatCard title="Pending Data"     value={(counts['Pending Data'] || 0).toLocaleString()} subtitle="Manager / admin queue" />
          <StatCard title="Archived This Month" value={archivedThisMonth.toLocaleString()} subtitle="Removed from working review" tone="green" />
        </div>

        {/* ── Main 2-col layout ── */}
        <div style={{display:'flex', gap:'20px', alignItems:'flex-start'}}>

          {/* Left: candidate queue */}
          <div style={{flex:'1 1 0', minWidth:0}} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* Queue header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-900">Archive Candidate Queue</h2>
                <p className="text-sm text-gray-500">Tick rows that passed checks, then Flag for Follow-up. Click a row to make a decision.</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 flex-shrink-0">Safety-gated bulk actions</span>
            </div>

            {/* Status tabs */}
            <div className="px-4 pt-3 pb-0 border-b border-gray-200 flex gap-1 overflow-x-auto">
              {ARCHIVE_TABS.map(function(tab) {
                var cnt = tab === 'All' ? archiveRows.length : (counts[tab] || 0);
                var active = archiveTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={function() { setArchiveTab(tab); }}
                    className={'pb-2 px-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ' + (active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800')}
                  >
                    {tab}
                    <span className={'ml-1.5 text-xs rounded-full px-1.5 py-0.5 ' + (active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                      {cnt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div id="archive-table-scroll" ref={tableScrollRef} className="overflow-x-auto" style={{maxHeight:"520px", overflowY:"auto"}}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="p-3 text-center">
                      <input type="checkbox" checked={visibleRows.length > 0 && visibleRows.every(function(r){ return selectedArchiveIds.indexOf(r.id) >= 0; })} onChange={function(){ var tbl=tableScrollRef.current; var pg=(mainScrollRef && mainScrollRef.current); savedScroll.current={tbl:tbl?tbl.scrollTop:0, tbl_x:tbl?tbl.scrollLeft:0, pg:pg?pg.scrollTop:0}; var allSel=visibleRows.every(function(r){ return selectedArchiveIds.indexOf(r.id)>=0; }); setSelectedArchiveIds(allSel?[]:visibleRows.map(function(r){ return r.id; })); }} title="Select / deselect all visible rows" />
                    </th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-left p-3">Archive Status</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-left p-3">OEM</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-left p-3">JSS Part</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-left p-3">Customer Part</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-left p-3">Description</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-right p-3">Demand</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-right p-3">Backlog</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-left p-3">Service EOP</th>
                    <th style={{position:"sticky",top:0,zIndex:10,background:"#f9fafb"}} className="text-left p-3">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(function(rawP) {
                    var p = resolvePart(rawP);
                    var checked = selectedArchiveIds.indexOf(p.id) >= 0;
                    var isSelected = selectedArchivePart && selectedArchivePart.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={function(e) {
                          var tbl=tableScrollRef.current;
                           savedScrollPart.current={tbl:tbl?tbl.scrollTop:0, tbl_x:tbl?tbl.scrollLeft:0, pg:_outerScroller?_outerScroller.scrollTop:0};
                          var _outerScroller = mainScrollRef && mainScrollRef.current;
                          var _outerTop = _outerScroller ? _outerScroller.scrollTop : 0;
                          ReactDOM.flushSync(function() {
                            setSelectedPart(p);
                            if (appSelectedPart && onOpenDetail) { onOpenDetail(p); }
                          });
                          if (_outerScroller) { _outerScroller.scrollTop = _outerTop; }
                        }}
                        className={'border-t border-gray-100 cursor-pointer ' + (isSelected ? 'bg-blue-50' : 'hover:bg-blue-50')}
                      >
                        <td className="p-3 text-center" onClick={function(e) { e.stopPropagation(); }}>
                          <input type="checkbox" checked={checked} onChange={function(){ var tbl=tableScrollRef.current; var pg=(mainScrollRef && mainScrollRef.current); savedScroll.current={tbl:tbl?tbl.scrollTop:0, tbl_x:tbl?tbl.scrollLeft:0, pg:pg?pg.scrollTop:0}; toggleSelect(p.id); }} />
                        </td>
                        <td className="p-3"><ArchiveBadge status={p.archiveStatus} /></td>
                        <td className="p-3 font-medium">{p.oem}</td>
                        <td className="p-3 font-mono text-xs">{p.jss}</td>
                        <td className="p-3 font-mono text-xs">{p.customerPart}</td>
                        <td className="p-3 max-w-xs truncate">{p.desc}</td>
                        <td className="p-3 text-right">{p.demand}</td>
                        <td className="p-3 text-right">{p.backlog}</td>
                        <td className="p-3">{p.serviceEop}</td>
                        <td className="p-3">{p.approvalStatus}</td>
                      </tr>
                    );
                  })}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-sm text-gray-400">No parts match this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: decision panel (sticky) */}
          <div style={{width:'320px', flexShrink:0, position:'sticky', top:'72px', alignSelf:'start'}} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">

            {!selectedArchivePart ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <div className="font-semibold text-gray-700 mb-1">No part selected</div>
                <div className="text-sm text-gray-400">Click any row in the queue to see its archive readiness and make a decision.</div>
              </div>
            ) : (<React.Fragment>
            {/* Panel header */}
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Archive Decision{selCount > 1 ? ' · ' + selCount + ' parts checked' : ''}
                </div>
                <div className="flex items-center gap-2">
                  {selCount > 0 && (
                    <button onClick={function() { setSelectedArchiveIds([]); }} className="text-xs text-gray-500 hover:text-gray-800 underline">
                      Deselect all ({selCount})
                    </button>
                  )}
                  {selectedArchivePart && onOpenDetail && (
                    <button
                      onClick={function() { setSelectedPart(selectedArchivePart); onOpenDetail(selectedArchivePart); }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded font-medium"
                      title="Open full part detail drawer"
                    >
                      View Full Details ↗
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <h2 className="text-lg font-bold text-gray-900">{selectedArchivePart?.jss}</h2>
                <ArchiveBadge status={selectedArchivePart?.archiveStatus || 'Needs Review'} />
              </div>
              <p className="text-sm text-gray-500 mt-1">{selectedArchivePart?.oem} · Plant {selectedArchivePart?.plant} · {selectedArchivePart?.customerPart}</p>
            </div>

            {/* Readiness checklist */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="font-bold text-gray-900 mb-2">Archive Readiness Checklist</div>
              <CheckRow label="No future demand found"  pass={selectedArchivePart?.demand === 0} />
              <CheckRow label="No backlog open"         pass={selectedArchivePart?.backlog === 0} />
              <CheckRow label="Service EOP Closed"      pass={parseInt(selectedArchivePart?.serviceEop, 10) <= 2026} />
              <CheckRow label="Not currently active"    pass={selectedArchivePart?.active !== 'ACTIVE'} />
              <CheckRow label="No data-quality flag"    pass={selectedArchivePart?.dq?.type === 'CLEAN'} />
            </div>

            {/* Recommendation */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="text-xs text-blue-700 uppercase tracking-wide">Why this recommendation?</div>
              <div className="font-bold text-blue-900 mt-1">{selectedArchivePart?.archiveStatus || 'Needs Review'}</div>
              <p className="text-sm text-blue-800 mt-2">{selectedArchivePart?.archiveReason || 'This part needs a controlled review before archive action.'}</p>
            </div>

            {/* Decision buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={function() { decide(selectedArchivePart, 'Archived', 'Approved for archive by ' + currentUser.name + '.'); }}
                className="bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700"
              >Approve Archive</button>
              <button
                onClick={function() { decide(selectedArchivePart, 'Active', 'Kept active — do not archive.'); }}
                className="bg-white text-gray-700 rounded-lg py-2 text-sm font-medium border border-gray-300 hover:bg-gray-50"
              >Keep Active</button>
              <button
                onClick={function() { decide(selectedArchivePart, 'Pending Data', 'Routed for manager review.'); }}
                className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
              >Manager Review</button>
              <button
                onClick={function() { decide(selectedArchivePart, 'Blocked', 'Blocked — criteria not met.'); }}
                className="bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700"
              >Block</button>
            </div>

            {/* Utility buttons */}
            <button
              onClick={function() { setActionModal({ part: selectedArchivePart, source: 'Archive Review', action: '', note: '' }); }}
              className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800"
            >Assign / Update Action</button>
            <button
              onClick={function() { setSourceHistoryFor(selectedArchivePart); }}
              className="w-full bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
            >View Source Files &amp; History</button>

          </React.Fragment>)}
          </div>
        </div>

        {archiveExportOpen && <ArchiveExportModal rows={archiveRows} selectedIds={selectedArchiveIds} exportView={exportView} setExportView={setExportView} archiveExportOpen={archiveExportOpen} setArchiveExportOpen={setArchiveExportOpen} />}
        {archiveSubmitOpen && <ArchiveSubmitModal rows={archiveRows} archiveSubmitOpen={archiveSubmitOpen} setArchiveSubmitOpen={setArchiveSubmitOpen} currentUser={currentUser} parts={parts} archiveDecisions={archiveDecisions} setArchiveDecisions={setArchiveDecisions} setQueueTasks={setQueueTasks} />}
      </div>
    );
  });

export { ArchiveReview };
