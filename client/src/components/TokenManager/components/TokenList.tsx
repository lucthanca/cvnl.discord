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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {tokens.map((token) => (
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
          }}
        >
          <div>
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
              {token.userName}
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
                backgroundColor:
                  token.status === "connected" ? "#d4edda" : "#f8d7da",
                color:
                  token.status === "connected" ? "#155724" : "#721c24",
              }}
            >
              {token.status === "connected"
                ? "🟢 Connected"
                : "🔴 Disconnected"}
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
      ))}
    </div>
  );
};

export default TokenList;
