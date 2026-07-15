// components/shared/Badge.jsx
// Badge, DQBadge, and ArchiveBadge display components.

import React from 'react';

function Badge(props) {
    const priorityStyles = {
      Critical: { backgroundColor: '#dc143c', color: '#ffffff', borderColor: '#a80f2e' },
      High: { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' },
      Medium: { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' },
      Low: { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fcd34d' }
    };
    const tones = {
      Active: 'bg-green-100 text-green-800 border-green-200', Inactive: 'bg-red-100 text-red-800 border-red-200', Unknown: 'bg-gray-100 text-gray-700 border-gray-200', Blue: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    if (priorityStyles[props.tone]) {
      return <span style={priorityStyles[props.tone]} className="px-2 py-1 rounded-full text-xs border font-medium">{props.children}</span>;
    }
    return <span className={'px-2 py-1 rounded-full text-xs border ' + (tones[props.tone] || tones.Blue)}>{props.children}</span>;
  }

function DQBadge(props) {
    const dq = props.dq;
    const map = {
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      gray: 'bg-gray-100 text-gray-600 border-gray-200',
      green: 'bg-green-100 text-green-800 border-green-200'
    };
    const text = (dq.type === 'FAMILY') ? dq.label + ' (' + dq.family + ')' : dq.label;
    return <span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (map[dq.tone] || map.green)}>{text}</span>;
  }



  var COLUMN_REGISTRY = {
  priority:       { header: 'Priority',        key: 'priority',     width: 12, cell: function(p){ return React.createElement(Badge, {tone: p.priority}, p.priority); } },
  oem:            { header: 'OEM',             key: 'oem',          width: 14, cell: function(p){ return p.oem; } },
  plant:          { header: 'Plant',           key: 'plant',        width: 10, cell: function(p){ return p.plant; } },
  jss:            { header: 'JSS Part',        key: 'jss',          width: 18, cell: function(p){ return React.createElement('span', {className:'font-mono text-xs'}, p.jss); } },
  altJss:         { header: 'Alt JSS Part',    key: 'altJss',       width: 18, cell: function(p){ return React.createElement('span', {className:'font-mono text-xs'}, p.altJss); } },
  customerPart:   { header: 'Customer Part',   key: 'customerPart', width: 18, cell: function(p){ return React.createElement('span', {className:'font-mono text-xs'}, p.customerPart); } },
  desc:           { header: 'Description',     key: 'desc',         width: 30, cell: function(p){ return React.createElement('span', {className:'max-w-xs truncate block'}, p.desc); } },
  component:      { header: 'Component Family',key: 'component',    width: 20, cell: function(p){ return p.component; } },
  active:         { header: 'Status',          key: 'active',       width: 12, cell: function(p){ return React.createElement(Badge, {tone: p.active==='ACTIVE'?'Active':p.active==='INACTIVE'?'Inactive':'Unknown'}, p.active); } },
  dq:             { header: 'Data Quality',    key: 'dqLabel',      width: 18, cell: function(p){ return React.createElement(DQBadge, {dq: p.dq}); }, exportVal: function(p){ return p.dq ? p.dq.label : ''; } },
  demand:         { header: 'Demand',          key: 'demand',       width: 10, cell: function(p){ return p.demand; }, align: 'right' },
  backlog:        { header: 'Backlog',         key: 'backlog',      width: 10, cell: function(p){ return p.backlog; }, align: 'right' },
  serviceEop:     { header: 'Service EOP',     key: 'serviceEop',   width: 12, cell: function(p){ return p.serviceEop; } },
  price:          { header: 'Current Price',   key: 'price',        width: 14, cell: function(p){ return p.price; } },
  baseCost:       { header: 'Base Std Cost',   key: 'baseCost',     width: 14, cell: function(p){ return p.baseCost; } },
  recommendation: { header: 'Recommendation', key: 'recommendation',width: 22, cell: function(p){ return p.recommendation; } },
  archiveStatus:  { header: 'Archive Status',  key: 'archiveStatus',width: 14, cell: function(p){ return p.archiveStatus; } },
  approvalStatus: { header: 'Approval',        key: 'approvalStatus',width:14, cell: function(p){ return p.approvalStatus; } },
  owner:          { header: 'Owner',           key: 'owner',        width: 16, cell: function(p){ return p.owner; } },
};

var REPORT_COLUMNS = {
  master:  ['priority','oem','plant','jss','customerPart','desc','active','dq','demand','backlog','recommendation'],
  cleanup: ['oem','jss','customerPart','desc','active','archiveStatus','serviceEop','demand','backlog'],
  phase:   ['oem','jss','customerPart','desc','active','serviceEop','demand','priority'],
  slp:     ['oem','jss','customerPart','desc','active','serviceEop','demand','priority'],
  risk:    ['oem','jss','customerPart','desc','demand','backlog','serviceEop','priority','owner'],
  price:   ['oem','jss','customerPart','desc','baseCost','price','serviceEop'],
  dq:      ['oem','jss','customerPart','desc','dq','active'],
  archive: ['oem','jss','customerPart','desc','archiveStatus','approvalStatus','demand','backlog','serviceEop'],
  morning: ['oem','jss','customerPart','desc','priority','active','demand','backlog','recommendation'],
};
REPORT_COLUMNS.master = REPORT_COLUMNS.master; // full master = same as table

function ArchiveBadge(props) {
      return (
        <span className={'px-2 py-1 rounded-full text-xs border font-medium ' + (statusStyles[props.status] || statusStyles['Needs Review'])}>
          {props.status}
        </span>
      );
    }

export { Badge };
export { COLUMN_REGISTRY };
export { REPORT_COLUMNS };
export { DQBadge };
export { ArchiveBadge };