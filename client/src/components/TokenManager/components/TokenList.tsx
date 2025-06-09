import React from "react";

interface Token {
  id: string;
  token: string;
  userName: string;
  userId: string;
  addedAt: string;
  status: "connected" | "disconnected" | "error";
}

interface TokenListProps {
  tokens: Token[];
  onRemoveToken: (tokenId: string) => void;
}

const TokenList: React.FC<TokenListProps> = ({ tokens, onRemoveToken }) => {
  const [statusUpdates, setStatusUpdates] = React.useState<{[key: string]: boolean}>({});

  React.useEffect(() => {
    // Track status changes to show update animation
    const timeouts: NodeJS.Timeout[] = [];
    
    tokens.forEach(token => {
      setStatusUpdates(prev => ({ ...prev, [token.id]: true }));
      
      const timeout = setTimeout(() => {
        setStatusUpdates(prev => ({ ...prev, [token.id]: false }));
      }, 2000);
      
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [tokens.map(t => `${t.id}-${t.status}`).join(',')]);

  if (tokens.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "#666",
          border: "2px dashed #ddd",
          borderRadius: "8px",
        }}
      >
        <p>Chưa có token nào được thêm</p>
        <p style={{ fontSize: "12px" }}>
          Sử dụng lệnh /login trong Discord hoặc click "Thêm Token" để bắt đầu
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return { bg: "#d4edda", color: "#155724", icon: "🟢" };
      case "disconnected":
        return { bg: "#f8d7da", color: "#721c24", icon: "🔴" };
      case "error":
        return { bg: "#fff3cd", color: "#856404", icon: "🟡" };
      default:
        return { bg: "#e2e3e5", color: "#383d41", icon: "⚪" };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Online";
      case "disconnected":
        return "Offline";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {tokens.map((token) => {
        const statusInfo = getStatusColor(token.status);
        const isUpdating = statusUpdates[token.id];
        
        return (
          <div
            key={token.id}
            style={{
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "13px",
              transition: "all 0.3s ease",
              boxShadow: isUpdating ? "0 0 10px rgba(40, 167, 69, 0.3)" : "none",
              borderColor: isUpdating ? "#28a745" : "#ddd",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                {token.userName}
                {isUpdating && (
                  <span style={{ 
                    marginLeft: "8px", 
                    fontSize: "10px", 
                    color: "#28a745",
                    animation: "pulse 1s infinite"
                  }}>
                    ✨ Updated
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                User ID: {token.userId}
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                Thêm lúc: {new Date(token.addedAt).toLocaleString("vi-VN")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  backgroundColor: statusInfo.bg,
                  color: statusInfo.color,
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                {statusInfo.icon} {getStatusText(token.status)}
              </span>
              <button
                onClick={() => onRemoveToken(token.id)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        );
      })}
      
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default TokenList;
