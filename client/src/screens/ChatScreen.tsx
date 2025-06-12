import React from 'react';
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
    <div className="w-full h-full flex flex-col bg-theme-bg">
      <div className="flex-1 w-full flex flex-col overflow-hidden">
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
