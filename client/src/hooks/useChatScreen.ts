import { useState } from 'react';
import { Message, MessageType } from '../types/chat';
import { generateFakeMessages } from '../utils/fakeData';

export const useChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>(generateFakeMessages());
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const sendMessage = (content: string, type: MessageType = 'text') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: new Date(),
      sender: {
        id: 'current-user',
        name: 'You',
        avatar: 'https://placehold.co/40',
      },
      isOwn: true,
    };

    setMessages(prev => [...prev, newMessage]);
    
    // Simulate typing response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Thanks for your message! 😊',
        type: 'text',
        timestamp: new Date(),
        sender: {
          id: 'other-user',
          name: 'Friend',
          avatar: 'https://placehold.co/40',
        },
        isOwn: false,
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  const sendVoiceMessage = (audioBlob: Blob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    sendMessage(audioUrl, 'voice');
  };

  const sendImage = (imageFile: File) => {
    const imageUrl = URL.createObjectURL(imageFile);
    sendMessage(imageUrl, 'image');
  };

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  return {
    messages,
    isTyping,
    sendMessage,
    sendVoiceMessage,
    sendImage,
    isRecording,
    startRecording,
    stopRecording,
  };
};
