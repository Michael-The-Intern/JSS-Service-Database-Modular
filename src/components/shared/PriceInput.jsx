// components/shared/PriceInput.jsx
// Stable price input — avoids full App re-renders on keystroke.

import React from 'react';

function PriceInput(props) {
  const [text, setText] = React.useState(props.value);
  // resync when a different part is selected (the suggested value changes)
  React.useEffect(function(){ setText(props.value); }, [props.partId, props.value]);
  return <input
    value={text}
    onChange={function(e){ setText(e.target.value); }}
    onBlur={function(){ props.onCommit(text); }}
    onKeyDown={function(e){ if (e.key === 'Enter') { e.target.blur(); } }}
    className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-mono"
    placeholder="0.00"
    inputMode="decimal"
  />;
}
// Stable, top-level search input. Owns its own text state so typing never
// re-renders App (which was tearing down the panel and losing focus/scroll).
// It syncs the committed value up via onChange, but the DOM input stays mounted.

export { PriceInput };