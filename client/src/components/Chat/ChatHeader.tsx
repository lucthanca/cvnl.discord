import React from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

const ChatHeader: React.FC = () => {
  return (
    <div className="bg-theme-nav border-b border-theme-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="https://via.placeholder.com/40"
            alt="Chat avatar"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h2 className="font-semibold text-theme-text">Chat Room</h2>
            <p className="text-sm text-theme-text-secondary">Online</p>
          </div>
        </div>
        
        <button className="p-2 rounded-full hover:bg-theme-primary/10 transition-colors">
          <EllipsisVerticalIcon className="w-6 h-6 text-theme-text-secondary" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
