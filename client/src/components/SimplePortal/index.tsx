import React from 'react';
import { createPortal } from 'react-dom';

export default ({ children }: { children: React.ReactNode }) => {
  const mount = document.getElementById('portal-root');
  if (!mount) return null;

  return createPortal(children, mount);
};
