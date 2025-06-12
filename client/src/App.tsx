import React from 'react';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App h-screen bg-gray-100">
          <h1 className="text-2xl font-bold text-center py-8">Chat App</h1>
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-4">
            <p>Welcome to the chat application!</p>
            <div className="mt-4 space-y-2">
              <button className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
                Chat
              </button>
              <button className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600">
                Settings
              </button>
            </div>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
