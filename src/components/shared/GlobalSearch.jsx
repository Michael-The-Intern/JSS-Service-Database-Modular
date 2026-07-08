// components/shared/GlobalSearch.jsx
// App-wide global search overlay (Cmd+K).

import React from 'react';
import { SearchBox } from './SearchBox.jsx';


function GlobalSearch(props) {
  var parts = props.parts; var rawTasks = props.rawTasks; var customTasks = props.customTasks;
  var riskRows = props.riskRows; var partDecisions = props.partDecisions;
  var setPage = props.setPage; var setSelectedPart = props.setSelectedPart;
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(function() {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return function() { document.removeEventListener('mousedown', handler); };
  }, []);
  const q = query.trim().toLowerCase();
  const results = React.useMemo(function() {
    if (q.length < 2) return [];
    var groups = [];
    var partMatches = parts.filter(function(p) {
      return String(p.jss||'').toLowerCase().indexOf(q)>=0 || String(p.customerPart||'').toLowerCase().indexOf(q)>=0 || String(p.desc||'').toLowerCase().indexOf(q)>=0 || String(p.oem||'').toLowerCase().indexOf(q)>=0 || String(p.plant||'').toLowerCase().indexOf(q)>=0;
    }).slice(0,5);
    if (partMatches.length > 0) groups.push({ page:'Master Terminal', icon:'🗂️', items: partMatches.map(function(p){ return { label: p.jss + ' · ' + p.oem + ' · Plant ' + p.plant, subtitle: p.desc, action: function(){ setPage('Master Terminal'); setSelectedPart(p); } }; }) });
    var dqMatches = parts.filter(function(p){ return p.dq.type !== 'CLEAN' && p.dq.type !== 'PLACEHOLDER' && (String(p.jss||'').toLowerCase().indexOf(q)>=0 || String(p.customerPart||'').toLowerCase().indexOf(q)>=0 || String(p.oem||'').toLowerCase().indexOf(q)>=0); }).slice(0,3);
    if (dqMatches.length > 0) groups.push({ page:'Data Quality Center', icon:'🔍', items: dqMatches.map(function(p){ return { label: p.customerPart + ' — ' + p.dq.label, subtitle: p.oem + ' · ' + p.jss, action: function(){ setPage('Data Quality Center'); } }; }) });
    var archiveMatches = parts.filter(function(p){ var isCandidate = String(p.active||'').toUpperCase()==='INACTIVE' && !p.demand && !p.backlog; return isCandidate && (String(p.jss||'').toLowerCase().indexOf(q)>=0 || String(p.customerPart||'').toLowerCase().indexOf(q)>=0 || String(p.oem||'').toLowerCase().indexOf(q)>=0); }).slice(0,3);
    if (archiveMatches.length > 0) groups.push({ page:'Archive Review', icon:'📦', items: archiveMatches.map(function(p){ return { label: p.jss + ' — Archive Candidate', subtitle: p.oem + ' · ' + p.desc, action: function(){ setPage('Archive Review'); } }; }) });    var allTasks = (rawTasks||[]).concat(customTasks||[]);
    var taskMatches = allTasks.filter(function(t){ return t.title.toLowerCase().indexOf(q)>=0 || String(t.jss||'').toLowerCase().indexOf(q)>=0 || String(t.oem||'').toLowerCase().indexOf(q)>=0; }).slice(0,3);
    if (taskMatches.length > 0) groups.push({ page:'Action Queues', icon:'✅', items: taskMatches.map(function(t){ return { label: t.id + ' · ' + t.title, subtitle: t.oem + ' · ' + t.status, action: function(){ setPage('Action Queues'); } }; }) });
    var priceMatches = parts.filter(function(p){ if(!p) return false; return (String(p.jss||'').toLowerCase().indexOf(q)>=0 || String(p.customerPart||'').toLowerCase().indexOf(q)>=0 || String(p.desc||'').toLowerCase().indexOf(q)>=0 || String(p.oem||'').toLowerCase().indexOf(q)>=0 || String(p.plant||'').toLowerCase().indexOf(q)>=0); }).slice(0,5);
    if (priceMatches.length > 0) groups.push({ page:'Service Price Review', icon:'💲', items: priceMatches.map(function(p){ var priceLabel = (!p.price || p.price==='0' || p.price==='') ? '— Missing Price' : ('$' + p.price); return { label: p.jss + ' · ' + p.oem + ' · Plant ' + p.plant, subtitle: priceLabel + ' · ' + p.desc, action: function(){ setPage('Service Price Review'); } }; }) });
    return groups;
  }, [q]);
  function go(action){ action(); setQuery(''); setOpen(false); }
  var totalResults = results.reduce(function(n,g){ return n+g.items.length; }, 0);
  return <div className="relative flex-1" ref={ref}>
    <input value={query} onChange={function(e){ setQuery(e.target.value); setOpen(true); }} onFocus={function(){ if(q.length>=2) setOpen(true); }} placeholder="Global search: JSS part, customer part, OEM, plant, inactive with demand..." className="w-full bg-gray-100 rounded-lg px-4 py-2 text-sm" />
    {open && q.length>=2 && results.length>0 && <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-auto">
      {results.map(function(group){ return <div key={group.page}><div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 sticky top-0"><span>{group.icon}</span><span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.page}</span></div>{group.items.map(function(item,i){ return <button key={i} onClick={function(){ go(item.action); }} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 flex flex-col"><span className="text-sm font-medium text-gray-900">{item.label}</span>{item.subtitle && <span className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</span>}</button>; })}</div>; })}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">{totalResults} result(s) across {results.length} terminal(s)</div>
    </div>}
    {open && q.length>=2 && results.length===0 && <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 px-4 py-6 text-center text-sm text-gray-400">No results for "<span className="font-medium text-gray-600">{query}</span>"</div>}
  </div>;
}

export { GlobalSearch };