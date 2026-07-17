// src/components/export/ExportTerminal.jsx
import React from 'react';
import * as XLSX from 'xlsx';
import { AppContext } from '../../context/AppContext.jsx';
import { StatCard } from '../shared/StatCard.jsx';

export function ExportTerminal() {
  const { exportTerminalParts, setPage } = React.useContext(AppContext);

  var rows = exportTerminalParts || [];

  var ALL_COLS = [
    { key: 'priority',       header: 'Priority',         default: true  },
    { key: 'oem',            header: 'OEM',              default: true  },
    { key: 'plant',          header: 'Plant',            default: true  },
    { key: 'jss',            header: 'JSS Part',         default: true  },
    { key: 'customerPart',   header: 'Customer Part',    default: true  },
    { key: 'desc',           header: 'Description',      default: true  },
    { key: 'active',         header: 'Status',           default: true  },
    { key: 'demand',         header: 'Demand',           default: true  },
    { key: 'backlog',        header: 'Backlog',          default: true  },
    { key: 'serviceEop',     header: 'Service EOP',      default: true  },
    { key: 'recommendation', header: 'Recommendation',   default: true  },
    { key: 'price',          header: 'Service Price',    default: false },
    { key: 'cost',           header: 'Std Cost',         default: false },
    { key: 'component',      header: 'Component Family', default: false },
    { key: 'subcategory',    header: 'Subcategory',      default: false },
    { key: 'altJss',         header: 'Alt JSS Part',     default: false },
    { key: 'owner',          header: 'Owner',            default: false },
    { key: 'reason',         header: 'Reason',           default: false },
  ];

  var [selCols, setSelCols] = React.useState(
    ALL_COLS.filter(function(c){ return c.default; }).map(function(c){ return c.key; })
  );
  var [groupBy, setGroupBy]       = React.useState('none');
  var [sortCol, setSortCol]       = React.useState('priority');
  var [filterOem, setFilterOem]   = React.useState('All');
  var [exportName, setExportName] = React.useState(
    'service-export-' + new Date().toISOString().slice(0, 10)
  );

  var oemList = ['All'].concat(
    Array.from(new Set(rows.map(function(r){ return r.oem; }))).sort()
  );
  var activeCols = ALL_COLS.filter(function(c){ return selCols.indexOf(c.key) >= 0; });

  var displayRows = rows.slice();
  if (filterOem !== 'All') displayRows = displayRows.filter(function(r){ return r.oem === filterOem; });
  var PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  displayRows.sort(function(a, b){
    if (sortCol === 'priority') return (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99);
    var av = a[sortCol] || '', bv = b[sortCol] || '';
    return String(av).localeCompare(String(bv));
  });

  var totalDemand  = rows.reduce(function(s, r){ return s + (Number(r.demand) || 0); }, 0);
  var totalBacklog = rows.reduce(function(s, r){ return s + (Number(r.backlog) || 0); }, 0);
  var oemCount     = new Set(rows.map(function(r){ return r.oem; })).size;
  var critCount    = rows.filter(function(r){ return r.priority === 'Critical'; }).length;

  function toggleCol(key){
    setSelCols(function(prev){
      return prev.indexOf(key) >= 0
        ? prev.filter(function(k){ return k !== key; })
        : prev.concat([key]);
    });
  }

  function buildGroups(rws){
    if (groupBy === 'oem'){
      var map = {};
      rws.forEach(function(r){ if (!map[r.oem]) map[r.oem] = []; map[r.oem].push(r); });
      return Object.keys(map).sort().map(function(k){ return { label: k, rows: map[k] }; });
    }
    if (groupBy === 'priority'){
      var order = ['Critical','High','Medium','Low'];
      var map2 = {};
      rws.forEach(function(r){ if (!map2[r.priority]) map2[r.priority] = []; map2[r.priority].push(r); });
      return order.filter(function(k){ return map2[k]; }).map(function(k){ return { label: k, rows: map2[k] }; });
    }
    return [{ label: null, rows: rws }];
  }
  var groups = buildGroups(displayRows);

  function makeSheetData(sheetRows){
    var headers = activeCols.map(function(c){ return c.header; });
    var data = sheetRows.map(function(r){
      return activeCols.map(function(c){
        var v = r[c.key];
        return (v !== undefined && v !== null) ? v : '';
      });
    });
    return [headers].concat(data);
  }

  function applySheetMeta(ws, numCols){
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }) };
    ws['!cols'] = activeCols.map(function(c){
      var w = (c.key === 'desc' || c.key === 'reason') ? 40
             : (c.key === 'recommendation') ? 30
             : 18;
      return { wch: w };
    });
  }

  function doExcelExport(){
    var wb = XLSX.utils.book_new();
    if (groupBy !== 'none'){
      groups.forEach(function(g){
        var ws = XLSX.utils.aoa_to_sheet(makeSheetData(g.rows));
        applySheetMeta(ws, activeCols.length);
        XLSX.utils.book_append_sheet(wb, ws, (g.label || 'Export').slice(0, 31));
      });
    } else {
      var ws = XLSX.utils.aoa_to_sheet(makeSheetData(displayRows));
      applySheetMeta(ws, activeCols.length);
      XLSX.utils.book_append_sheet(wb, ws, 'Export');
    }
    var buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = exportName + '.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  function doCsvExport(){
    var head = activeCols.map(function(c){ return '"' + c.header + '"'; }).join(',');
    var body = displayRows.map(function(r){
      return activeCols.map(function(c){
        var v = (r[c.key] !== undefined && r[c.key] !== null) ? String(r[c.key]) : '';
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = exportName + '.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export Terminal</h1>
          <p className="text-gray-500">Configure, preview, and download your selected parts. Choose columns, grouping, and format before exporting.</p>
        </div>
        <button onClick={function(){ setPage('Master Terminal'); }} className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200">&larr; Back to Master Terminal</button>
      </div>

      {rows.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 text-sm">
          <span className="font-bold">No parts loaded.</span> Go to Master Terminal, enable Select Mode, check the rows you want, then click <span className="font-semibold">&rarr; Export Terminal</span> from the tray.
        </div>
      )}

      {rows.length > 0 && (
        <React.Fragment>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Parts Selected" value={String(rows.length)} subtitle="From Master Terminal" />
            <StatCard title="OEMs" value={String(oemCount)} subtitle="Represented" tone="blue" />
            <StatCard title="Total Demand" value={totalDemand.toLocaleString()} subtitle="Units across selection" tone="indigo" />
            <StatCard title="Critical Items" value={String(critCount)} subtitle="Need same-day action" tone="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-gray-900 text-sm">Export Settings</div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">File Name</label>
                  <input value={exportName} onChange={function(e){ setExportName(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by OEM</label>
                  <select value={filterOem} onChange={function(e){ setFilterOem(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    {oemList.map(function(o){ return <option key={o} value={o}>{o}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort By</label>
                  <select value={sortCol} onChange={function(e){ setSortCol(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    {activeCols.map(function(c){ return <option key={c.key} value={c.key}>{c.header}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Group By (Excel tabs)</label>
                  <select value={groupBy} onChange={function(e){ setGroupBy(e.target.value); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="none">No grouping (single sheet)</option>
                    <option value="oem">Group by OEM (one tab per OEM)</option>
                    <option value="priority">Group by Priority (one tab per level)</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="font-bold text-gray-900 text-sm mb-3">Columns <span className="text-gray-400 font-normal">({selCols.length} selected)</span></div>
                <div className="space-y-1.5">
                  {ALL_COLS.map(function(c){
                    var on = selCols.indexOf(c.key) >= 0;
                    return (
                      <label key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                        <input type="checkbox" checked={on} onChange={function(){ toggleCol(c.key); }} className="rounded" />
                        <span className={'text-sm ' + (on ? 'text-gray-900' : 'text-gray-400')}>{c.header}</span>
                        {c.default && <span className="text-xs text-gray-300">default</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Preview <span className="text-gray-400 font-normal">&middot; {displayRows.length} rows &middot; {activeCols.length} columns</span></div>
                  <span className="text-xs text-gray-400">Showing all rows</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800 text-white">
                      <tr>{activeCols.map(function(c){ return <th key={c.key} className="p-2 text-left whitespace-nowrap font-semibold">{c.header}</th>; })}</tr>
                    </thead>
                    <tbody>
                      {displayRows.map(function(r, i){
                        return (
                          <tr key={r.id || i} className={'border-t border-gray-100 ' + (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                            {activeCols.map(function(c){
                              var v = (r[c.key] !== undefined && r[c.key] !== null) ? r[c.key] : '\u2014';
                              if (c.key === 'priority'){
                                var tone = { Critical: 'bg-red-100 text-red-800', High: 'bg-orange-100 text-orange-800', Medium: 'bg-yellow-100 text-yellow-800', Low: 'bg-green-100 text-green-800' };
                                return <td key={c.key} className="p-2"><span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (tone[v] || 'bg-gray-100 text-gray-700')}>{v}</span></td>;
                              }
                              return <td key={c.key} className={'p-2 ' + (c.key === 'desc' || c.key === 'reason' ? 'max-w-xs truncate' : 'whitespace-nowrap')}>{String(v)}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-gray-900 text-sm">Download</div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={doCsvExport} className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl p-4 text-left border border-gray-200">
                    <div className="font-bold text-sm">&darr; CSV</div>
                    <div className="text-xs text-gray-500 mt-1">Flat file, {displayRows.length} rows &middot; works in any tool</div>
                  </button>
                  <button onClick={doExcelExport} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 text-left">
                    <div className="font-bold text-sm">&darr; Excel (.xlsx)</div>
                    <div className="text-xs text-blue-200 mt-1">{groupBy !== 'none' ? 'Multi-tab \u00b7 ' : 'Single sheet \u00b7 '}frozen header &middot; auto-filter</div>
                  </button>
                </div>
                <div className="text-xs text-gray-400">File: <span className="font-mono text-gray-600">{exportName}.xlsx</span> &middot; {activeCols.length} columns &middot; {displayRows.length} rows{groupBy !== 'none' ? ' \u00b7 ' + groups.length + ' sheet(s)' : ''}</div>
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
