// components/shared/MultiSelectDropdown.jsx
// Multi-select dropdown with search filter.

import React from 'react';

function MultiSelectDropdown(props) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const ref = React.useRef(null);
    React.useEffect(function(){
      function handler(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', handler);
      return function(){ document.removeEventListener('mousedown', handler); };
    }, []);
    const selected = props.selected || [];
    const options = props.options || [];
    const filtered = options.filter(function(o){ return o.key.toLowerCase().indexOf(search.toLowerCase()) >= 0; });
    function toggle(k){ const i = selected.indexOf(k); const next = i >= 0 ? selected.filter(function(x){ return x !== k; }) : selected.concat([k]); props.onChange(next); }
    function selectAll(){ props.onChange(options.map(function(o){ return o.key; })); }
    function clear(){ props.onChange([]); }
    const label = selected.length === 0 ? ('All ' + props.label + 's') : (selected.length === 1 ? (options.find(function(o){ return o.key === selected[0]; }) || {label: selected[0]}).label || selected[0] : (props.label + ' (' + selected.length + ')'));
    return <div className="relative" ref={ref}><label className="block text-xs text-gray-500 mb-1">{props.label}</label><button onClick={function(){ setOpen(!open); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[180px] flex items-center justify-between gap-2 hover:bg-gray-50"><span className="truncate">{label}</span><span className="text-xs text-gray-400">▼</span></button>{open && <div className="absolute z-30 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg"><div className="p-2 border-b border-gray-100"><input value={search} onChange={function(e){ setSearch(e.target.value); }} placeholder={'Search ' + props.label.toLowerCase() + '...'} className="w-full border border-gray-200 rounded px-2 py-1 text-sm" /></div><div className="px-2 py-1 border-b border-gray-100 flex justify-between text-xs"><button onClick={selectAll} className="text-blue-600 hover:underline">Select all</button><button onClick={clear} className="text-gray-500 hover:underline">Clear</button></div><div className="max-h-60 overflow-auto p-1">{filtered.map(function(o){ const isSel = selected.indexOf(o.key) >= 0; return <label key={o.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm"><input type="checkbox" checked={isSel} onChange={function(){ toggle(o.key); }} /><span className="flex-1">{o.label || o.key}</span>{typeof o.count !== 'undefined' && <span className="text-xs text-gray-400">({o.count})</span>}</label>; })}{filtered.length === 0 && <div className="text-xs text-gray-400 px-2 py-2">No matches.</div>}</div></div>}</div>;
  }

export { MultiSelectDropdown };