// components/shared/StatCard.jsx
// Dashboard KPI stat card.

import React from 'react';

function StatCard(props) {
  const isZero = props.value === '0' || props.value === 0;
  const borderColor = isZero ? '#e5e7eb' : props.tone === 'red' ? '#dc2626' : props.tone === 'orange' ? '#ea580c' : props.tone === 'green' ? '#16a34a' : props.tone === 'indigo' ? '#4f46e5' : props.tone === 'blue' ? '#2563eb' : '#6b7280';
  const numColor = isZero ? '#9ca3af' : '#111827';
  return (
    <div style={{borderTop: '3px solid ' + borderColor, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s ease, transform 0.15s ease'}}
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-default"
      onMouseEnter={function(e){ e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform='translateY(-1px)'; }}
      onMouseLeave={function(e){ e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform='translateY(0)'; }}>
      <div style={{fontSize:'10px', letterSpacing:'0.12em', color: isZero ? '#d1d5db' : '#9ca3af'}} className="uppercase font-medium mb-1">{props.title}</div>
      <div style={{fontSize:'2.25rem', fontWeight:'600', lineHeight:'1', letterSpacing:'-0.01em', color: numColor}}>{props.value}</div>
      <div style={{fontSize:'12px', color: isZero ? '#d1d5db' : '#6b7280'}} className="mt-1">{props.subtitle}</div>
    </div>
  );
}

export { StatCard };