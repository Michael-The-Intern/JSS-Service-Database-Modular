// components/shared/Table.jsx
// Shared sortable data table.

import React from 'react';
import { COLUMN_REGISTRY, REPORT_COLUMNS } from './Badge.jsx';

function Table(props) {
    var colKeys = props.columns || REPORT_COLUMNS.master;
    var cols = colKeys.map(function(k){ return COLUMN_REGISTRY[k]; }).filter(Boolean);
    var selectMode = props.selectMode || false;
    var selectedIds = props.selectedIds || [];
    var onToggle = props.onToggle || function(){};
    var allSelected = props.rows.length > 0 && props.rows.every(function(p){ return selectedIds.indexOf(p.id) >= 0; });
    function toggleAll(){ if (allSelected) { onToggle(null, true); } else { props.rows.forEach(function(p){ if (selectedIds.indexOf(p.id) < 0) onToggle(p.id); }); } }
    return <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-600"><tr>{selectMode && <th className="p-3 text-center w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} title="Select all visible rows" /></th>}{cols.map(function(c){ return <th key={c.key} className={'p-3 ' + (c.align === 'right' ? 'text-right' : 'text-left')}>{c.header}</th>; })}</tr></thead><tbody>{props.rows.map(function(p){ var isChecked = selectedIds.indexOf(p.id) >= 0; return <tr key={p.id} onClick={function(){ selectMode ? onToggle(p.id) : (props.onRowClick || function(){})(p); }} className={'border-t border-gray-100 cursor-pointer ' + (selectMode && isChecked ? 'bg-yellow-50' : 'hover:bg-blue-50')}>{selectMode && <td className="p-3 text-center" onClick={function(e){ e.stopPropagation(); onToggle(p.id); }}><input type="checkbox" checked={isChecked} onChange={function(){}} /></td>}{cols.map(function(c){ return <td key={c.key} className={'p-3 ' + (c.align === 'right' ? 'text-right' : '')}>{c.cell(p)}</td>; })}</tr>; })}</tbody></table></div></div>;
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const TYPE_TONES = { 'Team Meeting': 'bg-blue-100 text-blue-800 border-blue-200', 'Operations': 'bg-indigo-100 text-indigo-800 border-indigo-200', 'Customer / Service': 'bg-amber-100 text-amber-800 border-amber-200', 'Customer Visit': 'bg-green-100 text-green-800 border-green-200', 'Company Event': 'bg-purple-100 text-purple-800 border-purple-200' };

export { Table };