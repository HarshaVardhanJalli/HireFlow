import React from 'react';

export default function Spinner({ size = 40, text }) {
  return (
    <div className="spinner-overlay">
      <div style={{ textAlign: 'center' }}>
        <div
          className="spinner"
          style={{ width: size, height: size, borderWidth: size > 20 ? 3 : 2 }}
        />
        {text && <div className="loading-text">{text}</div>}
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 16 }) {
  return (
    <span
      className="spinner"
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
}
