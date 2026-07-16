// components/import/ImportWizard.jsx
// Excel Import Wizard — column mapping, preview, and Supabase commit.

import React from 'react';
import { AppContext } from '../../context/AppContext.jsx';

import { _supa } from '../../lib/supabase.js';
import { MultiSelectDropdown } from '../shared/MultiSelectDropdown.jsx';


function ImportWizard() {
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
    importTargetGroups, refData
  } = ctx;
    const steps = ['Upload File', 'Configure & Filter', 'Scan & Map', 'Validate', 'Preview', 'Approve'];

    function pickFile(f) {
      var maps = {};
      f.headers.forEach(function(h){ var a = autoMap(h); maps[h] = { target: a.t, conf: a.c }; });
      setImportFile(f); setImportMaps(maps); setImportStep(1);
    }
    function setTarget(h, t) { setImportMaps(Object.assign({}, importMaps, { [h]: Object.assign({}, importMaps[h], { target: t }) })); }
    function confTone(c) { return c >= 95 ? 'bg-green-100 text-green-800' : c >= 85 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'; }

    // Stepper bar
    var stepper = <div className="flex items-center gap-2 flex-wrap">{steps.map(function(s, i){ var done = i < importStep; var cur = i === importStep; return <div key={s} className="flex items-center gap-2"><div className={(cur ? 'bg-blue-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500') + ' w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold'}>{done ? '✓' : i + 1}</div><span className={(cur ? 'text-blue-700 font-semibold' : 'text-gray-500') + ' text-sm'}>{s}</span>{i < steps.length - 1 && <span className="text-gray-300">›</span>}</div>; })}</div>;

    var header = <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Import Wizard</h1><p className="text-gray-500">Upload messy OEM, manager, plant, and SAP files. The AI auto-maps columns, scores confidence, and previews every change before commit.</p></div>{importFile && <button onClick={function(){ setImportFile(null); setImportStep(0); setImportGlobalOEM(''); setImportGlobalPlant(''); setImportAckNoCust(false); }} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Start Over</button>}</div>;

    // STEP 0 — choose a file
    if (importStep === 0 || !importFile) {
      return <div className="space-y-6">{header}{stepper}<div className="bg-white rounded-xl border border-gray-200 p-6"><div onClick={handleUploadClick} onDragOver={function(e){ e.preventDefault(); }} onDrop={function(e){ e.preventDefault(); if(e.dataTransfer.files && e.dataTransfer.files[0]){ handleFileChosen({ target: { files: e.dataTransfer.files } }); } }} className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50 cursor-pointer hover:bg-blue-100 hover:border-blue-400 transition-colors"><div className="text-3xl mb-2">📄</div><div className="font-bold text-gray-900">Drop an Excel / CSV file here</div><div className="text-sm text-gray-500">Drag and drop your file above, or click the drop zone to browse for a file.</div></div>{(function(){
          var recentImps = (rawAudit||[]).filter(function(a){ return a.action === 'IMPORT COMMIT'; }).slice(0,5);
          if (!recentImps.length) return <div className="bg-white rounded-xl border border-gray-200 p-5"><h2 className="font-bold text-gray-900 mb-3">Recent Imports</h2><div className="text-sm text-gray-400 py-3">No recent imports yet.</div></div>;
          return <div className="bg-white rounded-xl border border-gray-200 p-5"><h2 className="font-bold text-gray-900 mb-3">Recent Imports</h2><div className="space-y-2">{recentImps.map(function(a){ return <div key={a.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2"><div><div className="text-sm font-medium text-gray-800">{a.target || 'Import'}</div><div className="text-xs text-gray-400">{a.detail || ''}</div></div><div className="text-xs text-gray-400 whitespace-nowrap ml-4">{a.ts ? new Date(a.ts).toLocaleDateString() : '—'} · {a.user || '—'}</div></div>; })}</div></div>;
        })()}</div></div>;
    }

    var f = importFile;
    var mappedFields = Object.keys(importMaps).map(function(h){ return importMaps[h].target; }).filter(function(t){ return t !== '— Ignore —'; });
    var hasCustomer = mappedFields.indexOf('Customer Part #') >= 0;
    var hasJss = mappedFields.indexOf('JSS Part #') >= 0;
    var lowConf = Object.keys(importMaps).filter(function(h){ return importMaps[h].conf < 85 && importMaps[h].target !== '— Ignore —'; });

    // STEP 1 — Configure & Filter
    if (importStep === 1) {
      return <ConfigureFilterStep
        importSheets={importSheets}
        importSelectedSheets={importSelectedSheets}
        setImportSelectedSheets={setImportSelectedSheets}
        importRowFilters={importRowFilters}
        setImportRowFilters={setImportRowFilters}
        importWorkbookBuf={importWorkbookBuf}
        importFile={importFile}
        setImportFile={setImportFile}
        setImportMaps={setImportMaps}
        setImportStep={setImportStep}
        autoMap={autoMap}
        header={header}
        stepper={stepper}
      />;
    }

        // STEP 2 — scan & map columns
    if (importStep === 2) {
      return <div className="space-y-6">{header}{stepper}<div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900"><span className="font-bold">{f.source}</span> · sheet <span className="font-mono">{f.sheet}</span> · {f.rows.toLocaleString()} rows. The AI matched each source column to a database field with a confidence score. Review and correct any low-confidence rows, then continue.</div><div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Source Column</th><th className="text-left p-3">Sample Value</th><th className="text-left p-3">Maps To Field</th><th className="text-center p-3">Confidence</th></tr></thead><tbody>{f.headers.map(function(h, i){ var m = importMaps[h]; return <tr key={h} className="border-t border-gray-100"><td className="p-3 font-mono text-xs">{h}</td><td className="p-3 text-gray-500 text-xs">{(f.sample && f.sample[0] && f.sample[0][i] !== undefined) ? String(f.sample[0][i]) : ''}</td><td className="p-3"><select value={m.target} onChange={function(e){ setTarget(h, e.target.value); }} className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white">{importTargetGroups.map(function(g){ return g.tier === '— Ignore —' ? <option key="ignore" value="— Ignore —">— Ignore —</option> : <optgroup key={g.tier} label={g.tier}>{g.fields.map(function(f){ return <option key={f.value} value={f.value}>{f.label}{f.hint ? ' — ' + f.hint.replace(/^[^·]+·\s*/, '') : ''}</option>; })}</optgroup>; })}</select></td><td className="p-3 text-center"><span className={'px-2 py-1 rounded-full text-xs font-medium ' + confTone(m.conf)}>{m.conf}%</span></td></tr>; })}</tbody></table></div></div><div className="flex justify-between items-center"><div className="text-sm text-gray-500">{lowConf.length > 0 ? lowConf.length + ' low-confidence mapping(s) — please confirm.' : 'All mappings look confident.'}</div><button onClick={function(){ setImportStep(3); }} className="bg-blue-600 text-white rounded-lg px-5 py-2 font-medium">Validate Data &rarr;</button></div></div>;
    }

    // build validation checks
    var mappedTargets = Object.keys(importMaps).map(function(h){ return importMaps[h].target; });
    var hasOEM = mappedTargets.indexOf('OEM / Customer') >= 0 || importGlobalOEM.trim() !== '';
    var hasPlant = mappedTargets.indexOf('JSS Plant') >= 0 || importGlobalPlant.trim() !== '' || true; // plant is optional — blank allowed
    var placeholderCount = 0, conflictCount = 0;
    if (f.dataRows && hasCustomer) {
    var custHeader = null; Object.keys(importMaps).forEach(function(h){ if (importMaps[h].target === 'Customer Part #') custHeader = h; });
    var jssHeader = null; Object.keys(importMaps).forEach(function(h){ if (importMaps[h].target === 'JSS Part #') jssHeader = h; });
    f.dataRows.forEach(function(row){
    var c = custHeader ? String(row[custHeader] || '').trim() : '';
    var j = jssHeader ? String(row[jssHeader] || '').trim() : '';
    if ((c && isPlaceholder(c)) || (j && isPlaceholder(j))) placeholderCount++;
    });
    }
    var oemColMapped = mappedTargets.indexOf('OEM / Customer') >= 0;
    var plantColMapped = mappedTargets.indexOf('JSS Plant') >= 0;
    var custOk = hasCustomer || importAckNoCust;
    var oemOk  = oemColMapped || importGlobalOEM.trim() !== '';
    var plantOk = true; // always optional — edit via pencil icon in terminal

    var checks = [
      {
        label: 'Customer Part # mapped',
        pass: hasCustomer || importAckNoCust,
        warn: !hasCustomer && importAckNoCust,
        detail: hasCustomer
          ? 'Found and mapped.'
          : importAckNoCust
            ? 'No customer part # in this file — acknowledged. Parts will be identified by JSS Part # only.'
            : 'Not mapped. If this file has no customer part #, check the box below to acknowledge and continue.'
      },
      {
        label: 'JSS Part # mapped',
        pass: hasJss,
        detail: hasJss ? 'Found and mapped.' : 'Required identifier not mapped — go back and assign it.'
      },
      {
        label: 'OEM / Customer',
        pass: oemOk,
        warn: !oemColMapped && importGlobalOEM.trim() !== '',
        detail: oemColMapped
          ? 'OEM column mapped — aliases will be normalized on commit.'
          : importGlobalOEM.trim() !== ''
            ? 'No OEM column in file — all rows will be assigned to: ' + importGlobalOEM.trim()
            : 'No OEM column mapped. Declare a global OEM below, or go back and map it.'
      },
      {
        label: 'Plant (optional)',
        pass: true,
        warn: !plantColMapped && importGlobalPlant.trim() === '',
        detail: plantColMapped
          ? 'Plant column mapped.'
          : importGlobalPlant.trim() !== ''
            ? 'No plant column in file — all rows will be assigned to: ' + importGlobalPlant.trim()
            : 'No plant column in file and no global plant set. Plant will be left blank — you can fill it later via the pencil icon in any terminal.'
      },
      {
        label: 'Placeholder IDs detected',
        pass: placeholderCount === 0,
        warn: placeholderCount > 0,
        detail: placeholderCount > 0
          ? placeholderCount + ' row(s) with 0 / blank identifiers will be flagged for Data Quality.'
          : 'No placeholder rows detected.'
      },
      {
        label: 'Conflicts vs. existing records',
        pass: true,
        detail: 'Conflict detection runs on commit against the live parts table.',
        warn: false
      }
    ];
    var canCommit = hasJss && custOk && oemOk;

    // STEP 3 — validate
    if (importStep === 3) {
      // Live lists — sourced directly from Reference Data (respects any adds/edits made there)
      var OEM_LIST = getRefRows('OEM / Customer List')
        .map(function(r){ return r[0]; })
        .filter(Boolean);
      var PLANT_LIST = getRefRows('Plant List')
        .filter(function(r){ return String(r[5] || '').toLowerCase() === 'active'; })
        .map(function(r){ return r[0] + ' – ' + r[1]; })  // "PlantCode – Location"
        .filter(Boolean);
      return <div className="space-y-6">{header}{stepper}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
          <h2 className="font-bold text-gray-900 mb-2">Validation Results</h2>
          {checks.map(function(c){ return <div key={c.label} className="flex items-start justify-between border-b border-gray-100 py-3 last:border-b-0"><div><div className="font-medium text-gray-900 text-sm">{c.label}</div><div className="text-xs text-gray-500 mt-0.5">{c.detail}</div></div><span className={((c.pass ? (c.warn ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800') : 'bg-red-100 text-red-800')) + ' rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap'}>{c.pass ? (c.warn ? 'FLAGGED' : 'PASS') : 'FAIL'}</span></div>; })}
        </div>

        {(!oemColMapped || !plantColMapped || !hasCustomer) && <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Fill in Missing Information</h2>
          <p className="text-sm text-gray-500">Your file is missing some columns. Declare them here so all rows are tagged correctly — or acknowledge that the info isn't available and continue.</p>

          {!oemColMapped && <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">OEM / Customer <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(required to proceed)</span></label>
            <p className="text-xs text-gray-400">This entire file belongs to one OEM. Select it and all imported rows will be tagged automatically.</p>
            <select value={importGlobalOEM} onChange={function(e){ setImportGlobalOEM(e.target.value); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs bg-white">
              <option value="">— Select OEM —</option>
              {OEM_LIST.map(function(o){ return <option key={o} value={o}>{o}</option>; })}
            </select>
            {importGlobalOEM && <p className="text-xs text-green-600 mt-1">✅ All rows will be tagged as: <strong>{importGlobalOEM}</strong></p>}
          </div>}

          {!plantColMapped && <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">JSS Plant <span className="text-gray-400 font-normal">(optional)</span></label>
            <p className="text-xs text-gray-400">If all rows belong to one plant, select it. Otherwise leave blank — you can edit plant info later via the pencil icon in any terminal.</p>
            <select value={importGlobalPlant} onChange={function(e){ setImportGlobalPlant(e.target.value); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs bg-white">
              <option value="">— Leave blank (fill in later) —</option>
              {PLANT_LIST.map(function(o){ return <option key={o} value={o}>{o}</option>; })}
            </select>
            {importGlobalPlant && importGlobalPlant !== '— Leave blank —' && <p className="text-xs text-green-600 mt-1">✅ All rows will be tagged as: <strong>{importGlobalPlant}</strong></p>}
          </div>}

          <div className="space-y-1 pt-2 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700">Active / Inactive status <span className="text-gray-400 font-normal">(bulk override)</span></label>
            <p className="text-xs text-gray-400">Applies to all {(importFile && importFile.rows) ? importFile.rows.toLocaleString() : '0'} filtered rows at commit time. Overrides any mapped Active Y/N column.</p>
            <select value={importBulkStatus} onChange={function(e){ setImportBulkStatus(e.target.value); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs bg-white">
              <option value="none">— Use source value —</option>
              <option value="active">Force ACTIVE for all rows</option>
              <option value="inactive">Force INACTIVE for all rows</option>
            </select>
            {importBulkStatus === 'active' && <p className="text-xs text-green-600 mt-1">✅ All {(importFile && importFile.rows) ? importFile.rows.toLocaleString() : '0'} rows will be marked ACTIVE on commit.</p>}
            {importBulkStatus === 'inactive' && <p className="text-xs text-amber-600 mt-1">⚠ All {(importFile && importFile.rows) ? importFile.rows.toLocaleString() : '0'} rows will be marked INACTIVE on commit.</p>}
          </div>

          {!hasCustomer && <label className="flex items-start gap-3 cursor-pointer p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <input type="checkbox" checked={importAckNoCust} onChange={function(e){ setImportAckNoCust(e.target.checked); }} className="accent-amber-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-900">This file does not contain Customer Part #'s — I understand parts will be matched by JSS Part # only</div>
              <div className="text-xs text-amber-700 mt-0.5">You can add customer part numbers later by editing individual rows in the terminal.</div>
            </div>
          </label>}
        </div>}

        <div className="flex justify-between items-center">
          <button onClick={function(){ setImportStep(2); }} className="bg-gray-100 text-gray-700 rounded-lg px-5 py-2 font-medium">&larr; Back to Mapping</button>
          {!canCommit && <p className="text-xs text-red-500">Resolve FAIL items above to continue.</p>}
          <button disabled={!canCommit} onClick={function(){ setImportStep(4); }} className={(canCommit ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed') + ' rounded-lg px-5 py-2 font-medium'}>Preview Changes &rarr;</button>
        </div>
      </div>;
    }

// STEP 4 — preview (real data)
    if (importStep === 4) {
      var previewCols = f.headers.filter(function(h){ return importMaps[h].target !== '— Ignore —'; });
      var custH = null, jssH = null;
      Object.keys(importMaps).forEach(function(h){
        if (importMaps[h].target === 'Customer Part #') custH = h;
        if (importMaps[h].target === 'JSS Part #') jssH = h;
      });
      var existingKeys = {};
      parts.forEach(function(p){ if (p.customerPart) existingKeys[String(p.customerPart).trim().toUpperCase()] = p; if (p.jss) existingKeys[String(p.jss).trim().toUpperCase()] = p; });
      var newCount = 0, updateCount = 0, flagCount = 0, unchangedCount = 0;
      (f.dataRows || []).forEach(function(row){
        var c = custH ? String(row[custH] || '').trim().toUpperCase() : '';
        var j = jssH ? String(row[jssH] || '').trim().toUpperCase() : '';
        var key = c || j;
        if (!key) { flagCount++; return; }
        // Only check isPlaceholder on fields the user actually mapped
        if (custH && c && isPlaceholder(c)) { flagCount++; return; }
        if (jssH && j && isPlaceholder(j)) { flagCount++; return; }
        if (existingKeys[key]) updateCount++; else newCount++;
      });
      unchangedCount = Math.max(0, (f.rows || 0) - newCount - updateCount - flagCount);
      var previewRows = (f.dataRows || []).slice(0, 5);
      return <div className="space-y-6">{header}{stepper}<div className="grid grid-cols-1 md:grid-cols-4 gap-4"><StatCard title="New Parts" value={String(newCount)} subtitle="Not seen before" tone="green" /><StatCard title="Updated Fields" value={String(updateCount)} subtitle="Existing parts matched" /><StatCard title="Flagged for Review" value={String(flagCount)} subtitle="Placeholders / missing IDs" tone="orange" /><StatCard title="Unchanged" value={String(unchangedCount)} subtitle="No difference" /></div><div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="p-3 border-b border-gray-100 font-bold text-gray-900 text-sm flex items-center justify-between"><span>Mapped Preview (first {previewRows.length} rows)</span><span className="text-xs font-normal text-gray-400 bg-blue-50 border border-blue-100 text-blue-700 rounded-full px-2 py-0.5">🤖 AI Review active</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">AI Review</th>{previewCols.map(function(h){ return <th key={h} className="text-left p-3">{importMaps[h].target}</th>; })}</tr></thead><tbody>{previewRows.map(function(row, ri){
        // ── AI REVIEW LOGIC (uses USER MAPPINGS, not raw column names) ──────
        var aiFlags = [];
        // Build reverse lookup: target field -> source column the user mapped
        var mapTo = {};
        Object.keys(importMaps).forEach(function(h){ mapTo[importMaps[h].target] = h; });
        function getMapped(target){ var src = mapTo[target]; return src ? row[src] : undefined; }
        // 1. Status vs EOP mismatch (uses mapped Service EOP + Active Y/N)
        var eopRaw = getMapped('Service EOP');
        var statusRaw = getMapped('Active Y/N');
        var eopYear = parseInt(eopRaw, 10);
        var statusVal = String(statusRaw || '').trim();
        if (!isNaN(eopYear) && eopYear < 2011 && (!statusVal || statusVal === '')) aiFlags.push({ type: 'flag', msg: 'EOP ' + eopYear + ' is pre-2011 — verify if truly active' });
        // 2. INVALID description (uses MAPPED Description column only)
        var descRaw = getMapped('Description');
        var descUp = String(descRaw || '').trim().toUpperCase();
        if (descUp === 'INVALID PART' || descUp === 'INVALID' || descUp === 'OBSOLETE' || descUp === 'OBS') aiFlags.push({ type: 'flag', msg: 'Description column says "' + descUp + '" — likely inactive part' });
        // 3. Part number checks — respect mappings + "no customer #" ack
        var jssMapped = mapTo['JSS Part #'];
        var custMapped = mapTo['Customer Part #'];
        var altMapped = mapTo['Alt JSS Part #'];
        var jssVal = jssMapped ? String(row[jssMapped] || '').trim() : '';
        var custVal = custMapped ? String(row[custMapped] || '').trim() : '';
        var altVal  = altMapped  ? String(row[altMapped]  || '').trim() : '';
        if (!jssVal && !custVal && !altVal) {
          aiFlags.push({ type: 'flag', msg: 'No part number detected (JSS, Customer, or Alt JSS all empty)' });
        } else {
          // Specific missing-field flags
          if (jssMapped && !jssVal) aiFlags.push({ type: 'flag', msg: 'JSS Part # missing on this row' });
          // Only flag missing Customer Part # if (a) user mapped a Customer Part # column AND (b) didn't ack file has none
          if (custMapped && !custVal && !importAckNoCust) aiFlags.push({ type: 'flag', msg: 'Customer Part # missing on this row' });
          // If user did NOT map Customer Part # AND did NOT ack file has none, that's a setup warning (note, not flag)
          if (!custMapped && !importAckNoCust) aiFlags.push({ type: 'note', msg: 'Customer Part # column not mapped — acknowledge on Validate step if file has none' });
        }
        // 4. Price outlier (uses mapped Service Price)
        var priceRaw = getMapped('Service Price');
        var priceVal = parseFloat(priceRaw || 0);
        if (priceVal > 50000) aiFlags.push({ type: 'flag', msg: 'Price $' + priceVal.toFixed(0) + ' looks unusually high — verify' });
        if (priceVal > 0 && priceVal < 0.01) aiFlags.push({ type: 'flag', msg: 'Price very low — possible unit mismatch' });
        // 5. Duplicate check vs existing master
        var partKey = String(getMapped('JSS Part #') || getMapped('Customer Part #') || '').trim().toUpperCase();
        var isDupe = partKey && existingKeys[partKey];
        if (isDupe && aiFlags.length === 0) aiFlags.push({ type: 'ok', msg: 'Matched existing record — will update' });
        // Determine badge
        var badge;
        if (aiFlags.length === 0) badge = <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">🟢 OK</span>;
        else if (aiFlags.some(function(f){ return f.type === 'flag'; })) badge = <span title={aiFlags.map(function(f){ return f.msg; }).join(' | ')} className="cursor-help px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">🟡 Flag</span>;
        else badge = <span title={aiFlags.map(function(f){ return f.msg; }).join(' | ')} className="cursor-help px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">🔵 Note</span>;
        return <tr key={ri} className="border-t border-gray-100"><td className="p-3"><div className="flex flex-col gap-1">{badge}{aiFlags.map(function(f, fi){ return <div key={fi} className="text-xs text-gray-500 max-w-xs">{f.msg}</div>; })}</div></td>{previewCols.map(function(h, ci){ return <td key={ci} className="p-3 text-xs">{String(row[h] !== undefined ? row[h] : '')}</td>; })}</tr>;
      })}</tbody></table></div></div><div className="flex justify-between items-center"><button onClick={function(){ setImportStep(3); }} className="bg-gray-100 text-gray-700 rounded-lg px-5 py-2 font-medium">&larr; Back</button><button onClick={function(){
        try {
        // COMMIT: build new part rows + update matched ones
        var custH2 = null, jssH2 = null;
        Object.keys(importMaps).forEach(function(h){
          if (importMaps[h].target === 'Customer Part #') custH2 = h;
          if (importMaps[h].target === 'JSS Part #') jssH2 = h;
        });
        var existingMap = {};
        parts.forEach(function(p, idx){ if (p.customerPart) existingMap[String(p.customerPart).trim().toUpperCase()] = idx; if (p.jss) existingMap[String(p.jss).trim().toUpperCase()] = idx; });
        var targetToField = { 'Customer Part #':'customerPart','JSS Part #':'jss','Alt JSS Part #':'altJss','OEM / Customer':'oem','JSS Plant':'plant','Description':'desc','Active Y/N':'status','Product Type':'type','Component Family':'component','Subcategory':'subcategory','Program':'program','Priority':'priority','Service Price':'price','Std Cost':'cost','Demand':'demand','Backlog':'backlog','Service SOP':'serviceSop','Service EOP':'serviceEop','Serial SOP':'serialSop','Serial EOP':'serialEop' };
        var newParts = parts.slice();
        var newCnt = 0, updCnt = 0, flagCnt = 0;
        (f.dataRows || []).forEach(function(row){
          var mapped = {};
          Object.keys(importMaps).forEach(function(h){
            var tgt = importMaps[h].target;
            var field = targetToField[tgt];
            if (field && row[h] !== undefined && row[h] !== '') mapped[field] = row[h];
          });
          if (mapped.oem) { mapped.oem = String(mapped.oem).trim().toUpperCase(); }
          // ── Global overrides declared on the Validate step ──
          if (!mapped.oem && importGlobalOEM && importGlobalOEM.trim() !== '') { mapped.oem = importGlobalOEM.trim(); }
          if (!mapped.plant && importGlobalPlant && importGlobalPlant.trim() !== '' && importGlobalPlant !== '— Leave blank —') { mapped.plant = importGlobalPlant.trim(); }
          // ── Bulk Active/Inactive override from Configure & Filter step ──
          if (importBulkStatus === 'active') { mapped.status = 'ACTIVE'; }
          else if (importBulkStatus === 'inactive') { mapped.status = 'INACTIVE'; }
          var c = mapped.customerPart ? String(mapped.customerPart).trim().toUpperCase() : '';
          var j = mapped.jss ? String(mapped.jss).trim().toUpperCase() : '';
          var key = c || j;
          if (!key) { flagCnt++; return; }
          // Only flag if a present value is itself a placeholder; don't flag empty unmapped fields
          if (c && isPlaceholder(c)) { flagCnt++; return; }
          if (j && isPlaceholder(j)) { flagCnt++; return; }
          if (existingMap[key] !== undefined) {
            var idx = existingMap[key];
            newParts[idx] = Object.assign({}, newParts[idx], mapped);
            updCnt++;
          } else {
            // ── AUTO-CLASSIFY ──────────────────────────────────────────────
            // If Component Family wasn't explicitly mapped from a column,
            // scan the description against Product Category Aliases patterns.
            if (!mapped.component && mapped.desc) {
            var _desc = String(mapped.desc).toLowerCase();
            var _aliases = (refData['Product Category Aliases'] && refData['Product Category Aliases'].rows) || [];
            for (var _ai = 0; _ai < _aliases.length; _ai++) {
            var _pat = String(_aliases[_ai][0] || '').toLowerCase().trim();
            if (_pat && _desc.indexOf(_pat) >= 0) {
            mapped.component = mapped.component || _aliases[_ai][2]; // Component Family
            mapped.subcategory = mapped.subcategory || _aliases[_ai][1]; // Subcategory (Maps To)
            break;
                }  
              }
            }
            // If still unclassified → flag for Classification Manager review
            if (!mapped.component) {
            mapped.component = 'UNASSIGNED';
            mapped.needsClassification = true;
            }
            // ──────────────────────────────────────────────────────────────
            mapped.id = 'IMP-' + Date.now() + '-' + newCnt;
            mapped.priority = mapped.priority || 'Medium';
            mapped.status = mapped.status || 'ACTIVE';
            // Safe defaults for all fields the render pipeline expects (prevents undefined.indexOf crashes)
            var SAFE_DEFAULTS = {
              oem: '', plant: '', customerPart: '', jss: '', altJss: '',
              desc: '', active: mapped.status || 'ACTIVE', type: '',
              component: mapped.component || 'UNASSIGNED', subcategory: '', program: '',
              price: '', cost: '', demand: 0, backlog: 0,
              serviceSop: '', serviceEop: '', serialSop: '', serialEop: '',
              category: '', productCategory: '', recommendation: '',
              owner: '', notes: ''
            };
            Object.keys(SAFE_DEFAULTS).forEach(function(k){
              if (mapped[k] === undefined || mapped[k] === null) mapped[k] = SAFE_DEFAULTS[k];
            });
            // Serial EOP → Service EOP auto-mapping: if serviceEop is missing but serialEop is present, set serviceEop = serialEop + 15
            if ((!mapped.serviceEop || String(mapped.serviceEop).trim() === '') && mapped.serialEop) {
              var _serialEopYear = parseInt(String(mapped.serialEop).trim(), 10);
              if (!isNaN(_serialEopYear) && _serialEopYear > 0) { mapped.serviceEop = String(_serialEopYear + 15); }
            }
            newParts.push(mapped);
            newCnt++;
          }
        });
        setRawParts(newParts);newParts.forEach(function(pt){ _supaWrite('parts', pt); });
        var auditRec = { id: 'IMP-' + Date.now(), action: 'IMPORT COMMIT', target: f.name,
          user: currentUser ? (currentUser.name || currentUser.email || 'Unknown') : 'Unknown',
          ts: new Date().toISOString(),
          detail: newCnt + ' new, ' + updCnt + ' updated, ' + flagCnt + ' flagged' };
        _supaWrite('audit_log', auditRec);
        setRawAudit(function(prev){ return [auditRec].concat(prev || []); });
        setImportResult({ newCnt: newCnt, updCnt: updCnt, flagCnt: flagCnt, fileName: f.name });
        setImportStep(5);
        } catch(err) {
          console.error('Approve Import crash:', err);
          alert('Import failed: ' + (err && err.message ? err.message : err) + '\n\nCheck browser console for details.');
        }
      }} className="bg-blue-600 text-white rounded-lg px-5 py-2 font-medium">Approve Import &rarr;</button></div></div>;
    }

    // STEP 5 — committed (real result)
    var res = importResult || { newCnt: 0, updCnt: 0, flagCnt: 0, fileName: f.name };
    return <div className="space-y-6">{header}{stepper}<div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><div className="text-5xl mb-3">✅</div><div className="text-xl font-bold text-gray-900">Import Committed</div><p className="text-gray-500 mt-1 max-w-lg mx-auto">{(f.rows || 0).toLocaleString()} rows from <span className="font-semibold">{res.fileName}</span> were processed. <span className="font-semibold text-green-700">{res.newCnt}</span> new parts added, <span className="font-semibold text-blue-700">{res.updCnt}</span> existing parts updated, <span className="font-semibold text-orange-700">{res.flagCnt}</span> flagged for review. The column mapping was saved.</p><div className="flex gap-3 justify-center mt-5"><button onClick={function(){ setPage('Data Quality Center'); }} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Review {res.flagCnt} Flagged</button><button onClick={function(){ setPage('Master Terminal'); }} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">View in Master Terminal</button><button onClick={function(){ setImportFile(null); setImportStep(0); setImportResult(null); }} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium">Import Another</button></div></div><div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-900"><span className="font-bold">Audit trail:</span> this import was logged with user, timestamp, source file, row counts, and mapping used — and can be rolled back from Audit History.</div></div>;
  }

function ConfigureFilterStep(props) {
    var importSheets = props.importSheets;
    var importSelectedSheets = props.importSelectedSheets;
    var setImportSelectedSheets = props.setImportSelectedSheets;
    var importWorkbookBuf = props.importWorkbookBuf;
    var importFile = props.importFile;
    var setImportFile = props.setImportFile;
    var setImportMaps = props.setImportMaps;
    var setImportStep = props.setImportStep;
    var autoMap = props.autoMap;
    var header = props.header;
    var stepper = props.stepper;

    // Local filter state — changes here NEVER bubble to App until Apply is clicked
    var [localFilters, setLocalFilters] = React.useState(props.importRowFilters || []);

    // Detect available columns from first selected sheet (memoized — runs once)
    var availableCols = React.useMemo(function() {
      if (!importSheets.length || !importWorkbookBuf.current || typeof XLSX === 'undefined') return [];
      try {
        var wb = XLSX.read(importWorkbookBuf.current, { type: 'array' });
        var firstSel = importSelectedSheets[0] || wb.SheetNames[0];
        var ws = wb.Sheets[firstSel];
        if (!ws) return [];
        var raw = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
        // Find header row (first row with ≥50% filled cells)
        for (var ri = 0; ri < Math.min(5, raw.length); ri++) {
          var row = raw[ri];
          var filled = row.filter(function(c){ return c !== '' && c !== null; }).length;
          if (filled >= Math.max(3, row.length * 0.5)) {
            return row.map(function(c){ return String(c); }).filter(Boolean);
          }
        }
        return raw.length ? raw[0].map(function(c){ return String(c); }).filter(Boolean) : [];
      } catch(e) { return []; }
    }, [importSelectedSheets[0]]);

    function addFilter() {
      setLocalFilters(function(prev){ return prev.concat({ col: '', op: 'contains', val: '', enabled: true }); });
    }
    function removeFilter(idx) {
      setLocalFilters(function(prev){ return prev.filter(function(_, i){ return i !== idx; }); });
    }
    function updateFilter(idx, key, val) {
      setLocalFilters(function(prev){ return prev.map(function(f, i){ return i === idx ? Object.assign({}, f, {[key]: val}) : f; }); });
    }

    function applyAndScan() {
      if (!importWorkbookBuf.current || typeof XLSX === 'undefined') return;
      var wb3 = XLSX.read(importWorkbookBuf.current, { type: 'array' });
      var allRows = [];
      var sheetsUsed = [];
      var sheetMeta = {};
      importSheets.forEach(function(s){ sheetMeta[s.name] = s; });

      importSelectedSheets.forEach(function(sn) {
        var ws3 = wb3.Sheets[sn];
        if (!ws3) return;
        // Use raw array mode to detect + skip title rows
        var raw = XLSX.utils.sheet_to_json(ws3, { defval: '', header: 1 });
        // Find the real header row
        var headerRowIdx = 0;
        for (var ri = 0; ri < Math.min(5, raw.length); ri++) {
          var r = raw[ri];
          var filled = r.filter(function(c){ return c !== '' && c !== null; }).length;
          if (filled >= Math.max(3, r.length * 0.5)) { headerRowIdx = ri; break; }
        }
        var headerRow = raw[headerRowIdx] || [];
        var dataRowsRaw = raw.slice(headerRowIdx + 1);
        // Build keyed objects
        var keyed = dataRowsRaw.map(function(row) {
          var obj = {};
          headerRow.forEach(function(h, i) {
            if (h !== '' && h !== null && h !== undefined) obj[String(h)] = row[i] !== undefined ? row[i] : '';
          });
          return obj;
        });
        allRows = allRows.concat(keyed);
        sheetsUsed.push(sn);
      });

      // Apply filters (case-insensitive)
      var activeFilters = localFilters.filter(function(f){ return f.enabled && f.col; });
      var filtered = allRows.filter(function(row) {
        return activeFilters.every(function(f) {
          var cellVal = String(row[f.col] !== undefined ? row[f.col] : '').trim().toLowerCase();
          var fVal = String(f.val || '').trim().toLowerCase();
          if (f.op === 'contains')     return cellVal.indexOf(fVal) >= 0;
          if (f.op === 'not_contains') return cellVal.indexOf(fVal) < 0;
          if (f.op === 'equals')       return cellVal === fVal;
          if (f.op === 'not_equals')   return cellVal !== fVal;
          if (f.op === 'is_blank')     return cellVal === '' || cellVal === 'nan' || cellVal === 'null';
          if (f.op === 'is_not_blank') return cellVal !== '' && cellVal !== 'nan' && cellVal !== 'null';
          if (f.op === 'greater_eq')   { if (cellVal === '' || cellVal === 'nan' || cellVal === 'null') return false; return !isNaN(parseFloat(cellVal)) && parseFloat(cellVal) >= parseFloat(fVal); }
          if (f.op === 'less_eq')      { if (cellVal === '' || cellVal === 'nan' || cellVal === 'null') return false; return !isNaN(parseFloat(cellVal)) && parseFloat(cellVal) <= parseFloat(fVal); }
          return true;
        });
      });

      var headers3 = filtered.length ? Object.keys(filtered[0]) : (allRows.length ? Object.keys(allRows[0]) : []);
      var maps3 = {};
      headers3.forEach(function(h){ var a = autoMap(h); maps3[h] = { target: a.t, conf: a.c }; });
      var sampleRow3 = filtered.length ? headers3.map(function(h){ return filtered[0][h]; }) : [];
      if (allRows.length === 0) {
        alert('No rows were read from the selected sheets. Check that the sheets contain data and the header row is in the first 5 rows.');
        return;
      }
      if (activeFilters.length > 0 && filtered.length === 0) {
        var proceed = window.confirm('All ' + allRows.length.toLocaleString() + ' rows were excluded by your filters — 0 rows would be imported.\n\nTip: Rows with blank values in a \u2265/\u2264 filter column now pass through automatically.\n\nClick OK to continue with 0 rows (and adjust filters), or Cancel to go back and edit your filters.');
        if (!proceed) return;
      }
      props.setImportRowFilters(localFilters);
      setImportFile({ name: importFile.name, source: importFile.name, headers: headers3, rows: filtered.length, dataRows: filtered, rowCount: filtered.length, sheet: sheetsUsed.join(', '), sample: [sampleRow3] });
      setImportMaps(maps3);
      setImportStep(2);
    }

    var OPS = [
      { value: 'contains',     label: 'contains' },
      { value: 'not_contains', label: 'does not contain' },
      { value: 'equals',       label: 'equals' },
      { value: 'not_equals',   label: 'does not equal' },
      { value: 'is_blank',     label: 'is blank' },
      { value: 'is_not_blank', label: 'is not blank' },
      { value: 'greater_eq',   label: '≥ (number)' },
      { value: 'less_eq',      label: '≤ (number)' },
    ];
    var noValOps = ['is_blank', 'is_not_blank'];

    var totalRows = importSheets.filter(function(s){ return importSelectedSheets.indexOf(s.name) >= 0; }).reduce(function(a, s){ return a + s.rowCount; }, 0);
    var activeFilterCount = localFilters.filter(function(f){ return f.enabled && f.col; }).length;

    return <div className="space-y-6">{header}{stepper}
      {importSheets.length > 0 && <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="font-bold text-gray-900">Sheet Selection</div>
        <p className="text-sm text-gray-500">Check the sheets that contain parts data. Uncheck summary or reference sheets.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {importSheets.map(function(s) {
            var checked = importSelectedSheets.indexOf(s.name) >= 0;
            return <label key={s.name} className={'flex items-center gap-2 p-3 rounded-lg border cursor-pointer ' + (checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50')}>
              <input type="checkbox" checked={checked} onChange={function(e){ setImportSelectedSheets(function(prev){ return e.target.checked ? prev.concat(s.name) : prev.filter(function(n){ return n !== s.name; }); }); }} className="accent-blue-600" />
              <div><div className="font-mono text-sm font-semibold text-gray-800">{s.name}</div><div className="text-xs text-gray-500">{s.rowCount.toLocaleString()} rows</div></div>
            </label>;
          })}
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={function(){ setImportSelectedSheets(importSheets.map(function(s){ return s.name; })); }} className="text-blue-600 underline">Select All</button>
          <span className="text-gray-300">|</span>
          <button onClick={function(){ setImportSelectedSheets([]); }} className="text-blue-600 underline">Deselect All</button>
        </div>
      </div>}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div><div className="font-bold text-gray-900">Row Filters</div><p className="text-sm text-gray-500">Filter out rows before scanning. All rules must pass for a row to be included.</p></div>
          <button onClick={addFilter} className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium">+ Add Filter</button>
        </div>
        {localFilters.length === 0 && <div className="text-sm text-gray-400 italic py-2">No filters added — all rows from selected sheets will be scanned.</div>}
        {localFilters.map(function(f, idx) {
          return <FilterRow key={idx} filter={f} idx={idx} availableCols={availableCols} OPS={OPS} noValOps={noValOps} onUpdate={updateFilter} onRemove={removeFilter} />;
        })}
        {localFilters.length > 0 && <div className="text-sm text-gray-500 pt-1">💡 <span className="font-semibold">Tip:</span> Filters are case-insensitive. "INVALID", "Invalid", and "invalid" all match.</div>}
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
        <div className="text-sm text-blue-900">
          <span className="font-bold">{importSelectedSheets.length}</span> sheet(s) selected ·{' '}
          <span className="font-bold">{totalRows.toLocaleString()}</span> rows before filters
          {activeFilterCount > 0 ? ' · ' + activeFilterCount + ' filter(s) active' : ''}
        </div>
        <button onClick={applyAndScan} disabled={importSelectedSheets.length === 0} className={(importSelectedSheets.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed') + ' rounded-lg px-5 py-2 font-medium text-sm'}>Apply &amp; Scan →</button>
      </div>
    </div>;
  }

  // Isolated filter row — owns its own value input state so typing never causes parent re-renders

function FilterRow(props) {
    var f = props.filter; var idx = props.idx;
    var [localVal, setLocalVal] = React.useState(f.val || '');
    // Sync if parent resets filters
    React.useEffect(function(){ setLocalVal(f.val || ''); }, [f.val]);
    var needsVal = props.noValOps.indexOf(f.op) < 0;
    return <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <input type="checkbox" checked={f.enabled} onChange={function(e){ props.onUpdate(idx, 'enabled', e.target.checked); }} className="accent-blue-600" title="Enable/disable" />
      <select value={f.col} onChange={function(e){ props.onUpdate(idx, 'col', e.target.value); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white min-w-36">
        <option value="">— pick column —</option>
        {props.availableCols.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
      </select>
      <select value={f.op} onChange={function(e){ props.onUpdate(idx, 'op', e.target.value); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
        {props.OPS.map(function(o){ return <option key={o.value} value={o.value}>{o.label}</option>; })}
      </select>
      {needsVal && <input
        type="text"
        value={localVal}
        onChange={function(e){ setLocalVal(e.target.value); }}
        onBlur={function(){ props.onUpdate(idx, 'val', localVal); }}
        onKeyDown={function(e){ if(e.key==='Enter'){ props.onUpdate(idx, 'val', localVal); e.target.blur(); } }}
        placeholder="value…"
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-36"
      />}
      <button onClick={function(){ props.onRemove(idx); }} className="text-red-400 hover:text-red-600 text-lg leading-none ml-auto">×</button>
    </div>;
  }

export { ImportWizard };