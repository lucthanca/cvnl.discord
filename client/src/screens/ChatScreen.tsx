import React from 'react';
import ChatHeader from '../components/Chat/ChatHeader';
import MessageList from '../components/Chat/MessageList';
import MessageInput from '../components/Chat/MessageInput';
import TypingIndicator from '../components/Chat/TypingIndicator';
import { useChatScreen } from '../hooks/useChatScreen';

const ChatScreen: React.FC = () => {
  const {
    messages,
    isTyping,
    sendMessage,
    sendVoiceMessage,
    sendImage,
    isRecording,
    startRecording,
    stopRecording,
  } = useChatScreen();

  return (
    <div className="flex flex-col h-full bg-theme-bg">
      <ChatHeader />
      <div className="flex-1 flex flex-col min-h-0">
        <MessageList messages={messages} />
        {isTyping && <TypingIndicator />}
        <MessageInput
          onSendMessage={sendMessage}
          onSendVoice={sendVoiceMessage}
          onSendImage={sendImage}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
      </div>
    </div>
  );
};

export default ChatScreen;
