import React from 'react';
import { Message } from '../../types/chat';
import { formatMessageTime } from '../../utils/dateUtils';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
      case 'image':
        return (
          <img
            src={message.content}
            alt="Shared image"
            className="max-w-full h-auto rounded-lg"
          />
        );
      case 'voice':
        return (
          <audio controls className="max-w-full">
            <source src={message.content} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        );
      case 'gif':
        return (
          <img
            src={message.content}
            alt="GIF"
            className="max-w-full h-auto rounded-lg"
          />
        );
      default:
        return <p>{message.content}</p>;
    }
  };

  return (
    <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex ${message.isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-xs sm:max-w-md`}>
        {!message.isOwn && (
          <img
            src={message.sender.avatar}
            alt={message.sender.name}
            className="w-8 h-8 rounded-full"
          />
        )}
        
        <div className={`flex flex-col ${message.isOwn ? 'items-end' : 'items-start'}`}>
          {!message.isOwn && (
            <span className="text-xs text-theme-text-secondary mb-1 px-3">
              {message.sender.name}
            </span>
          )}
          
          <div
            className={`px-4 py-2 rounded-2xl ${
              message.isOwn
                ? 'bg-theme-primary text-white rounded-br-md'
                : 'bg-theme-message-bg text-theme-text rounded-bl-md'
            }`}
          >
            {renderContent()}
          </div>
          
          <span className="text-xs text-theme-text-secondary mt-1 px-3">
            {formatMessageTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
