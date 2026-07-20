// components/service-life/ServiceLifePhase.jsx
import * as XLSX from 'xlsx';
// Service Life Phase page — phase grid, filters, and phase pill badges.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { MultiSelectDropdown } from '../shared/MultiSelectDropdown.jsx';
import { SearchBox } from '../shared/SearchBox.jsx';
import { StatCard } from '../shared/StatCard.jsx';
import { Badge } from '../shared/Badge.jsx';


function ServiceLifePhase() {
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
    yearIsPinned,
    oemKeys,
    refData,
    phaseMeta
  } = ctx;
    var phased = parts.map(function(p){ var ph = servicePhase(p); return Object.assign({}, p, { phase: ph.key, yearsLeft: ph.yearsLeft }); });
    var order = ['PHASE 1', 'PHASE 2', 'PHASE 3', 'PHASE 4', 'UNKNOWN AGE'];
    // simulated full-database scale counts (sample rows are the live-clickable subset)
    var scaleCounts = {};
    order.forEach(function(k){ scaleCounts[k] = phased.filter(function(p){ return p.phase === k; }).length; });
    var totalPhased = phased.length;
    var maxScale = Math.max.apply(null, order.map(function(k){ return scaleCounts[k]; }));

    var rows = phased.filter(function(p){ return phaseFilter === 'All' ? true : p.phase === phaseFilter; }).filter(function(p){ return oemPhaseFilter === 'All' ? true : p.oem === oemPhaseFilter; });

    var toneBar = { green: 'bg-green-500', blue: 'bg-blue-500', amber: 'bg-amber-500', red: 'bg-red-500', gray: 'bg-gray-400' };
    var toneText = { green: 'text-green-700', blue: 'text-blue-700', amber: 'text-amber-700', red: 'text-red-700', gray: 'text-gray-600' };
    var tonePill = { green: 'bg-green-100 text-green-800 border-green-200', blue: 'bg-blue-100 text-blue-800 border-blue-200', amber: 'bg-amber-100 text-amber-800 border-amber-200', red: 'bg-red-100 text-red-800 border-red-200', gray: 'bg-gray-100 text-gray-600 border-gray-200' };
    var toneCardBg = { green: 'bg-green-50 border-green-100', blue: 'bg-blue-50 border-blue-100', amber: 'bg-amber-50 border-amber-100', red: 'bg-red-50 border-red-100', gray: 'bg-gray-50 border-gray-200' };

