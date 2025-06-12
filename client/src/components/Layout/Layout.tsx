import React, { ReactNode } from 'react';
import BottomNavigation from './BottomNavigation';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-theme-bg text-theme-text">
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Layout;
