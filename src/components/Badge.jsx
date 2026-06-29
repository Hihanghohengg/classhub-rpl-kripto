import React from 'react';
const map = {
  regular: 'badge-blue',
  replacement: 'badge-amber',
  cancelled: 'badge-red',
  online: 'badge-blue',
  offline: 'badge-green',
  high: 'badge-red',
  medium: 'badge-amber',
  low: 'badge-blue',
  done: 'badge-green',
  progress: 'badge-amber',
  purple: 'badge-purple',
  pink: 'badge-pink'
};

export default function Badge({ children, type = 'regular' }) {
  return <span className={`badge ${map[type] || 'badge-blue'}`}>{children}</span>;
}
