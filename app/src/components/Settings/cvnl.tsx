import React from "react";
import * as io from 'socket.io-client';

interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  socketId?: string;
  userName?: string;
}

const Settings: React.FC = () => {
  const mainBlockRef = React.useRef<HTMLDivElement>(null);
  const [socket, setSocket] = React.useState<SocketIOClient.Socket | null>(null);
  const [status, setStatus] = React.useState<ConnectionStatus>({
    connected: false,
    authenticated: false
  });
  const [token, setToken] = React.useState<string>("");
  const [testChatId, setTestChatId] = React.useState<string>("test-chat-" + Date.now());
  const [testMessage, setTestMessage] = React.useState<string>("Hello, this is a test message!");
  const [messageSender, setMessageSender] = React.useState<'user' | 'stranger'>('user');
  const [lastThreadMessage, setLastThreadMessage] = React.useState<any>(null);
  const [showMessagePopup, setShowMessagePopup] = React.useState<boolean>(false);

  React.useEffect(() => {
    mainBlockRef.current?.focus();
  }, [mainBlockRef.current]);

  const connectSocket = () => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket: SocketIOClient.Socket = io.connect('http://localhost:3001', {
      forceNew: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      setStatus(prev => ({ ...prev, connected: true, socketId: newSocket.id }));
    });

    newSocket.on('connected', (data: any) => {
      console.log('Server welcome:', data);
    });

    newSocket.on('auth_success', (data: any) => {
      console.log('Authentication successful:', data);
      setStatus(prev => ({ 
        ...prev, 
        authenticated: true, 
        userName: data.cvnlUserName 
      }));
    });

    newSocket.on('auth_error', (data: any) => {
      console.error('Authentication failed:', data);
      alert('Authentication failed: ' + data.error);
    });

    newSocket.on('new_chat_success', (data: any) => {
      console.log('New chat created successfully:', data);
      alert(`Thread created successfully!\nThread ID: ${data.threadId}\nThread Name: ${data.threadName}`);
    });

    newSocket.on('new_chat_error', (data: any) => {
      console.error('New chat creation failed:', data);
      alert('New chat creation failed: ' + data.error);
    });

    newSocket.on('new_message_success', (data: any) => {
      console.log('Message sent successfully:', data);
      alert(`Message sent successfully!\nChat ID: ${data.chatId}\nThread ID: ${data.threadId}`);
    });

    newSocket.on('new_message_error', (data: any) => {
      console.error('Message sending failed:', data);
      alert('Message sending failed: ' + data.error);
    });

    newSocket.on('thread_message', (data: any) => {
      console.log('Received thread message:', data);
      setLastThreadMessage(data);
      setShowMessagePopup(true);
      
      // Auto hide popup after 5 seconds
      setTimeout(() => {
        setShowMessagePopup(false);
      }, 5000);
    });

    newSocket.on('end_chat_success', (data: any) => {
      console.log('Chat ended successfully:', data);
      alert(`Chat ended successfully!\nChat ID: ${data.chatId}\nEnded by: ${data.endedBy}`);
    });

    newSocket.on('end_chat_error', (data: any) => {
      console.error('End chat failed:', data);
      alert('End chat failed: ' + data.error);
    });

    newSocket.on('chat_ended_from_discord', (data: any) => {
      console.log('Chat ended from Discord:', data);
      alert(`Chat ended from Discord!\nChat ID: ${data.chatId}\nTime: ${new Date(data.timestamp).toLocaleString('vi-VN')}`);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Disconnected:', reason);
      setStatus({
        connected: false,
        authenticated: false
      });
    });

    setSocket(newSocket);
  };

  const authenticate = () => {
    if (!socket || !token.trim()) {
      alert('Please connect first and enter a token');
      return;
    }

    socket.emit('auth', { token: token.trim() });
  };

  const testNewChat = () => {
    if (!socket || !status.authenticated) {
      alert('Please connect and authenticate first');
      return;
    }

    const chatData = {
      chatId: testChatId,
      metadata: {
        stranger: {
          gender: 'female',
          job: 0
        }
      }
    };

    console.log('Sending new_chat event:', chatData);
    socket.emit('new_chat', chatData);
  };

  const testNewMessage = () => {
    if (!socket || !status.authenticated) {
      alert('Please connect and authenticate first');
      return;
    }

    if (!testMessage.trim()) {
      alert('Please enter a message to send');
      return;
    }

    const messageData = {
      chatId: testChatId,
      message: {
        content: testMessage.trim(),
        sender: messageSender,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Sending new_message event:', messageData);
    socket.emit('new_message', messageData);
  };

  const testEndChat = () => {
    if (!socket || !status.authenticated) {
      alert('Please connect and authenticate first');
      return;
    }

    if (!testChatId.trim()) {
      alert('Please enter a Chat ID');
      return;
    }

    console.log('Sending end_chat event for:', testChatId);
    socket.emit('end_chat', { chatId: testChatId });
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  return (
    <div className="main-container focusable" ref={mainBlockRef} tabIndex={0}>
      <div id='setting_block' className="block-1">
        <div className='settings-heading'>
          <img src="https://cdn.discordapp.com/emojis/986178507291889664.webp?size=96&animated=true" alt="settings"/>
          <h2>Cài đặt CVNL Discord</h2>
        </div>
        
        {/* Connection Status */}
        <div className="status-section" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
          <h3>Connection Status</h3>
          <p>Connected: <span style={{ color: status.connected ? 'green' : 'red' }}>{status.connected ? 'Yes' : 'No'}</span></p>
          <p>Authenticated: <span style={{ color: status.authenticated ? 'green' : 'red' }}>{status.authenticated ? 'Yes' : 'No'}</span></p>
          {status.socketId && <p>Socket ID: {status.socketId}</p>}
          {status.userName && <p>User: {status.userName}</p>}
        </div>

        {/* Connection Controls */}
        <div className="connection-section" style={{ marginBottom: '20px' }}>
          <h3>Connection</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button 
              onClick={connectSocket}
              style={{ padding: '8px 16px', backgroundColor: '#5865F2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Connect to Server
            </button>
            <button 
              onClick={disconnect}
              style={{ padding: '8px 16px', backgroundColor: '#ed4245', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Authentication */}
        <div className="auth-section" style={{ marginBottom: '20px' }}>
          <h3>Authentication</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter CVNL Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button 
              onClick={authenticate}
              disabled={!status.connected || !token.trim()}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: status.connected && token.trim() ? '#57F287' : '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: status.connected && token.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Authenticate
            </button>
          </div>
        </div>

        {/* Test Functions */}
        <div className="test-section">
          <h3>Test Functions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Chat ID for testing"
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button 
              onClick={testNewChat}
              disabled={!status.authenticated}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: status.authenticated ? '#FEE75C' : '#6c757d', 
                color: status.authenticated ? '#000' : 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: status.authenticated ? 'pointer' : 'not-allowed'
              }}
            >
              Test New Chat Event
            </button>
            
            <button 
              onClick={testEndChat}
              disabled={!status.authenticated || !testChatId.trim()}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: status.authenticated && testChatId.trim() ? '#ed4245' : '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: status.authenticated && testChatId.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Test End Chat Event
            </button>
            
            {/* New Message Test Section */}
            <div style={{ marginTop: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
              <h4>Test New Message</h4>
              <textarea
                placeholder="Enter test message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                style={{ 
                  width: '100%', 
                  height: '60px', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px', 
                  resize: 'vertical',
                  marginBottom: '10px'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <label>Sender:</label>
                <select 
                  value={messageSender} 
                  onChange={(e) => setMessageSender(e.target.value as 'user' | 'stranger')}
                  style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="user">User (Bạn)</option>
                  <option value="stranger">Stranger (Người lạ)</option>
                </select>
              </div>
              <button 
                onClick={testNewMessage}
                disabled={!status.authenticated || !testMessage.trim()}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: status.authenticated && testMessage.trim() ? '#57F287' : '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: status.authenticated && testMessage.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Test Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Thread Message Preview Popup */}
        {showMessagePopup && lastThreadMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '350px',
            backgroundColor: '#2f3136',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            border: '1px solid #40444b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#00d4aa' }}>💬 New Thread Message</h4>
              <button 
                onClick={() => setShowMessagePopup(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#b9bbbe', 
                  cursor: 'pointer', 
                  fontSize: '18px' 
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#7289da' }}>
                {lastThreadMessage.message.author.displayName}
              </strong>
              <span style={{ color: '#72767d', fontSize: '12px', marginLeft: '8px' }}>
                {new Date(lastThreadMessage.message.timestamp).toLocaleTimeString('vi-VN')}
              </span>
            </div>
            
            <div style={{ 
              backgroundColor: '#36393f', 
              padding: '10px', 
              borderRadius: '4px', 
              marginBottom: '8px',
              wordWrap: 'break-word'
            }}>
              {lastThreadMessage.message.content}
            </div>
            
            <div style={{ fontSize: '11px', color: '#72767d' }}>
              <div>Chat ID: {lastThreadMessage.chatId.slice(-8)}</div>
              <div>Thread: {lastThreadMessage.threadId}</div>
            </div>
          </div>
        )}

        {/* Message History */}
        <div className="message-history" style={{ marginTop: '20px' }}>
          <h3>Recent Thread Messages</h3>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            backgroundColor: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '5px',
            fontSize: '12px'
          }}>
            {lastThreadMessage ? (
              <div style={{ marginBottom: '5px', padding: '5px', backgroundColor: 'white', borderRadius: '3px' }}>
                <strong>{lastThreadMessage.message.author.displayName}</strong>: {lastThreadMessage.message.content}
                <br />
                <small style={{ color: '#666' }}>
                  {new Date(lastThreadMessage.message.timestamp).toLocaleString('vi-VN')} - Chat: {lastThreadMessage.chatId.slice(-8)}
                </small>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#666' }}>No messages yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
