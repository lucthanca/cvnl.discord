import React from "react";
import Textbox from "../Textbox";
import * as io from "socket.io-client";
import {
  authenticateWithDiscord,
  DiscordUser,
  saveDiscordUser,
  loadDiscordUser,
  removeDiscordUser,
} from "../../services/auth";

interface Token {
  id: string;
  token: string;
  userName: string;
  userId: string;
  addedAt: string;
  status: "connected" | "disconnected" | "error";
}

const TokenManager: React.FC = () => {
  const mainBlockRef = React.useRef<HTMLDivElement>(null);
  const [discordUser, setDiscordUser] = React.useState<DiscordUser | null>(null);
  const [tokens, setTokens] = React.useState<Token[]>([]);
  const [isAddingToken, setIsAddingToken] = React.useState<boolean>(false);
  const [newToken, setNewToken] = React.useState<string>("");
  const [socket, setSocket] = React.useState<SocketIOClient.Socket | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    mainBlockRef.current?.focus();
    // Check if user is already logged in with Discord
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setIsInitialLoading(true);
    try {
      // Load Discord user from shared storage
      const storedUser = await loadDiscordUser();
      if (storedUser) {
        setDiscordUser(storedUser);
        await loadSavedTokens(storedUser.id);
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadSavedTokens = async (discordUserId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/discord/tokens/${discordUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
      } else {
        console.error("Failed to load tokens from server");
        setTokens([]);
      }
    } catch (error) {
      console.error("Error loading tokens from server:", error);
      setTokens([]);
    }
  };

  const saveTokenToServer = async (
    discordUserId: string,
    token: string
  ): Promise<{ success: boolean; tokenData?: any; error?: string }> => {
    try {
      const response = await fetch("http://localhost:3000/api/discord/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          discordUserId: discordUserId,
          token: token,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, tokenData: data.tokenData };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const deleteTokenFromServer = async (
    discordUserId: string,
    cvnlUserId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/discord/tokens/${discordUserId}/${cvnlUserId}`,
        {
          method: "DELETE",
        }
      );
      return response.ok;
    } catch (error) {
      console.error("Error deleting token from server:", error);
      return false;
    }
  };

  const loginWithDiscord = async () => {
    setIsLoading(true);
    try {
      const user = await authenticateWithDiscord();
      setDiscordUser(user);
      
      // Save user to shared storage
      await saveDiscordUser(user);
      
      // Load tokens for this user
      await loadSavedTokens(user.id);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Remove user from shared storage
      await removeDiscordUser();

      setDiscordUser(null);
      setTokens([]);
      setIsAddingToken(false);
      setNewToken("");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const addToken = async () => {
    if (!newToken.trim() || !discordUser) {
      alert("Vui lòng nhập token CVNL");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Adding token for user:", discordUser.id);
      console.log("Token:", newToken.trim().substring(0, 10) + "...");

      const result = await saveTokenToServer(discordUser.id, newToken.trim());
      console.log("Server response:", result);

      if (result && result.success && result.tokenData) {
        // Reload tokens from server
        await loadSavedTokens(discordUser.id);

        setNewToken("");
        setIsAddingToken(false);

        let successMessage = `✅ ${result.tokenData.message || 'Thêm tài khoản thành công!'}\n👤 ${result.tokenData.userName}`;

        // Show channel info if it was created
        if (result.tokenData.channelInfo) {
          successMessage += `\n\n🆕 Đã tạo kênh Discord: ${result.tokenData.channelInfo.channelName}`;
        }

        alert(successMessage);
      } else if (result && result.error) {
        // Show friendly error message
        let errorMessage = result.error || "Có lỗi xảy ra";

        if (errorMessage.includes("không hợp lệ")) {
          errorMessage =
            "❌ Token không hợp lệ\n\nVui lòng kiểm tra lại token CVNL của bạn.";
        } else if (errorMessage.includes("đã được thêm")) {
          errorMessage = "⚠️ Tài khoản đã tồn tại\n\n" + errorMessage;
        } else if (errorMessage.includes("kết nối")) {
          errorMessage =
            "🌐 Lỗi kết nối\n\nKhông thể kết nối đến server. Vui lòng thử lại sau.";
        }

        alert(errorMessage);
      } else {
        console.error("Unexpected response format:", result);
        alert(
          "💥 Server trả về format không đúng\n\nVui lòng kiểm tra server logs."
        );
      }
    } catch (error) {
      console.error("Add token error:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        alert(
          "🌐 Không thể kết nối đến server\n\nVui lòng kiểm tra:\n- Server có đang chạy?\n- Cổng 3000 có bị block?"
        );
      } else {
        alert(
          "💥 Có lỗi không xác định xảy ra\n\nChi tiết lỗi: " + error.message
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeToken = async (tokenId: string) => {
    if (!discordUser) return;

    if (confirm("Bạn có chắc chắn muốn xóa token này?")) {
      const success = await deleteTokenFromServer(discordUser.id, tokenId);
      if (success) {
        // Reload tokens from server
        await loadSavedTokens(discordUser.id);
      } else {
        alert("Có lỗi xảy ra khi xóa token");
      }
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        gap: "20px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #5865F2",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      ></div>
      <p style={{ color: "#666", fontSize: "14px" }}>
        Đang kiểm tra trạng thái đăng nhập...
      </p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );

  // Show loading screen while checking authentication
  if (isInitialLoading) {
    return (
      <div
        className="main-container focusable"
        ref={mainBlockRef}
        tabIndex={0}
        style={{ minHeight: "600px", padding: "20px" }}
      >
        <div id="token_manager_block" className="block-1">
          <div className="settings-heading">
            <img
              src="https://cdn.discordapp.com/emojis/986178507291889664.webp?size=96&animated=true"
              alt="settings"
            />
            <h2>CVNL Discord Manager</h2>
          </div>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!discordUser) {
    return (
      <div
        className="main-container focusable"
        ref={mainBlockRef}
        tabIndex={0}
        style={{ minHeight: "600px", padding: "20px" }}
      >
        <div id="token_manager_block" className="block-1">
          <div className="settings-heading">
            <img
              src="https://cdn.discordapp.com/emojis/986178507291889664.webp?size=96&animated=true"
              alt="settings"
            />
            <h2>CVNL Discord Manager</h2>
          </div>

          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <h3>Đăng nhập để bắt đầu</h3>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Đăng nhập với Discord để quản lý các token CVNL của bạn
            </p>
            <button
              onClick={loginWithDiscord}
              disabled={isLoading}
              style={{
                padding: "12px 24px",
                backgroundColor: isLoading ? "#9ca3af" : "#5865F2",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "0 auto",
                transition: "background-color 0.3s ease",
              }}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #ffffff40",
                      borderTop: "2px solid #ffffff",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>🔗</span>
                  <span>Đăng nhập với Discord</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show main interface when authenticated
  return (
    <div
      className="main-container focusable"
      ref={mainBlockRef}
      tabIndex={0}
      style={{ minHeight: "600px", padding: "20px", fontSize: "14px" }}
    >
      <div id="token_manager_block" className="block-1">
        <div className="settings-heading">
          <img
            src="https://cdn.discordapp.com/emojis/986178507291889664.webp?size=96&animated=true"
            alt="settings"
          />
          <h2>CVNL Token Manager</h2>
        </div>

        {/* User Info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#5865F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {discordUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: "bold" }}>
                {discordUser.username}#{discordUser.discriminator}
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                Discord User
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              padding: "6px 12px",
              backgroundColor: "#ed4245",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Đăng xuất
          </button>
        </div>

        {/* Add Token Section */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3>Danh sách Token ({tokens.length})</h3>
            <button
              onClick={() => setIsAddingToken(!isAddingToken)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#57F287",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {isAddingToken ? "Hủy" : "+ Thêm Token"}
            </button>
          </div>

          {isAddingToken && (
            <div
              style={{
                padding: "15px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                marginBottom: "20px",
                backgroundColor: "#f8f9fa",
              }}
            >
              <h4>Thêm Token Mới</h4>
              <div style={{ marginBottom: "10px", width: "100%" }}>
                <Textbox
                  value={newToken}
                  onChange={setNewToken}
                  placeholder="Nhập CVNL token của bạn..."
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={addToken}
                  disabled={isLoading || !newToken.trim()}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: !newToken.trim() ? "#6c757d" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: !newToken.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {isLoading ? "Đang kiểm tra..." : "Thêm Token"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Token List */}
        <div
          style={{
            marginBottom: "20px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {tokens.length === 0 ? (
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
          ) : (
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
                      onClick={() => removeToken(token.id)}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenManager;
