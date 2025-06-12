import React, { ReactNode } from 'react';
import BottomNavigation from './BottomNavigation';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="w-full h-full flex flex-col bg-theme-bg text-theme-text">
      <main className="flex-1 w-full overflow-hidden">
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Layout;
