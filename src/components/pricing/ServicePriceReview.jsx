// components/pricing/ServicePriceReview.jsx
// Service Price Review — bulk price management with history tracking.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { PriceInput } from '../shared/PriceInput.jsx';
import { Badge } from '../shared/Badge.jsx';
import { SearchBox } from '../shared/SearchBox.jsx';
import { StatCard } from '../shared/StatCard.jsx';


function ServicePriceReview() {
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
    marManager, setMarManager, canEdit, currentUser, authed, priceRows, priceReview
  } = ctx;
    const [priceEditOpen, setPriceEditOpen] = React.useState(false);
    const [priceEditDraft, setPriceEditDraft] = React.useState({ price: '', cost: '' });

    // Reset edit panel when selection changes
    const prevSelId = React.useRef(null);
    React.useEffect(function(){
      var selId = (typeof sel !== 'undefined' && sel) ? sel.id : null;
      if (selId !== prevSelId.current) {
        prevSelId.current = selId;
        setPriceEditOpen(false);
        setPriceEditDraft({ price: '', cost: '' });
      }
    });

    function savePriceEdit(){
      if (!sel) return;
      var newPrice = priceEditDraft.price.trim();
      var newCost  = priceEditDraft.cost.trim();
      if (!newPrice && !newCost) { alert('Enter at least one value to override.'); return; }
      var pVal = newPrice ? parseFloat(newPrice) : null;
      var cVal = newCost  ? parseFloat(newCost)  : null;
      if (pVal !== null && (isNaN(pVal) || pVal < 0)) { alert('Invalid price — must be a number ≥ 0.'); return; }
      if (cVal !== null && (isNaN(cVal) || cVal < 0)) { alert('Invalid cost — must be a number ≥ 0.');  return; }
      setRawParts(function(prev){ return prev.map(function(pp){
        if (pp.id !== sel.id) return pp;
        var up = Object.assign({}, pp);
        if (pVal !== null) up.price = pVal;
        if (cVal !== null) up.cost  = cVal;
        return up;
      }); });
      var msg = [];
      if (pVal !== null) msg.push('Price → $' + pVal.toFixed(2));
      if (cVal !== null) msg.push('Cost → $'  + cVal.toFixed(2));
      recordDecision(sel, 'Manual Override', 'purple', msg.join(' · '), pVal !== null ? pVal : undefined);
      setPriceEditOpen(false);
      setPriceEditDraft({ price: '', cost: '' });
    }

    const toneMap = {
      red: 'bg-red-100 text-red-800 border-red-200',
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      green: 'bg-green-100 text-green-800 border-green-200'
    };

