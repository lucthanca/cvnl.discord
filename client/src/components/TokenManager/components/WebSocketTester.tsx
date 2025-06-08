import React from "react";
import * as io from 'socket.io-client';
import Textbox from "../../Textbox";

interface Token {
  id: string;
  token: string;
  userName: string;
  userId: string;
  addedAt: string;
  status: "connected" | "disconnected" | "error";
}

interface WebSocketTesterProps {
  tokens: Token[];
}

const WebSocketTester: React.FC<WebSocketTesterProps> = ({ tokens }) => {
  const [isTestingWebSocket, setIsTestingWebSocket] = React.useState<boolean>(false);
  const [selectedTokenForTest, setSelectedTokenForTest] = React.useState<string>("");
  const [testChatId, setTestChatId] = React.useState<string>("");
  const [testPartnerName, setTestPartnerName] = React.useState<string>("Test Partner");
  const [testPartnerGender, setTestPartnerGender] = React.useState<string>("male");
  const [testPartnerAge, setTestPartnerAge] = React.useState<number>(25);
  const [testPartnerJob, setTestPartnerJob] = React.useState<number>(1);
  const [testWebSocket, setTestWebSocket] = React.useState<SocketIOClient.Socket | null>(null);
  const [testResults, setTestResults] = React.useState<string[]>([]);

  const connectTestWebSocket = async () => {
    if (!selectedTokenForTest) {
      alert("Vui lòng chọn token để test");
      return;
    }

    const selectedToken = tokens.find(t => t.id === selectedTokenForTest);
    if (!selectedToken) {
      alert("Token không hợp lệ");
      return;
    }

    setIsTestingWebSocket(true);
    setTestResults([]);

    try {
      // Use Socket.IO client v2.5.0 syntax
      const socket: SocketIOClient.Socket = io.connect('http://localhost:3001', {
        forceNew: true,
        transports: ['websocket', 'polling']
      });
      
      setTestWebSocket(socket);

      socket.on('connect', () => {
        setTestResults(prev => [...prev, "✅ Kết nối Socket.IO thành công"]);
        
        // Send auth message
        const authMessage = {
          token: selectedToken.token
        };
        
        socket.emit('auth', authMessage);
        setTestResults(prev => [...prev, `📤 Gửi auth: ${selectedToken.userName}`]);
      });

      socket.on('connected', (data) => {
        setTestResults(prev => [...prev, `📥 Server welcome: ${JSON.stringify(data)}`]);
      });

      socket.on('auth_success', (data) => {
        setTestResults(prev => [...prev, `📥 Xác thực thành công: ${JSON.stringify(data)}`]);
      });

      socket.on('auth_error', (data) => {
        setTestResults(prev => [...prev, `❌ Lỗi xác thực: ${JSON.stringify(data)}`]);
      });

      socket.on('disconnect', (reason) => {
        setTestResults(prev => [...prev, `🔌 Socket.IO đã đóng: ${reason}`]);
        setTestWebSocket(null);
        setIsTestingWebSocket(false);
      });

      socket.on('error', (error) => {
        setTestResults(prev => [...prev, `❌ Lỗi kết nối Socket.IO: ${error}`]);
        setIsTestingWebSocket(false);
      });

    } catch (error) {
      setTestResults(prev => [...prev, `❌ Lỗi kết nối: ${error}`]);
      setIsTestingWebSocket(false);
    }
  };

  const sendTestC1Event = () => {
    if (!testWebSocket || !testWebSocket.connected) {
      alert("Socket.IO chưa kết nối");
      return;
    }

    const chatId = testChatId || `test_chat_${Date.now()}`;
    const partnerId = `test_partner_${Math.random().toString(36).substr(2, 9)}`;

    const c1Event = {
      event: 'c1',
      cvnlUserId: tokens.find(t => t.id === selectedTokenForTest)?.userId,
      userName: tokens.find(t => t.id === selectedTokenForTest)?.userName,
      data: {
        id: chatId,
        partnerId: partnerId,
        partnerName: testPartnerName,
        partnerGender: testPartnerGender,
        partnerAge: testPartnerAge,
        partnerJob: testPartnerJob
      }
    };

    testWebSocket.emit('cvnl_chat_event', c1Event);
    setTestResults(prev => [...prev, `📤 Gửi C1 event: ${JSON.stringify(c1Event)}`]);
    setTestChatId(chatId);
  };

  const disconnectTestWebSocket = () => {
    if (testWebSocket) {
      testWebSocket.disconnect();
    }
  };

  if (tokens.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: "30px", borderTop: "2px solid #ddd", paddingTop: "20px" }}>
      <h3>🧪 Test WebSocket & C1 Event</h3>
      
      {/* Token Selection for Test */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
          Chọn Token để Test:
        </label>
        <select
          value={selectedTokenForTest}
          onChange={(e) => setSelectedTokenForTest(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        >
          <option value="">-- Chọn Token --</option>
          {tokens.map((token) => (
            <option key={token.id} value={token.id}>
              {token.userName} ({token.userId})
            </option>
          ))}
        </select>
      </div>

      {/* Test Controls */}
      <div style={{ marginBottom: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={connectTestWebSocket}
          disabled={isTestingWebSocket || !selectedTokenForTest}
          style={{
            padding: "8px 16px",
            backgroundColor: !selectedTokenForTest ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !selectedTokenForTest ? "not-allowed" : "pointer"
          }}
        >
          {isTestingWebSocket ? "Đang kết nối..." : "Kết nối Socket.IO"}
        </button>
        
        <button
          onClick={sendTestC1Event}
          disabled={!testWebSocket || !testWebSocket.connected}
          style={{
            padding: "8px 16px",
            backgroundColor: (!testWebSocket || !testWebSocket.connected) ? "#6c757d" : "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: (!testWebSocket || !testWebSocket.connected) ? "not-allowed" : "pointer"
          }}
        >
          Gửi C1 Event
        </button>
        
        <button
          onClick={disconnectTestWebSocket}
          disabled={!testWebSocket}
          style={{
            padding: "8px 16px",
            backgroundColor: !testWebSocket ? "#6c757d" : "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !testWebSocket ? "not-allowed" : "pointer"
          }}
        >
          Ngắt kết nối
        </button>
      </div>

      {/* Test Data Configuration */}
      <div style={{ 
        backgroundColor: "#f8f9fa", 
        padding: "15px", 
        borderRadius: "8px", 
        marginBottom: "15px",
        border: "1px solid #dee2e6"
      }}>
        <h4 style={{ marginTop: "0", marginBottom: "15px" }}>Cấu hình Test Data:</h4>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Chat ID (tự động nếu trống):</label>
            <Textbox
              value={testChatId}
              onChange={setTestChatId}
              placeholder="test_chat_..."
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Tên Partner:</label>
            <Textbox
              value={testPartnerName}
              onChange={setTestPartnerName}
              placeholder="Test Partner"
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Giới tính:</label>
            <select
              value={testPartnerGender}
              onChange={(e) => setTestPartnerGender(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Tuổi:</label>
            <input
              type="number"
              value={testPartnerAge}
              onChange={(e) => setTestPartnerAge(parseInt(e.target.value) || 25)}
              min="18"
              max="99"
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>Nghề nghiệp:</label>
            <select
              value={testPartnerJob}
              onChange={(e) => setTestPartnerJob(parseInt(e.target.value))}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            >
              <option value={1}>Sinh viên</option>
              <option value={2}>Nhân viên</option>
              <option value={3}>Quản lý</option>
              <option value={4}>Freelancer</option>
              <option value={5}>Khác</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          padding: "15px",
          maxHeight: "200px",
          overflowY: "auto"
        }}>
          <h4 style={{ marginTop: "0", marginBottom: "10px" }}>📊 Kết quả Test:</h4>
          <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ 
                marginBottom: "5px", 
                padding: "4px 8px",
                backgroundColor: result.includes("❌") ? "#fff3cd" : 
                               result.includes("✅") ? "#d4edda" : "#e2e3e5",
                borderRadius: "3px",
                borderLeft: `3px solid ${result.includes("❌") ? "#ffc107" : 
                                          result.includes("✅") ? "#28a745" : "#6c757d"}`
              }}>
                <span style={{ color: "#495057" }}>
                  [{new Date().toLocaleTimeString()}] {result}
                </span>
              </div>
            ))}
          </div>
          
          {testResults.length > 0 && (
            <button
              onClick={() => setTestResults([])}
              style={{
                marginTop: "10px",
                padding: "4px 8px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Xóa log
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WebSocketTester;
