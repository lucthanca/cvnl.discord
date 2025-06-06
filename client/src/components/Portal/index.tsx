import React from 'react';
import { createPortal } from 'react-dom';
import './index.style.scss';

export default ({ children }: { children: React.ReactNode }) => {
  const mount = document.getElementById('portal');
  if (!mount) return null;

  return createPortal(children, mount);
};