function PriceBadge(props){ return <span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (toneMap[props.tone] || toneMap.gray)}>{props.children}</span>; }

    
    var priceCounts = (function(){
      var c = { noData:0, missingPrice:0, missingCost:0, belowCost:0, belowFloor:0, thin:0, healthy:0, flagged:0 };
      priceRows.forEach(function(r){
        if (r.reviewFlag) c.flagged++;
        var iss = r.pr.issue;
        if (iss === 'NO PRICE / NO COST') c.noData++;
        else if (iss === 'MISSING PRICE') c.missingPrice++;
        else if (iss === 'MISSING COST') c.missingCost++;
        else if (iss === 'BELOW COST') c.belowCost++;
        else if (iss === 'BELOW FLOOR') c.belowFloor++;
        else if (iss === 'THIN MARGIN') c.thin++;
        else if (iss === 'HEALTHY MARGIN') c.healthy++;
      });
      return c;
    })();
    const filtered = priceRows.filter(function(p){
      if (priceFilter === 'All') return p.pr.issue !== 'HEALTHY MARGIN';
      if (priceFilter === 'Missing Price') return p.pr.issue === 'NO PRICE / NO COST' || p.pr.issue === 'MISSING PRICE';
      if (priceFilter === 'Missing Sell Price') return p.pr.issue === 'MISSING PRICE';
      if (priceFilter === 'Missing Cost') return p.pr.issue === 'MISSING COST';
      if (priceFilter === 'Below Cost') return p.pr.issue === 'BELOW COST';
      if (priceFilter === 'Thin Margin') return p.pr.issue === 'THIN MARGIN';
      if (priceFilter === 'Flagged') return !!p.reviewFlag;
      if (priceFilter === 'Healthy') return p.pr.issue === 'HEALTHY MARGIN';
      return true;
    });

    const sel = selectedPrice || filtered[0] || priceRows[0];
    const proposed = sel ? (priceProposal[sel.id] !== undefined ? priceProposal[sel.id] : (sel.pr.target ? sel.pr.target.toFixed(2) : '')) : '';
    const proposedNum = parseFloat(proposed);
    const proposedMargin = (sel && sel.pr.hasCost && !isNaN(proposedNum) && proposedNum > 0) ? (proposedNum - sel.pr.cost) / proposedNum : null;

    // ---- TWO-TRACK RATE BAND (Target / Floor) for the selected part ----
    // Uses the part's COGS and its service-life age (years remaining until EOP) to pull the
    // company Target/Floor multipliers, then grades the PROPOSED price against that band.
    const selPhase = sel ? servicePhase(sel) : { yearsLeft: null };
    const bandEval = sel ? evalRateBand(sel.pr.cost, isNaN(proposedNum) ? null : proposedNum, selPhase.yearsLeft) : null;
    const bandToneCard = { red: 'bg-red-50 border-red-200', amber: 'bg-amber-50 border-amber-200', green: 'bg-green-50 border-green-200', gray: 'bg-gray-50 border-gray-200' };
    const bandToneText = { red: 'text-red-700', amber: 'text-amber-700', green: 'text-green-700', gray: 'text-gray-600' };

    function fmt(v){ return v === null || v === undefined ? '—' : '$' + v.toFixed(2); }
    function pct(v){ return v === null ? '—' : Math.round(v * 100) + '%'; }

    // ---- ACTION HANDLERS: record a per-part pricing decision (session-state) ----
    // Each decision stamps the part with a status, the price/cost at the time, the reference year
    // it was graded under, and a timestamp — that becomes the part's "View History" trail.
    function stamp(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); }
    function recordDecision(part, status, tone, detail, priceVal){
      var _pdTs = stamp();
      setPriceDecisions(function(prev){
        var n = Object.assign({}, prev);
        var hist = (n[part.id] && n[part.id].history) ? n[part.id].history.slice() : [];
        hist.unshift({ ts: _pdTs, status: status, detail: detail, price: priceVal, by: currentUser.name, gradedYear: CURRENT_YEAR });
        n[part.id] = { status: status, tone: tone, detail: detail, price: priceVal, gradedYear: CURRENT_YEAR, history: hist };
        return n;
      });
      _supaWrite('price_decisions', { id: part.id + '_' + _pdTs, partId: part.id, user: currentUser.name, status: status, proposed: priceVal, note: detail, ts: new Date().toISOString() });
    }
    var decisionStyles = { green: 'bg-green-100 text-green-800 border-green-200', amber: 'bg-amber-100 text-amber-800 border-amber-200', purple: 'bg-purple-100 text-purple-800 border-purple-200', gray: 'bg-gray-100 text-gray-700 border-gray-200' };
    var selDecision = sel ? priceDecisions[sel.id] : null;
    // routeTask creates a REAL task in the owner's Action Queue (session-state). It upserts by a
    // stable id (one open task per part+kind) so re-clicking refreshes rather than duplicates.
    function routeTask(part, kind){
      var d = new Date();
      var ts = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      var spec;
      if (kind === 'manager') {
        spec = { suffix: 'MGR', role: 'Director / GKAM', priority: 'High', slaDays: 3,
          title: 'Approve proposed service price — ' + part.oem + ' ' + part.jss,
          suggestion: (isNaN(proposedNum) ? 'Review proposed price' : 'Approve price at ' + fmt(proposedNum)),
          reason: 'Routed from Service Price Review for manager sign-off. Current ' + fmt(part.pr.price) + ' → proposed ' + (isNaN(proposedNum) ? '—' : fmt(proposedNum)) + (proposedMargin !== null ? ' (' + pct(proposedMargin) + ' margin)' : '') + (bandEval && bandEval.ok ? ' · band: ' + bandEval.label : '') + '. Graded as of ' + CURRENT_YEAR + '.' };
      } else {
        spec = { suffix: 'COST', role: 'Admin', priority: 'Medium', slaDays: 5,
          title: 'Provide standard cost (COGS) — ' + part.oem + ' ' + part.jss,
          suggestion: 'Backfill standard cost from source/owner',
          reason: 'Requested from Service Price Review — margin and rate band cannot be confirmed until COGS is on file. Current price ' + fmt(part.pr.price) + ', cost ' + fmt(part.pr.cost) + '.' };
      }
      var task = { id: 'QT-' + part.id + '-' + spec.suffix, title: spec.title, role: spec.role, status: 'Pending Data',
        priority: spec.priority, source: 'Service Price Review', jss: part.jss, oem: part.oem, ageDays: 0, slaDays: spec.slaDays,
        suggestion: spec.suggestion, reason: spec.reason, assignee: 'Unassigned', live: true, createdBy: currentUser.name, createdTs: ts };
      setQueueTasks(function(prev){ var rest = prev.filter(function(t){ return t.id !== task.id; }); return [task].concat(rest); });
    }
    function doApprove(){
      if (!sel) return;
      if (isNaN(proposedNum) || proposedNum <= 0) { return; }
      // Update rawParts so price column + margin column auto-refresh everywhere
      setRawParts(function(prev){ return prev.map(function(pp){
        if (pp.id !== sel.id) return pp;
        return Object.assign({}, pp, { price: proposedNum });
      }); });
      // Also lock the proposal to the approved value so the input reflects it
      setPriceProposal(function(prev){ return Object.assign({}, prev, { [sel.id]: String(proposedNum) }); });
      recordDecision(sel, 'Price Resolved', 'green', 'Price Resolved at ' + fmt(proposedNum) + (proposedMargin !== null ? ' (' + pct(proposedMargin) + ' margin)' : '') + (bandEval && bandEval.ok ? ' · band: ' + bandEval.label : '') + '.', proposedNum);
    }
    function doFlagReview(){if (!sel) return;var note = (window._flagNoteVal || '').trim();setRawParts(function(prev){ return prev.map(function(pp){if (pp.id !== sel.id) return pp;return Object.assign({}, pp, { reviewFlag: true, reviewNote: note, reviewFlaggedAt: new Date().toISOString() });}); });recordDecision(sel, 'Flagged for Review', 'amber', 'Marked for later review' + (note ? ': ' + note : '') + '.', null);window._flagNoteVal = '';} function doClearFlag(){if (!sel) return;setRawParts(function(prev){ return prev.map(function(pp){if (pp.id !== sel.id) return pp;var up = Object.assign({}, pp); delete up.reviewFlag; delete up.reviewNote; delete up.reviewFlaggedAt; return up;}); });recordDecision(sel, 'Flag Cleared', 'gray', 'Review flag removed.', null);}
    function doRequestCost(){ if (!sel) return; recordDecision(sel, 'Cost Data Requested', 'purple', 'Requested standard cost (COGS) from the source/owner — margin and rate band can\u2019t be confirmed until cost is on file.', null); routeTask(sel, 'cost'); }

    return <div id="spr-top" className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Service Price Review</h1><p className="text-gray-500">Confirm service price, cost, and margin on every flagged part. The AI computes margin and suggests a target price — the Pricing Admin sets and approves the final number. Every change is audit-logged.</p></div><button onClick={async function(){
  if (typeof ExcelJS === 'undefined') { alert('ExcelJS library not loaded.'); return; }
  var cols = [{header:'Issue',key:'issue'},{header:'OEM',key:'oem'},{header:'JSS Part',key:'jss'},{header:'Customer Part',key:'customerPart'},{header:'Description',key:'desc'},{header:'Current Price',key:'price'},{header:'Std Cost',key:'cost'},{header:'Margin %',key:'margin'},{header:'AI Suggested',key:'target'},{header:'Proposed Price',key:'proposed'},{header:'Decision',key:'decision'},{header:'Graded Year',key:'gradedYear'}];
  var rows = filtered.map(function(p){
    var dec = priceDecisions[p.id];
    return { issue: p.pr.issue, oem: p.oem, jss: p.jss, customerPart: p.customerPart, desc: p.desc, price: p.pr.price != null ? p.pr.price : '', cost: p.pr.cost != null ? p.pr.cost : '', margin: p.pr.margin != null ? Math.round(p.pr.margin*100)+'%' : '—', target: p.pr.target != null ? p.pr.target : '', proposed: priceProposal[p.id] !== undefined ? priceProposal[p.id] : '', decision: dec ? dec.status : '', gradedYear: dec ? dec.gradedYear : CURRENT_YEAR };
  });
  var wb = new ExcelJS.Workbook(); wb.creator = 'Service Database'; wb.created = new Date();
  var ws = wb.addWorksheet('Price Review');
  ws.columns = cols.map(function(c){ return {header:c.header,key:c.key,width:20}; });
  ws.getRow(1).font = {bold:true,color:{argb:'FFFFFFFF'}}; ws.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF1E3A5F'}};
  rows.forEach(function(r){ ws.addRow(r); });
  var buf = await wb.xlsx.writeBuffer();
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download = 'Price_Review_' + (priceFilter !== 'All' ? priceFilter.replace(/\s/g,'_')+'_' : '') + new Date().toISOString().slice(0,10) + '.xlsx'; a.click();
}} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">Export Price Sheet</button></div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><StatCard title="Missing Price" value={String(priceCounts.noData + priceCounts.missingPrice)} subtitle="No sell price on file" tone="red" /><StatCard title="Below Cost" value={String(priceCounts.belowCost)} subtitle="Selling at a loss" tone="red" /><StatCard title="Thin Margin" value={String(priceCounts.thin)} subtitle="Under the margin floor" tone="orange" /><StatCard title="Missing Cost" value={String(priceCounts.missingCost)} subtitle="Margin unverifiable" tone="orange" /></div>

    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900"><span className="font-bold">How the engine decides:</span> Margin = (Price − Cost) ÷ Price. The floor is <span className="font-semibold">{Math.round(PRICE_FLOOR_MARGIN * 100)}%</span> and the standard target is <span className="font-semibold">{Math.round(TARGET_MARGIN * 100)}%</span>. Missing prices are grossed up from cost (× {DEFAULT_MARKUP} markup). The suggested price is a starting point — adjust it and approve to commit, or send to a manager for sign-off.</div>

    <div style={{position:'sticky',top:0,zIndex:20,backgroundColor:'white',borderRadius:'0.75rem',border:'1px solid #e5e7eb',padding:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap'}}><div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',flex:1,alignItems:'center'}}>
{['All','Missing Price','Below Cost','Thin Margin','Healthy','Flagged'].map(function(f){
  var isMissingActive = (f === 'Missing Price') && ['Missing Price','Missing Sell Price','Missing Cost'].indexOf(priceFilter) !== -1;
  var isActive = priceFilter === f || isMissingActive;
  return <div key={f} style={{position:'relative',display:'inline-block'}} onMouseEnter={function(e){ if(f==='Missing Price'){ var d=e.currentTarget.querySelector('.mp-dropdown'); if(d) d.style.display='block'; }}} onMouseLeave={function(e){ if(f==='Missing Price'){ var d=e.currentTarget.querySelector('.mp-dropdown'); if(d) d.style.display='none'; }}}>
    <button onClick={function(){ setPriceFilter(f); setSelectedPrice(null); }} className={(isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700') + ' rounded-lg px-3 py-2 text-sm'} style={{display:'flex',alignItems:'center',gap:'4px'}}>
      {f}{f==='Missing Price' ? <span style={{fontSize:'10px',opacity:0.75}}>▾</span> : null}{f==='Flagged' && priceCounts.flagged > 0 ? <span style={{background:'#fbbf24',color:'#78350f',borderRadius:'9999px',fontSize:'10px',fontWeight:700,padding:'1px 6px',marginLeft:'4px'}}>{priceCounts.flagged}</span> : null}
    </button>
    {f==='Missing Price' ? <div className="mp-dropdown" style={{display:'none',position:'absolute',top:'100%',left:0,zIndex:50,background:'#fff',border:'1px solid #e5e7eb',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',minWidth:'160px',padding:'4px 0',marginTop:'2px'}}>
      {['Missing Sell Price','Missing Cost'].map(function(sf){ return <button key={sf} onClick={function(){ setPriceFilter(sf); setSelectedPrice(null); }} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 14px',fontSize:'13px',background:priceFilter===sf?'#eff6ff':'transparent',color:priceFilter===sf?'#1d4ed8':'#374151',border:'none',cursor:'pointer'}}>{sf}</button>; })}
    </div> : null}
  </div>;
})}
</div><button onClick={function(){ window.scrollTo({top:0,behavior:'smooth'}); }} style={{marginLeft:'auto',fontSize:'0.75rem',color:'#6b7280',whiteSpace:'nowrap',background:'none',border:'none',cursor:'pointer',padding:'0.25rem 0.5rem'}} onMouseEnter={function(e){e.target.style.color='#111827';}} onMouseLeave={function(e){e.target.style.color='#6b7280';}}>↑ Jump to top</button></div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5"><div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Issue</th><th className="text-left p-3">OEM</th><th className="text-left p-3">JSS Part</th><th className="text-left p-3">Description</th><th className="text-right p-3">Price</th><th className="text-right p-3">Cost</th><th className="text-right p-3">Margin</th><th className="text-right p-3">Suggested</th></tr></thead><tbody>{filtered.map(function(p){ return <tr key={p.id} id={'price-row-'+p.id} onClick={function(){ setSelectedPrice(p); }} className={'border-t border-gray-100 cursor-pointer ' + (sel && sel.id === p.id ? 'bg-blue-50' : 'hover:bg-blue-50')}><td className="p-3"><PriceBadge tone={p.pr.tone}>{p.pr.issue}</PriceBadge></td><td className="p-3 font-medium">{p.oem}</td><td className="p-3 font-mono text-xs">{p.jss}</td><td className="p-3 max-w-xs truncate">{p.desc}</td><td className="p-3 text-right">{fmt(p.pr.price)}</td><td className="p-3 text-right">{fmt(p.pr.cost)}</td><td className={'p-3 text-right font-medium ' + (p.pr.margin === null ? 'text-gray-400' : p.pr.margin < PRICE_FLOOR_MARGIN ? 'text-red-600' : 'text-green-600')}>{pct(p.pr.margin)}</td><td className="p-3 text-right font-semibold text-blue-700">{p.pr.target ? fmt(p.pr.target) : '—'}</td></tr>; })}</tbody></table></div>{filtered.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No parts in this view.</div>}</div>

    <div style={{position:'sticky',top:'72px',maxHeight:'calc(100vh - 88px)',overflowY:'auto',alignSelf:'start'}} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">{sel ? <React.Fragment><div><div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px'}}>
  <div className="text-xs text-gray-500 uppercase tracking-wide">Price Decision</div>
  <button title="Jump to this part in its current filter" onClick={function(){
    // Always read the LIVE issue from priceRows (recomputed after approval)
    // so Go-to reflects the part's current bucket, not the stale sel snapshot.
    var live = priceRows.find(function(r){ return r.id === sel.id; });
    var issue = live ? live.pr.issue : sel.pr.issue;
    var dest = 'All';
    if(issue === 'NO PRICE / NO COST' || issue === 'MISSING PRICE') dest = 'Missing Price';
    else if(issue === 'MISSING COST') dest = 'Missing Cost';
    else if(issue === 'BELOW COST') dest = 'Below Cost';
    else if(issue === 'THIN MARGIN') dest = 'Thin Margin';
    else if(issue === 'HEALTHY MARGIN') dest = 'Healthy';
    setPriceFilter(dest);
    setSelectedPrice(sel);
    setTimeout(function(){ var el = document.getElementById('price-row-'+sel.id); if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); } }, 120);
  }} style={{flexShrink:0,fontSize:'11px',fontWeight:600,color:'#1d4ed8',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'6px',padding:'3px 8px',cursor:'pointer',whiteSpace:'nowrap'}}>Go to ↗</button>
</div>
<div className="flex items-center gap-2 mt-1 flex-wrap"><PriceBadge tone={sel.pr.tone}>{sel.pr.issue}</PriceBadge><Badge tone={sel.priority}>{sel.priority}</Badge></div><h2 className="text-lg font-bold text-gray-900 mt-2">{sel.jss}</h2><p className="text-sm text-gray-500">{sel.oem} · Plant {sel.plant} · {sel.customerPart}</p><p className="text-sm text-gray-600 mt-1">{sel.desc}</p></div><div className="grid grid-cols-3 gap-2 text-sm"><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">Current Price</div><div className="font-bold">{fmt(sel.pr.price)}</div></div><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">Std Cost</div><div className="font-bold">{fmt(sel.pr.cost)}</div></div><div className="border rounded-lg p-2"><div className="text-xs text-gray-500">Margin</div><div className={'font-bold ' + (sel.pr.margin === null ? 'text-gray-400' : sel.pr.margin < PRICE_FLOOR_MARGIN ? 'text-red-600' : 'text-green-600')}>{pct(sel.pr.margin)}</div></div></div><div className={'border rounded-xl p-4 ' + (sel.pr.tone === 'red' ? 'bg-red-50 border-red-100' : sel.pr.tone === 'amber' ? 'bg-amber-50 border-amber-100' : sel.pr.tone === 'orange' ? 'bg-orange-50 border-orange-100' : sel.pr.tone === 'gray' ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-100')}><div className="text-xs uppercase tracking-wide text-gray-600">AI Suggested Action</div><div className="font-bold text-gray-900 mt-1">{sel.pr.target ? 'Set price to ' + fmt(sel.pr.target) : 'Confirm cost data first'}</div><div className="text-sm text-gray-700 mt-1">{sel.pr.note}</div><div className="text-xs text-gray-500 mt-2 italic">Suggestion only — the Pricing Admin sets the final number.</div></div><div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><div className="text-xs text-blue-700 uppercase tracking-wide mb-2">Proposed Price</div><div className="flex items-center gap-2"><span className="text-gray-500 text-lg">$</span><PriceInput partId={sel.id} value={proposed} onCommit={function(v){ setPriceProposal(function(prev){ return Object.assign({}, prev, { [sel.id]: v }); }); }} /></div>{proposedMargin !== null && <div className="text-sm text-blue-800 mt-2">Resulting margin: <span className={'font-bold ' + (proposedMargin < PRICE_FLOOR_MARGIN ? 'text-red-600' : 'text-green-700')}>{pct(proposedMargin)}</span>{proposedMargin < PRICE_FLOOR_MARGIN && <span className="text-red-600"> · below the {Math.round(PRICE_FLOOR_MARGIN * 100)}% floor</span>}</div>}</div>{bandEval && bandEval.ok ? <div className={'border rounded-xl p-4 ' + (bandToneCard[bandEval.tone] || bandToneCard.gray)}><div className="flex items-center justify-between"><div className="text-xs uppercase tracking-wide text-gray-600">Rate Band · Target / Floor</div><span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (toneMap[bandEval.tone] || toneMap.gray)}>{bandEval.label}</span></div><div className="text-xs text-gray-500 mt-1">Part life: <span className="font-medium">{selPhase.yearsLeft === null ? 'Unknown' : (selPhase.yearsLeft <= 0 ? 'Overdue' : selPhase.yearsLeft + ' yrs')}</span> → band <span className="font-medium">{bandEval.band.band}</span>{bandEval.band.assumed && <span className="text-amber-600"> (assumed)</span>} · <span title="The band is computed from the part's age relative to this reference year. Recorded so a price decision can always be tied to the year it was graded under.">graded as of <span className="font-medium">{CURRENT_YEAR}</span></span></div><div className="grid grid-cols-2 gap-2 mt-3"><div className="bg-white border border-gray-200 rounded-lg p-2"><div className="text-xs text-gray-500">Target ({bandEval.targetMult}× COGS)</div><div className="font-bold text-green-700">{fmt(bandEval.targetPrice)}</div></div><div className="bg-white border border-gray-200 rounded-lg p-2"><div className="text-xs text-gray-500">Floor ({bandEval.floorMult}× COGS)</div><div className="font-bold text-red-700">{fmt(bandEval.floorPrice)}</div></div></div><div className={'text-sm mt-2 ' + (bandToneText[bandEval.tone] || bandToneText.gray)}>{bandEval.action}</div></div> : (sel && !sel.pr.hasCost ? <div className="border border-gray-200 bg-gray-50 rounded-xl p-4 text-xs text-gray-500"><span className="font-semibold text-gray-700">Rate Band:</span> needs a standard cost (COGS) to grade the price against the Target/Floor schedule. Confirm cost first.</div> : null)}{selDecision && <div className={'border rounded-xl p-3 ' + (decisionStyles[selDecision.tone] || decisionStyles.gray)}><div className="flex items-center justify-between"><div className="text-xs uppercase tracking-wide opacity-80">Current Decision</div><span className="text-xs opacity-70">graded as of {selDecision.gradedYear}</span></div><div className="font-bold mt-0.5">{selDecision.status}{selDecision.price ? ' · ' + fmt(selDecision.price) : ''}</div><div className="text-xs mt-1 opacity-90">{selDecision.detail}</div></div>}{priceEditOpen && <div className="border border-orange-200 rounded-xl p-4 space-y-3" style={{backgroundColor:'#fff7f3'}}><div className="text-xs font-semibold uppercase tracking-wide" style={{color:'#c2410c'}}>Manual Override</div><div className="text-xs text-gray-600">Update the standard cost (COGS) and/or service price. Saving overwrites imported values and re-grades this row against the Phase Rate Matrix.</div><div className="space-y-2"><div><label className="text-xs text-gray-500">Current Price / Sell Price</label><input type="number" min="0" step="0.01" value={priceEditDraft.price} onChange={function(e){ setPriceEditDraft(function(d){ return Object.assign({},d,{price:e.target.value}); }); }} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={'Current: ' + (sel.pr.price !== null && sel.pr.price !== undefined ? '$' + sel.pr.price.toFixed(2) : '—')} /></div><div><label className="text-xs text-gray-500">Std Cost / COGS</label><input type="number" min="0" step="0.01" value={priceEditDraft.cost} onChange={function(e){ setPriceEditDraft(function(d){ return Object.assign({},d,{cost:e.target.value}); }); }} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={'Current: ' + (sel.pr.cost !== null && sel.pr.cost !== undefined ? '$' + sel.pr.cost.toFixed(2) : '—')} /></div></div><div className="flex gap-2"><button onClick={savePriceEdit} className="flex-1 text-white rounded-lg py-2 text-sm font-medium" style={{backgroundColor:'#F05A28'}}>Save Override</button><button onClick={function(){ setPriceEditOpen(false); setPriceEditDraft({price:'',cost:''}); }} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">Cancel</button></div></div>}{sel && sel.reviewFlag ? <div style={{background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:'8px',padding:'10px 12px',marginBottom:'8px'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontWeight:600,color:'#92400e',fontSize:'13px'}}>🔖 Flagged for Review</span><span style={{fontSize:'11px',color:'#b45309'}}>{sel.reviewFlaggedAt ? new Date(sel.reviewFlaggedAt).toLocaleDateString() : ''}</span></div>{sel.reviewNote ? <div style={{fontSize:'12px',color:'#78350f',marginTop:'4px'}}>{sel.reviewNote}</div> : null}</div> : null}{!sel || !sel.reviewFlag ? <div style={{marginBottom:'8px'}}><input defaultValue="" onChange={function(e){ window._flagNoteVal = e.target.value; }} placeholder="Review note (optional)…" style={{width:'100%',boxSizing:'border-box',border:'1px solid #e5e7eb',borderRadius:'6px',padding:'7px 10px',fontSize:'13px',color:'#374151'}} /></div> : null}<div className="grid grid-cols-2 gap-2"><button onClick={doApprove} disabled={isNaN(proposedNum) || proposedNum <= 0} className={((isNaN(proposedNum) || proposedNum <= 0) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white') + ' rounded-lg py-2 text-sm font-medium'} style={(isNaN(proposedNum) || proposedNum <= 0) ? {} : {backgroundColor:'#16a34a'}}>Approve Proposed Price</button><button onClick={doFlagReview} className="text-white rounded-lg py-2 text-sm font-medium" style={{backgroundColor: sel && sel.reviewFlag ? '#d97706' : '#2563eb'}}>🔖 {sel && sel.reviewFlag ? 'Update Flag' : 'Flag for Review'}</button>{sel && sel.reviewFlag ? <button onClick={doClearFlag} className="text-red-600 rounded-lg py-2 text-sm font-medium border border-red-300 hover:bg-red-50">✕ Clear Flag</button> : null}<button onClick={function(){ setPriceEditOpen(function(v){ return !v; }); }} className="text-amber-700 rounded-lg py-2 text-sm font-medium border border-amber-400 hover:bg-amber-50">{priceEditOpen ? 'Cancel Edit' : 'Edit Cost / Price'}</button><button onClick={function(){ setPriceHistoryFor(sel); }} className="bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">View History</button></div></React.Fragment> : <div className="text-sm text-gray-500">Select a part to review its pricing.</div>}</div></div>{priceHistoryFor && <PriceHistoryModal part={priceHistoryFor} />}</div>;
  }

function PriceHistoryModal(props) {
    if (!priceHistoryFor) return null;
    var part = props.part;
    function close(){ setPriceHistoryFor(null); }
    var dec = priceDecisions[part.id];
    var hist = (dec && dec.history) ? dec.history : [];
    var toneDot = { green: 'bg-green-500', amber: 'bg-amber-500', purple: 'bg-purple-500', gray: 'bg-gray-400' };
    function toneFor(s){ return s === 'Price Resolved' ? 'green' : s === 'Sent to Manager' ? 'amber' : s === 'Cost Data Requested' ? 'purple' : 'gray'; }
    return <React.Fragment><div onClick={close} className="fixed inset-0 bg-black/30 z-40"></div><div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"><div className="p-5 border-b border-gray-200 flex items-start justify-between"><div><div className="text-xs text-gray-500 uppercase tracking-wide">Price Decision History</div><h2 className="text-lg font-bold text-gray-900 mt-1">{part.jss}</h2><p className="text-sm text-gray-500 mt-0.5">{part.oem} · Plant {part.plant} · {part.customerPart}</p></div><button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl">×</button></div><div className="flex-1 overflow-auto p-5 space-y-4">{hist.length === 0 ? <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">No pricing decisions recorded yet for this part. Approve a price, send to a manager, or request cost data — each action is stamped here with the reference year it was graded under.</div> : <div className="space-y-3">{hist.map(function(h, i){ return <div key={i} className="border border-gray-200 rounded-xl p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={'w-2.5 h-2.5 rounded-full ' + (toneDot[toneFor(h.status)] || toneDot.gray)}></span><span className="font-semibold text-gray-900 text-sm">{h.status}</span></div><span className="text-xs text-gray-400 font-mono">{h.ts}</span></div><div className="text-xs text-gray-600 mt-1">{h.detail}</div><div className="text-xs text-gray-400 mt-1">by {h.by} · graded as of {h.gradedYear}{i === 0 ? ' · current' : ''}</div></div>; })}</div>}<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Every pricing decision is recorded with who, when, the price, and the reference year it was graded under — so a past decision can always be read back exactly as it was made. In production this writes to the central Audit History.</div></div><div className="p-5 border-t border-gray-200 flex items-center gap-2"><div className="flex-1"></div><button onClick={close} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Close</button></div></div></React.Fragment>;
  }

export { ServicePriceReview };