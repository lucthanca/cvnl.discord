import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChatBubbleLeftIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftIcon as ChatBubbleLeftSolidIcon, Bars3Icon as Bars3SolidIcon } from '@heroicons/react/24/solid';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      id: 'chat',
      label: 'Chat',
      path: '/chat',
      icon: ChatBubbleLeftIcon,
      activeIcon: ChatBubbleLeftSolidIcon,
    },
    {
      id: 'menu',
      label: 'Menu',
      path: '/settings',
      icon: Bars3Icon,
      activeIcon: Bars3SolidIcon,
    },
  ];

  return (
    <nav className="bg-theme-nav border-t border-theme-border">
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/chat' && location.pathname === '/');
          const IconComponent = isActive ? item.activeIcon : item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                isActive 
                  ? 'text-theme-primary bg-theme-primary/10' 
                  : 'text-theme-text-secondary hover:text-theme-primary hover:bg-theme-primary/5'
              }`}
            >
              <IconComponent className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