function PhasePill(props){ var m = phaseMeta[props.phase]; return <span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (tonePill[m.tone] || tonePill.gray)}>{m.label}</span>; }

    var cleanupTargets = scaleCounts['PHASE 4'] + scaleCounts['UNKNOWN AGE'];

    var oemPhase = getRefRows('OEM / Customer List').map(function(r){ return r[0]; }).map(function(oemName){
      var op = phased.filter(function(p){ return p.oem === oemName; });
      var p1=0,p2=0,p3=0,p4=0,unk=0;
      op.forEach(function(p){ if(p.phase==='PHASE 1')p1++; else if(p.phase==='PHASE 2')p2++; else if(p.phase==='PHASE 3')p3++; else if(p.phase==='PHASE 4')p4++; else unk++; });
      var total=p1+p2+p3+p4+unk;
      var cleanupTotal=p4+unk; var cleanupPct=total>0?Math.round(cleanupTotal/total*100):0;
      return { oem:oemName, p1:p1, p2:p2, p3:p3, p4:p4, unknown:unk, total:total, cleanupPct:cleanupPct };
    });

    return <div className="space-y-5"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Service Life Phase</h1><p className="text-gray-500">15-year service-life window for sales managers, split into four phases by years remaining until service end (EOP). Phase 4 and Unknown Age are the biggest cleanup levers.</p></div><div className="flex items-center gap-2"><select value={oemPhaseFilter} onChange={function(e){ setOemPhaseFilter(e.target.value); }} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><option value="All">All OEMs</option>{Array.from(new Set(parts.map(function(p){ return p.oem; }).filter(Boolean))).sort().map(function(o){ return <option key={o} value={o}>{o}</option>; })}</select><button onClick={function(){ setYearSettingsOpen(true); }} title={'Phases are computed from the reference year. ' + (yearIsPinned ? 'Currently PINNED to ' + CURRENT_YEAR + '.' : 'Auto-rolling with the live clock.') + ' Click to change.'} className={'rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap ' + (yearIsPinned ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')}>📅 as of {CURRENT_YEAR}{yearIsPinned ? ' · pinned' : ''}</button><button onClick={function(){
  var wb = XLSX.utils.book_new();
  var tot = phased.length;
  var ws1Data = [['Phase','Part Count','% of Total','Description']];
  order.forEach(function(k){
    var m = phaseMeta[k];
    var cnt = phased.filter(function(p){ return p.phase === k; }).length;
    ws1Data.push([m.label, cnt, tot > 0 ? (cnt/tot*100).toFixed(1)+'%' : '0%', m.note]);
  });
  var ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  ws1['!freeze'] = { ySplit: 1 };
  ws1['!cols'] = [{wch:20},{wch:14},{wch:12},{wch:34}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Phase Summary');
  var ws2Data = [['OEM','0–5 Yrs','5–10 Yrs','10–15 Yrs','15+ Yrs','Unknown Age','Total','Cleanup %']];
  oemPhase.forEach(function(o){
    ws2Data.push([o.oem, o.p1, o.p2, o.p3, o.p4, o.unknown, o.total, o.cleanupPct+'%']);
  });
  var ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!freeze'] = { ySplit: 1 };
  ws2['!cols'] = [{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Per-OEM Breakdown');
  var ws3Data = [['Phase','Years Left','OEM','JSS Part','Description','Service EOP','Status']];
  phased.forEach(function(p){
    var m = phaseMeta[p.phase];
    ws3Data.push([m.label, p.yearsLeft === null ? 'Unknown' : p.yearsLeft <= 0 ? 'Overdue' : p.yearsLeft, p.oem, p.jss, p.desc, p.serviceEop, p.active]);
  });
  var ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
  ws3['!freeze'] = { ySplit: 1 };
  ws3['!cols'] = [{wch:16},{wch:12},{wch:16},{wch:18},{wch:40},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Part Detail');
  XLSX.writeFile(wb, 'service-life-phase-report-' + CURRENT_YEAR + '.xlsx');
}} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Export Phase Report</button></div></div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><StatCard title="Total Parts Phased" value={totalPhased.toLocaleString()} subtitle="Across the 15-year window" /><StatCard title="Phase 4 (15+ / Overdue)" value={scaleCounts['PHASE 4'].toLocaleString()} subtitle="Prime archive candidates" tone="red" /><StatCard title="Unknown Age" value={scaleCounts['UNKNOWN AGE'].toLocaleString()} subtitle="Missing EOP — needs data" /></div>

    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-900"><span className="font-bold">Cleanup lever:</span> {cleanupTargets.toLocaleString()} parts ({totalPhased > 0 ? Math.round(cleanupTargets / totalPhased * 100) : 0}% of the phased list) sit in Phase 4 or Unknown Age. Clearing these is the fastest path toward the active-list reduction goal. Parts with missing EOP data reclassify automatically once EOP is confirmed on import.</div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div className="bg-white rounded-xl border border-gray-200 p-5"><h2 className="font-bold text-gray-900 mb-1">Four-Quadrant Service-Life Map</h2><p className="text-sm text-gray-500 mb-4">Each quadrant is one phase of the 15-year window. Click a quadrant to filter the table.</p><div className="grid grid-cols-2 gap-3">{['PHASE 1','PHASE 2','PHASE 3','PHASE 4'].map(function(k){ var m = phaseMeta[k]; var active = phaseFilter === k; return <button key={k} onClick={function(){ setPhaseFilter(active ? 'All' : k); }} className={'text-left rounded-xl border p-4 transition-all ' + (toneCardBg[m.tone]) + (active ? ' ring-2 ring-offset-1 ring-blue-500' : '')}><div className="text-xs uppercase tracking-wide text-gray-500">{k}</div><div className={'font-bold ' + (toneText[m.tone])}>{m.label}</div><div className={'text-2xl font-bold mt-1 ' + (toneText[m.tone])}>{scaleCounts[k].toLocaleString()}</div><div className="text-xs text-gray-600 mt-1">{m.note}</div></button>; })}</div><div className={'w-full rounded-xl border p-4 mt-3 ' + toneCardBg.gray + (phaseFilter === 'UNKNOWN AGE' ? ' ring-2 ring-offset-1 ring-blue-500' : '')}>
  <div className="flex items-center justify-between">
    <button onClick={function(){ setPhaseFilter(phaseFilter === 'UNKNOWN AGE' ? 'All' : 'UNKNOWN AGE'); }} className="text-left flex-1">
      <div className="text-xs uppercase tracking-wide text-gray-500">UNKNOWN AGE</div>
      <div className="font-bold text-gray-600">Missing / invalid EOP</div>
    </button>
    <div className="flex items-center gap-3">
      <div className="text-2xl font-bold text-gray-600">{scaleCounts['UNKNOWN AGE'].toLocaleString()}</div>
      <button onClick={function(){ setEopFilter('Missing EOP'); setEopToast(true); setTimeout(function(){ setEopToast(false); }, 6000); setPage('Master Terminal'); }} className="bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 font-medium hover:bg-gray-700 whitespace-nowrap">Jump To →</button>
    </div>
  </div>
</div></div>

    <div className="bg-white rounded-xl border border-gray-200 p-5"><h2 className="font-bold text-gray-900 mb-1">Distribution Across the 15-Year Window</h2><p className="text-sm text-gray-500 mb-4">Relative volume per phase. Tall red/gray bars on the right are the cleanup opportunity.</p><div className="space-y-3">{order.map(function(k){ var m = phaseMeta[k]; var pct = Math.round(scaleCounts[k] / maxScale * 100); return <div key={k}><div className="flex items-center justify-between text-sm mb-1"><span className="font-medium text-gray-700">{m.label}</span><span className="text-gray-500">{scaleCounts[k].toLocaleString()}</span></div><div className="w-full bg-gray-100 rounded-full h-4"><div className={'h-4 rounded-full ' + (toneBar[m.tone] || toneBar.gray)} style={{ width: pct + '%' }}></div></div></div>; })}</div><div className="mt-5 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">Phases are recalculated automatically from EOP. When the EOP sheet updates a part's service-end year, it moves to the correct phase on the next import — no manual re-bucketing.</div></div></div>

    {(function(){
      // ---------- PER-OEM PHASE BREAKDOWN ----------
      // Representative full-scale phase counts per OEM so managers can track each company's cleanup progress.
      // unknownPrev = last review's Unknown-Age count, used to show progress (cleaned this period).
      // All 13 OEMs/customers present in the Master Terminal. Totals approximate the real row counts on file.
      // ---- PER-OEM PHASE BREAKDOWN — live from parts + refData ----
      var oemPhase = getRefRows('OEM / Customer List').map(function(r){ return r[0]; }).map(function(oemName){
        var op = phased.filter(function(p){ return p.oem === oemName; });
        var p1=0,p2=0,p3=0,p4=0,unk=0;
        op.forEach(function(p){ if(p.phase==='PHASE 1')p1++; else if(p.phase==='PHASE 2')p2++; else if(p.phase==='PHASE 3')p3++; else if(p.phase==='PHASE 4')p4++; else unk++; });
        var total=p1+p2+p3+p4+unk;
        var cleanupTotal=p4+unk; var cleanupPct=total>0?Math.round(cleanupTotal/total*100):0;
        return { oem:oemName, p1:p1, p2:p2, p3:p3, p4:p4, unknown:unk, unknownPrev:unk, total:total, cleanupTotal:cleanupTotal, cleanupPct:cleanupPct, cleaned:0, noData:total===0 };
      });
      oemPhase.sort(function(a, b){ return b.cleanupTotal - a.cleanupTotal; });

      var segMeta = [
        { key: 'p1', tone: 'PHASE 1', color: '#22c55e' },
        { key: 'p2', tone: 'PHASE 2', color: '#3b82f6' },
        { key: 'p3', tone: 'PHASE 3', color: '#f59e0b' },
        { key: 'p4', tone: 'PHASE 4', color: '#ef4444' },
        { key: 'unknown', tone: 'UNKNOWN AGE', color: '#9ca3af' }
      ];

      // ---- CLEANUP TREND — localStorage snapshots, builds automatically over time ----
      var _snaps; try { _snaps = JSON.parse(localStorage.getItem('phaseSnapshots') || '[]'); } catch(_e) { _snaps = []; }
      var _todayKey = new Date().toISOString().slice(0, 10);
      var _todayCycle = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      var _curP4 = phased.filter(function(p){ return p.phase === 'PHASE 4'; }).length;
      var _curUnk = phased.filter(function(p){ return p.phase === 'UNKNOWN AGE'; }).length;
      if (!_snaps.find(function(s){ return s.date === _todayKey; })) {
        _snaps = _snaps.concat([{ date: _todayKey, cycle: _todayCycle, cleanup: _curP4 + _curUnk, total: phased.length }]).slice(-20);
        try { localStorage.setItem('phaseSnapshots', JSON.stringify(_snaps)); } catch(_e2) {}
      }
      var _hasHistory = _snaps.length >= 2;
      var _base = _snaps[0] ? _snaps[0].cleanup : (_curP4 + _curUnk);
      var trend = _snaps.map(function(s){ return { cycle: s.cycle, cleared: Math.max(0, _base - s.cleanup), active: s.total }; });
      var totalCleared = _hasHistory ? Math.max(0, _snaps[0].total - _snaps[_snaps.length-1].total) : 0;
      var trendMax = Math.max.apply(null, trend.map(function(t){ return t.cleared; })) || 1;
      var tW = 600, tH = 100, n = trend.length, padX = 0, padY = 10;
      var pts = n === 1
        ? [{ x: tW/2, y: tH - padY, t: trend[0] }]
        : trend.map(function(t, i){ var x = (i/(n-1))*tW; var y = padY + (1 - t.cleared / trendMax) * (tH - padY * 2); return { x: x, y: y, t: t }; });
      function _smooth(points) {
        if (points.length < 2) return 'M' + points[0].x + ',' + points[0].y;
        return points.map(function(p, i) {
          if (i === 0) return 'M' + p.x.toFixed(1) + ',' + p.y.toFixed(1);
          var prev = points[i-1]; var cpx = (p.x - prev.x) * 0.38;
          return 'C' + (prev.x+cpx).toFixed(1) + ',' + prev.y.toFixed(1) + ' ' + (p.x-cpx).toFixed(1) + ',' + p.y.toFixed(1) + ' ' + p.x.toFixed(1) + ',' + p.y.toFixed(1);
        }).join(' ');
      }
      var linePath = _smooth(pts);
      var areaPath = linePath + ' L' + pts[pts.length-1].x.toFixed(1) + ',' + tH + ' L' + pts[0].x.toFixed(1) + ',' + tH + ' Z';
      var _lastCleared = trend.length ? trend[trend.length-1].cleared : 0;
      var _firstCleared = trend.length ? trend[0].cleared : 0;
      var _pctChange = (_firstCleared && _hasHistory) ? (((_lastCleared - _firstCleared) / (_firstCleared || 1)) * 100).toFixed(1) : null;

      var displayOem = oemPhaseFilter === 'All' ? oemPhase : oemPhase.filter(function(o){ return o.oem === oemPhaseFilter; });

      return <div className="bg-white rounded-xl border border-gray-200 p-5"><div className="flex items-start justify-between gap-4 mb-1"><div><h2 className="font-bold text-gray-900">Per-OEM Phase Breakdown</h2><p className="text-sm text-gray-500">Track each customer's service-life mix and cleanup progress. Click any OEM row to filter the detail table below; click again to clear.</p></div><div className="hidden md:flex items-center gap-3 text-xs">{segMeta.map(function(s){ return <div key={s.key} className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: s.color }}></span><span className="text-gray-600">{phaseMeta[s.tone].label}</span></div>; })}</div></div>

      <div className="mt-4 rounded-2xl overflow-hidden" style={{background:'#0d1117',border:'1px solid #21262d'}}>
        <style>{".rbdot{opacity:0;transition:opacity 0.15s}.rbline{opacity:0;transition:opacity 0.15s}.rbzone:hover .rbdot{opacity:1}.rbzone:hover .rbline{opacity:1}"}</style>
        <div style={{padding:'20px 24px 12px'}}>
          <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#8b949e',marginBottom:'6px'}}>
            Cleanup Trend · {_snaps.length} Snapshot{_snaps.length !== 1 ? 's' : ''}
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:'10px'}}>
            {_hasHistory
              ? <div style={{fontSize:'28px',fontWeight:700,color:'#3fb950',letterSpacing:'-0.03em',lineHeight:1}}>{totalCleared.toLocaleString()} <span style={{fontSize:'15px',fontWeight:500,color:'#8b949e'}}>parts cleared</span></div>
              : <div style={{fontSize:'22px',fontWeight:600,color:'#8b949e'}}>Building history…</div>
            }
            {_pctChange !== null && <div style={{marginBottom:'2px',fontSize:'12px',fontWeight:700,padding:'2px 8px',borderRadius:'6px',background:Number(_pctChange)>=0?'rgba(63,185,80,0.15)':'rgba(248,81,73,0.15)',color:Number(_pctChange)>=0?'#3fb950':'#f85149'}}>
              {Number(_pctChange)>=0?'↑':'↓'} {Math.abs(_pctChange)}%
            </div>}
          </div>
          <div style={{fontSize:'12px',color:'#8b949e',marginTop:'4px'}}>
            {_hasHistory
              ? <span>Tracked across <strong style={{color:'#c9d1d9'}}>{n}</strong> import cycles · auto-updates each visit</span>
              : <span>First point recorded {_snaps[0]?_snaps[0].cycle:_todayCycle} · returns each visit or import</span>
            }
          </div>
        </div>
        <div style={{position:'relative',height:'120px',padding:'0'}}>
          <svg viewBox={'0 0 ' + tW + ' ' + tH} width="100%" height="100%" preserveAspectRatio="none" style={{display:'block'}}>
            <defs>
              <linearGradient id="rbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3fb950" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3fb950" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25,0.5,0.75].map(function(f,gi){ var gy=(padY+f*(tH-padY*2)).toFixed(1); return <line key={gi} x1="0" y1={gy} x2={tW} y2={gy} stroke="#21262d" strokeWidth="0.8" />; })}
            {_hasHistory && <path d={areaPath} fill="url(#rbGrad)" />}
            {_hasHistory && <path d={linePath} fill="none" stroke="#3fb950" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {pts.map(function(p, i){
              var zoneX = i===0 ? 0 : (pts[i-1].x+p.x)/2;
              var nextX = i===pts.length-1 ? tW : (p.x+pts[i+1].x)/2;
              var zoneW = nextX - zoneX;
              return <g key={i} className="rbzone" style={{cursor:'crosshair'}}>
                <rect x={zoneX.toFixed(1)} y="0" width={zoneW.toFixed(1)} height={tH} fill="transparent" />
                <line className="rbline" x1={p.x.toFixed(1)} y1="0" x2={p.x.toFixed(1)} y2={tH} stroke="#8b949e" strokeWidth="1" strokeDasharray="3 3" />
                <circle className="rbdot" cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4.5" fill="#3fb950" stroke="#0d1117" strokeWidth="2.5" />
                <title>{p.t.cycle + ': ' + p.t.cleared + ' cleared'}</title>
              </g>;
            })}
          </svg>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',padding:'0 24px 16px',marginTop:'2px'}}>
          {trend.map(function(t,i){ return <span key={i} style={{fontSize:'11px',color:'#8b949e'}}>{t.cycle}</span>; })}
        </div>
      </div>

      {oemPhaseFilter !== 'All' && <div className="mt-3 flex items-center gap-2 text-sm"><span className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 font-medium">Filtering detail table by: {oemPhaseFilter}</span><button onClick={function(){ setOemPhaseFilter('All'); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Clear filter ×</button></div>}

      <div className="mt-4 border border-gray-100 rounded-lg overflow-x-auto"><div className="overflow-y-auto" style={{ maxHeight: '340px' }}><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">OEM</th><th className="text-left p-3 w-1/3">Phase Mix</th><th className="text-right p-3">Total</th><th className="text-right p-3 text-green-700">P1</th><th className="text-right p-3 text-blue-700">P2</th><th className="text-right p-3 text-amber-700">P3</th><th className="text-right p-3 text-red-700">P4</th><th className="text-right p-3">Unknown Age</th><th className="text-right p-3">Cleanup Load</th><th className="text-right p-3">Progress</th></tr></thead><tbody>{displayOem.map(function(o){ var sel = oemPhaseFilter === o.oem; var clearPct = o.unknownPrev > 0 ? Math.round(o.cleaned / o.unknownPrev * 100) : 0; var clearTip = o.cleaned > 0 ? (o.oem + ' cleared ' + o.cleaned.toLocaleString() + ' Unknown-Age parts since last review (' + o.unknownPrev.toLocaleString() + ' → ' + o.unknown.toLocaleString() + ', ' + clearPct + '% reduction). Phase 4 still open: ' + o.p4.toLocaleString() + '.') : (o.oem + ': no Unknown-Age parts cleared since last review. Current Unknown-Age load: ' + o.unknown.toLocaleString() + '.'); if(o.noData) return <tr key={o.oem} className="border-t border-gray-100 opacity-40"><td className="p-3 font-medium text-gray-400">{o.oem}</td><td className="p-3"><div className="h-4 rounded-full bg-gray-200 w-32"></div></td><td className="p-3 text-right text-gray-400">—</td><td className="p-3 text-right text-gray-400">—</td><td className="p-3 text-right text-gray-400">—</td><td className="p-3 text-right text-gray-400">—</td><td className="p-3 text-right italic text-gray-400 text-xs">No data</td></tr>;
return <tr key={o.oem} onClick={function(){ setOemPhaseFilter(sel ? 'All' : o.oem); }} className={'border-t border-gray-100 cursor-pointer ' + (sel ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-blue-50')}><td className="p-3 font-medium">{o.oem}</td><td className="p-3"><div className="flex w-full h-4 rounded-full overflow-hidden bg-gray-100">{segMeta.map(function(s){ var pct = o[s.key] / o.total * 100; return <div key={s.key} title={o.oem + ' · ' + phaseMeta[s.tone].label + ' (' + s.tone + ')\n' + o[s.key].toLocaleString() + ' parts · ' + (Math.round(pct * 10) / 10) + '% of ' + o.oem + "'s list (" + o.total.toLocaleString() + ' total)\n' + phaseMeta[s.tone].note} style={{ width: pct + '%', backgroundColor: s.color }}></div>; })}</div></td><td className="p-3 text-right">{o.total.toLocaleString()}</td><td className="p-3 text-right text-green-700">{o.p1.toLocaleString()}</td><td className="p-3 text-right text-blue-700">{o.p2.toLocaleString()}</td><td className="p-3 text-right text-amber-700">{o.p3.toLocaleString()}</td><td className="p-3 text-right text-red-600 font-medium">{o.p4.toLocaleString()}</td><td className="p-3 text-right text-gray-600 font-medium">{o.unknown.toLocaleString()}</td><td className="p-3 text-right"><span className={'px-2 py-1 rounded-full text-xs font-medium ' + (o.cleanupPct >= 40 ? 'bg-red-100 text-red-800' : o.cleanupPct >= 25 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800')}>{o.cleanupPct}%</span></td><td className="p-3 text-right">{o.cleaned > 0 ? <span title={clearTip} className="text-green-700 font-medium cursor-help border-b border-dotted border-green-400">▼ {o.cleaned.toLocaleString()} cleared</span> : <span title={clearTip} className="text-gray-400 cursor-help">—</span>}</td></tr>; })}</tbody></table></div></div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-900"><span className="font-bold">Watch list:</span> {(function(){
              var top2 = oemPhase.filter(function(o){ return o.unknown > 0; }).sort(function(a,b){ return b.unknown - a.unknown; }).slice(0,2).map(function(o){ return o.oem; });
              return top2.length >= 2
                ? top2[0] + ' and ' + top2[1] + ' carry the heaviest Unknown-Age load. Fixing their source EOP files reclassifies the most parts at once and moves the whole program forward fastest.'
                : top2.length === 1
                  ? top2[0] + ' carries the heaviest Unknown-Age load. Fixing their source EOP files reclassifies the most parts at once.'
                  : 'No Unknown-Age parts detected — all OEMs are fully classified.';
            })()}</div><div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-900"><span className="font-bold">Progress this period:</span> the "cleared" column shows how many Unknown-Age parts each OEM resolved since the last review — your running scoreboard against the reduction goal.</div></div></div>;
    })()}

    <div className="bg-white rounded-xl border border-gray-200 p-3 flex gap-2 flex-wrap items-center" style={{position:"sticky",top:0,zIndex:20}}>{['All','PHASE 1','PHASE 2','PHASE 3','PHASE 4','UNKNOWN AGE'].map(function(k){ var lbl = k === 'All' ? 'All Phases' : phaseMeta[k].label; return <button key={k} onClick={function(){ setPhaseFilter(k); }} className={(phaseFilter === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700') + ' rounded-lg px-3 py-2 text-sm'}>{lbl}</button>; })}<div className="ml-auto flex items-center gap-2"><label className="text-xs text-gray-500 font-medium">OEM:</label><select value={oemPhaseFilter} onChange={function(e){ setOemPhaseFilter(e.target.value); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><option value="All">All OEMs</option>{oemKeys.map(function(o){ return <option key={o} value={o}>{o}</option>; })}</select>{oemPhaseFilter !== 'All' && <button onClick={function(){ setOemPhaseFilter('All'); }} className="text-xs text-blue-600 hover:text-blue-800">Clear</button>}</div></div>

    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Phase</th><th className="text-left p-3">Years Left</th><th className="text-left p-3">OEM</th><th className="text-left p-3">JSS Part</th><th className="text-left p-3">Description</th><th className="text-left p-3">Service EOP</th><th className="text-left p-3">Status</th><th className="text-left p-3">Recommendation</th></tr></thead><tbody>{rows.filter(function(p){ return !isArchived(p); }).map(function(rawP){ var p = resolvePart(rawP); return <tr key={p.id} onClick={function(){ setSelectedPart(p); }} className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer"><td className="p-3"><PhasePill phase={p.phase} /></td><td className="p-3">{p.yearsLeft === null ? '—' : (p.yearsLeft <= 0 ? 'Overdue' : p.yearsLeft + ' yrs')}</td><td className="p-3 font-medium">{p.oem}</td><td className="p-3 font-mono text-xs">{p.jss}</td><td className="p-3 max-w-xs truncate">{p.desc}</td><td className="p-3">{p.serviceEop}</td><td className="p-3"><Badge tone={p.active === 'ACTIVE' ? 'Active' : p.active === 'INACTIVE' ? 'Inactive' : 'Unknown'}>{p.active}</Badge></td><td className="p-3">{p.recommendation}</td></tr>; })}</tbody></table></div>{rows.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No sample parts in this phase.</div>}</div></div>;
  }

  // Merge the static refData with any in-app additions/edits the user made (refOverrides).
  // refOverrides[listName] = { rows: [...] } fully replaces that list's rows once touched.
  function getRefRows(listName) {
    if (refOverrides[listName] && refOverrides[listName].rows) return refOverrides[listName].rows;
    return refData[listName].rows;
  }

export { ServiceLifePhase };