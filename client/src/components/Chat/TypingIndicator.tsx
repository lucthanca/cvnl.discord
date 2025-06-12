import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start px-4 py-2">
      <div className="flex items-center space-x-2">
        <img
          src="https://placehold.co/32"
          alt="User typing"
          className="w-8 h-8 rounded-full"
        />
        <div className="bg-theme-message-bg rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-theme-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-theme-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-theme-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
