// components/shared/SearchBox.jsx
// Stable search box — owns its own text state.

import React from 'react';

function SearchBox({ value, onChange, placeholder, className }) {
  const ref = React.useRef(null);

  React.useEffect(function () {
    if (ref.current && value === '' && ref.current.value !== '') {
      ref.current.value = '';
    }
  }, [value]);

  return (
    <input
      ref={ref}
      defaultValue={value || ''}
      onChange={function (e) { onChange(e.target.value); }}
      placeholder={placeholder}
      className={className}
    />
  );
}

export { SearchBox };