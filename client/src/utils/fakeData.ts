import { Message } from '../types/chat';

export const generateFakeMessages = (): Message[] => {
  return [
    {
      id: '1',
      content: 'Hey there! How are you doing today?',
      type: 'text',
      timestamp: new Date(Date.now() - 3600000),
      sender: {
        id: 'user-1',
        name: 'Alice',
        avatar: 'https://via.placeholder.com/40',
      },
      isOwn: false,
    },
    {
      id: '2',
      content: 'I\'m doing great! Just working on some exciting projects 😊',
      type: 'text',
      timestamp: new Date(Date.now() - 3500000),
      sender: {
        id: 'current-user',
        name: 'You',
        avatar: 'https://via.placeholder.com/40',
      },
      isOwn: true,
    },
    {
      id: '3',
      content: 'That sounds awesome! What kind of projects?',
      type: 'text',
      timestamp: new Date(Date.now() - 3400000),
      sender: {
        id: 'user-1',
        name: 'Alice',
        avatar: 'https://via.placeholder.com/40',
      },
      isOwn: false,
    },
    {
      id: '4',
      content: 'Building a chat application with React and TypeScript. It\'s been really fun!',
      type: 'text',
      timestamp: new Date(Date.now() - 3300000),
      sender: {
        id: 'current-user',
        name: 'You',
        avatar: 'https://via.placeholder.com/40',
      },
      isOwn: true,
    },
    {
      id: '5',
      content: 'Nice! I love working with React. Are you using any particular UI library?',
      type: 'text',
      timestamp: new Date(Date.now() - 3200000),
      sender: {
        id: 'user-1',
        name: 'Alice',
        avatar: 'https://via.placeholder.com/40',
      },
      isOwn: false,
    },
  ];
};
