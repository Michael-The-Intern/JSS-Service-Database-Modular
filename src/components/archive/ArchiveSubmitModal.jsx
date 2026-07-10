// components/archive/ArchiveSubmitModal.jsx
// Modal for submitting parts to the archive queue.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { Badge, ArchiveBadge } from '../shared/Badge.jsx';


function ArchiveSubmitModal({ rows, archiveSubmitOpen, setArchiveSubmitOpen }) {
  const ctx = React.useContext(AppContext);
  const {
    parts,
    setArchiveDecisions,
    setQueueTasks,
    archiveAudit,
    setArchiveAudit,
    currentUser,
    selectedArchiveIds,
  } = ctx;
  if (!archiveSubmitOpen) return null;
  function close(){ setArchiveSubmitOpen(false); }
  var selected = rows.filter(function(r){ return selectedArchiveIds.indexOf(r.id) >= 0; });
  var blockedSel = selected.filter(function(r){ return r.archiveStatus === 'Blocked'; });
  function confirm(){
  var eligible = selected.filter(function(r){ return r.archiveStatus !== 'Blocked'; });
  if (eligible.length === 0) { setArchiveSubmitOpen(false); return; }
  setArchiveDecisions(function(prev){
      var n = Object.assign({}, prev);
      eligible.forEach(function(r){ n[r.id] = { status: 'Pending Data', reason: 'Flagged for follow-up — visible to the team in Action Queues until missing data is filled in.' }; });
      savePersistent('archiveDecisions', n);
      return n;
  });
  var ts = (function(){ var d = new Date(); var p = function(n){ return (n<10?'0':'')+n; }; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()); })();
  var entries = eligible.map(function(r, i){
      return { id: 'AR-' + Date.now() + '-' + i, ts: ts, user: currentUser.name, role: currentUser.role,
          action: 'ROUTED FOR APPROVAL', module: 'Archive Review',
          target: 'JSS ' + r.jss + ' · ' + r.oem, before: r.archiveStatus, after: 'Pending Data',
          reversible: true, note: 'Flagged for follow-up from Archive Review — visible to the team until missing data is filled in.', live: true };
  });
  setArchiveAudit(function(prev){ var next = entries.concat(prev); savePersistent('archiveAudit', next); return next; });

  // === NEW: Bridge to Action Queues ===
  var newQueueTasks = eligible.map(function(r, i){
      return {
          id: 'T-ARC-' + Date.now() + '-' + i,
          title: 'Archive approval — ' + r.oem + ' ' + r.jss + ' (' + r.desc + ')',
          role: 'Director / GKAM',
          status: 'Pending Data',
          priority: (r.demand > 0 || r.backlog > 0) ? 'High' : 'Medium',
          source: 'Archive Review',
          jss: r.jss,
          oem: r.oem,
          partId: r.id,
          ageDays: 0,
          slaDays: 3,
          suggestion: 'Follow up on archive of ' + r.jss + ' (' + r.archiveStatus + ')',
          reason: r.archiveReason || 'Flagged from Archive Review — pending follow-up info.',
          assignee: 'Unassigned',
          live: true,
          submittedBy: currentUser.name,
          submittedAt: ts
      };
  });
  setQueueTasks(function(prev){ var next = prev.concat(newQueueTasks); return next; });
  newQueueTasks.forEach(function(t){ _supa.from('tasks').insert(t); });
  // === END NEW ===

  setSelectedArchiveIds([]);
  setArchiveSubmitOpen(false);
  alert('✓ ' + eligible.length + ' part(s) flagged for follow-up. Visible to the team in Action Queues. Logged to Audit History.');
}
  return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Submit Selected</div><h2 className="text-lg font-bold text-gray-900 mt-1">Archive Review</h2><p className="text-sm text-gray-500 mt-0.5">{selected.length} part(s) will be routed for archive approval.</p></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4">{selected.length === 0 ? <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">No rows selected. Tick rows in the queue (or use the header checkbox to grab all Ready-to-Archive rows) and try again.</div> : <React.Fragment>{blockedSel.length > 0 && <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-900"><span className="font-bold">{blockedSel.length} blocked row(s)</span> in your selection will be skipped — blocked parts can't be archived until their demand/backlog/EOP is cleared.</div>}<div className="border border-gray-200 rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">JSS Part</th><th className="text-left p-3">OEM</th><th className="text-left p-3">Status</th></tr></thead><tbody>{selected.map(function(r){ return <tr key={r.id} className="border-t border-gray-100"><td className="p-3 font-mono text-xs">{r.jss}</td><td className="p-3">{r.oem}</td><td className="p-3 text-xs">{r.archiveStatus}</td></tr>; })}</tbody></table></div></React.Fragment>}<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Submitting routes these parts to the <span className="font-semibold">Pending Data</span> queue for a manager/admin to confirm. Archiving is always reversible and fully audit-logged.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1"></div><button onClick={close} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button><button onClick={confirm} disabled={selected.length === 0} className={(selected.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700') + ' rounded-lg px-4 py-2 text-sm font-medium'}>Submit for Approval</button></div></div></React.Fragment>;
}

export { ArchiveSubmitModal };
