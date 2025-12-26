# CVNL Discord Integration

Hệ thống tích hợp toàn diện giữa CVNL (Chat với người lạ) và Discord, bao gồm Discord bot và browser extension, cho phép người dùng quản lý các cuộc trò chuyện CVNL trực tiếp thông qua Discord channels và threads.

## 🌟 Tính năng

### Tính năng Discord Bot
- **Quản lý đa tài khoản CVNL** - Hỗ trợ nhiều tài khoản CVNL cho mỗi người dùng Discord
- **Tự động tạo channel** - Tạo Discord channel riêng cho từng tài khoản CVNL
- **Hệ thống chat dựa trên thread** - Mỗi phiên chat CVNL có thread Discord riêng
- **Đồng bộ tin nhắn thời gian thực** - Tin nhắn được đồng bộ liền mạch giữa CVNL và Discord
- **Theo dõi vị trí hàng đợi** - Cập nhật trực tiếp vị trí trong hàng đợi chat
- **Quản lý vòng đời chat** - Bắt đầu, theo dõi và kết thúc cuộc trò chuyện từ Discord
- **Xác thực OAuth2 Discord** - Hệ thống đăng nhập Discord an toàn

### Tính năng Browser Extension
- **Quản lý kết nối WebSocket** - Duy trì kết nối đến cả CVNL và Discord server
- **Giao diện quản lý token** - Giao diện thân thiện để quản lý CVNL token
- **Chuyển tiếp sự kiện thời gian thực** - Chuyển tiếp events CVNL đến Discord ngay lập tức
- **Giám sát trạng thái kết nối** - Hiển thị trực quan tình trạng kết nối
- **Công cụ kiểm tra** - Công cụ tích hợp để test WebSocket và events

### Lệnh Slash Commands cơ bản
- `/login` - Thêm tài khoản CVNL vào Discord
- `/startchat` - Bắt đầu tìm kiếm đối tác chat
- `/endchat` - Kết thúc phiên chat hiện tại
- `/chatinfo` - Xem trạng thái và thông tin chat hiện tại

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Browser Ext    │    │  Discord Server  │    │  Discord Bot    │
│  (Client)       │    │  (Node.js)       │    │  (discord.js)   │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Token Manager │◄──►│ • WebSocket      │◄──►│ • Slash Commands│
│ • CVNL Socket   │    │ • REST API       │    │ • Channel Mgmt  │
│ • Event Forward │    │ • Authentication │    │ • Thread Mgmt   │
│ • UI Components │    │ • Database (SQLite)│  │ • Message Sync  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CVNL Server                             │
│                   (Kết nối Socket.IO)                          │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Cấu trúc dự án

```
cvnl.discord/
├── server/                 # Discord bot và WebSocket server
│   ├── src/
│   │   ├── bot/           # Discord bot implementation
│   │   │   ├── commands/  # Slash commands
│   │   │   └── index.ts   # Bot initialization
│   │   ├── services/      # Các service cốt lõi
│   │   │   ├── api.js     # Tích hợp CVNL API
│   │   │   ├── channel.ts # Quản lý Discord channel
│   │   │   ├── database.js# Thao tác SQLite database
│   │   │   └── discord-oauth.js # Xác thực OAuth2
│   │   ├── ws/            # WebSocket server
│   │   │   ├── events/    # WebSocket event handlers
│   │   │   └── server.ts  # WebSocket server setup
│   │   ├── routes/        # REST API routes
│   │   └── index.ts       # Main server entry point
│   └── package.json
├── client/                # Browser extension
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── TokenManager/ # Giao diện quản lý token
│   │   │   └── Settings/  # Giao diện cài đặt và testing
│   │   ├── services/      # Client services
│   │   ├── cvnl.ts       # Logic tích hợp CVNL
│   │   └── service_worker.ts # Extension background script
│   ├── public/
│   │   └── manifest.json  # Extension manifest
│   └── vite.config.ts
└── package.json           # Root workspace configuration
```

## 🚀 Bắt đầu

### Yêu cầu hệ thống

- **Node.js** 18+ và npm
- **Discord Application** với bot token
- **Discord OAuth2** credentials
- **Chrome/Chromium** browser (cho extension)

### 1. Clone Repository

```bash
git clone <repository-url>
cd cvnl.discord
npm install
```

### 2. Cấu hình Environment

Tạo file `server/.env`:

```env
# Cấu hình Discord Bot
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/callback

# Cổng Server
PORT=3000
WS_PORT=3001

# Development
NODE_ENV=development
```

### 3. Thiết lập Discord Application

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications)
2. Tạo application mới
3. Trong phần "Bot":
   - Tạo bot và copy token
   - Bật "Message Content Intent"
4. Trong phần "OAuth2":
   - Thêm redirect URI: `http://localhost:3000/callback`
   - Copy Client ID và Client Secret

### 4. Cài đặt Dependencies

```bash
# Cài đặt tất cả workspace dependencies
npm install

# Hoặc cài đặt riêng lẻ
cd server && npm install
cd ../client && npm install
```

## 🖥️ Chạy ứng dụng

### Khởi động Server

#### Cách 1: Chạy trực tiếp (Development)
```bash
cd server
npm run dev
```

#### Cách 2: Sử dụng start script (WSL/Linux)
```bash
# Từ root project
./start-server.sh
```

Script sẽ:
- ✅ Kiểm tra và cleanup process cũ nếu port bị chiếm
- ✅ Chạy server với WSL Node.js
- ✅ Detach process khỏi terminal (dùng setsid)
- ✅ Đợi cả 2 ports (3000 và 3001) listen
- ✅ Lưu PID vào `server.pid`
- ✅ Ghi logs vào `logs/server.log`

**Kiểm tra trạng thái:**
```bash
# Check PID
cat server.pid

# Check process
ps -p $(cat server.pid)

# Check ports
ss -tuln | grep -E ":(3000|3001)"

# Tail logs
tail -f logs/server.log
```

**Dừng server:**
```bash
# Kill process
kill $(cat server.pid)

# Hoặc force kill
kill -9 $(cat server.pid)
```

#### Cách 3: Windows với Task Scheduler (Auto-start khi boot)

**Bước 1: Copy scripts vào C:\scripts**
```powershell
# Từ thư mục scripts/ trong project, copy các file sau vào C:\scripts\:
- cvnl-discord-simple.ps1        # Main startup script
- register-cvnl-service-simple.ps1  # Install service
- unregister-cvnl-service.ps1    # Uninstall service  
- check-cvnl-status.ps1          # Status checker
```

**Bước 2: Đăng ký Windows Task Scheduler**
```powershell
# Mở PowerShell với quyền Administrator
cd C:\scripts
.\register-cvnl-service-simple.ps1
```

Task sẽ:
- ✅ Tự động chạy khi Windows khởi động
- ✅ Tự động chạy khi user login
- ✅ Auto restart nếu fail (3 lần)
- ✅ Chạy ẩn (hidden window)
- ✅ Ghi logs vào `C:\scripts\cvnl-simple.log`

**Quản lý service:**
```powershell
# Kiểm tra trạng thái
.\check-cvnl-status.ps1

# Start service manually
Start-ScheduledTask -TaskName "CVNL Discord Service"

# Stop service (kill WSL process)
wsl -d Debian -- bash -c 'kill $(cat /mnt/u/projects/cvnl.discord/server.pid)'

# Disable task
Disable-ScheduledTask -TaskName "CVNL Discord Service"

# Enable task
Enable-ScheduledTask -TaskName "CVNL Discord Service"

# Gỡ bỏ service
.\unregister-cvnl-service.ps1

# Xem logs
Get-Content C:\scripts\cvnl-simple.log -Tail 30

# Hoặc mở Task Scheduler GUI
Win + R → gõ: taskschd.msc
```

**Output từ check-cvnl-status.ps1:**
```
========================================
  CVNL Discord Service Status Check
========================================

[1] Task Scheduler Status:
   Task exists: YES
   State: Ready (Enabled, not running)
   Last Run: 11/10/2025 1:30:00 PM
   Last Result: Success (0)

[2] WSL Process Status:
   Status: RUNNING
   PID: 12345
   Command: /home/user/.nvm/versions/node/v20.19.2/bin/node dist/index.js

[3] Port Status:
   - Port 3000 (HTTP): LISTENING
   - Port 3001 (WebSocket): LISTENING

========================================
  Overall Status: HEALTHY
========================================
```

**Lưu ý Windows:**
- Task chạy với user account hiện tại
- Yêu cầu WSL Debian distribution đã cài đặt
- Script sẽ tự động start WSL khi Windows boot
- Logs được lưu tại `C:\scripts\cvnl-simple.log`

Điều này sẽ khởi động:
- **Discord Bot** - Kết nối đến Discord API
- **WebSocket Server** - Port 3001 (cho browser extension)
- **REST API Server** - Port 3000 (cho OAuth và quản lý token)

### Build và cài đặt Extension

```bash
cd client
npm run build
```

1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật "Developer mode"
3. Click "Load unpacked" và chọn thư mục `client/dist`

## 📖 Hướng dẫn sử dụng

### Thiết lập tài khoản CVNL đầu tiên

#### Phương pháp 1: Discord Slash Command
1. Mời bot vào Discord server của bạn
2. Sử dụng lệnh `/login` trong bất kỳ channel nào
3. Nhập CVNL token của bạn trong modal
4. Bot sẽ tạo channel riêng cho tài khoản của bạn

#### Phương pháp 2: Browser Extension
1. Mở extension popup
2. Đăng nhập bằng Discord OAuth
3. Thêm CVNL token thông qua giao diện
4. Xem trạng thái kết nối và quản lý nhiều tài khoản

### Bắt đầu phiên Chat

```bash
# Trong channel CVNL chuyên dụng của bạn
/startchat
```

Bot sẽ:
1. ✅ Kiểm tra bạn chưa có chat nào đang hoạt động
2. 🔍 Gửi yêu cầu bắt đầu chat đến CVNL
3. 📊 Hiển thị cập nhật vị trí hàng đợi
4. 🧵 Tạo thread khi tìm được đối tác
5. 💬 Đồng bộ tất cả tin nhắn thời gian thực

### Quản lý phiên Chat

```bash
# Xem trạng thái chat hiện tại
/chatinfo

# Kết thúc chat hiện tại (sử dụng trong thread)
/endchat
```

### Luồng tin nhắn

```
Discord Thread ↔ Discord Bot ↔ Browser Extension ↔ CVNL Server
     │                                                    │
     └── Đồng bộ tin nhắn hai chiều thời gian thực ───────┘
```

## 🔧 Cấu hình

### Schema Database

Bot sử dụng SQLite với các bảng chính:
- `users` - Mapping tài khoản Discord ↔ CVNL
- `channels` - Quản lý Discord channel
- `chat_threads` - Theo dõi thread chat đang hoạt động

### WebSocket Events

#### CVNL Events (từ CVNL server):
- `c1` - Chat bắt đầu
- `c2` - Tin nhắn mới
- `c5` - Chat kết thúc
- `c17` - Cập nhật vị trí hàng đợi

#### Discord Events (từ Discord bot):
- `start_chat` - Yêu cầu bắt đầu chat
- `end_chat` - Yêu cầu kết thúc chat
- `new_message_from_discord` - Gửi tin nhắn đến CVNL

### API Endpoints

```bash
# Xác thực OAuth2
POST /api/discord/oauth/token
POST /api/discord/oauth/verify
POST /api/discord/oauth/refresh

# Quản lý Token
GET    /api/discord/tokens/:discordUserId
POST   /api/discord/tokens
DELETE /api/discord/tokens/:discordUserId/:cvnlUserId

# Health Check
GET /health
```

## 🛠️ Development

### Server Development

```bash
cd server
npm run dev          # Khởi động với nodemon
npm run build        # Build TypeScript
npm start           # Khởi động production
```

### Extension Development

```bash
cd client
npm run dev         # Development build với watch
npm run build       # Production build
```

### Testing WebSocket Connections

Extension bao gồm công cụ testing tích hợp:

1. Mở extension popup
2. Đi đến phần "Test WebSocket & C1 Event"
3. Chọn token và test kết nối
4. Gửi test events và theo dõi phản hồi

## 🔒 Tính năng bảo mật

- **Mã hóa Token** - CVNL token được lưu trữ an toàn
- **OAuth2 Flow** - Triển khai OAuth2 Discord chuẩn
- **Private Channels** - Mỗi người dùng có Discord channel riêng biệt
- **Thread Isolation** - Chat được tách biệt bằng Discord threads
- **Yêu cầu xác thực** - Tất cả thao tác đều yêu cầu xác thực hợp lệ

## 🐛 Khắc phục sự cố

### Các vấn đề thường gặp

**Bot không phản hồi lệnh:**
```bash
# Kiểm tra quyền bot trong Discord server
# Xác minh DISCORD_TOKEN trong .env
# Kiểm tra bot logs để tìm lỗi xác thực
```

**Extension không kết nối được:**
```bash
# Xác minh server đang chạy trên port 3001
# Kiểm tra browser console để tìm lỗi WebSocket
# Đảm bảo Discord user đã được xác thực
```

**Tin nhắn không đồng bộ:**
```bash
# Xác minh CVNL token hợp lệ
# Kiểm tra trạng thái kết nối WebSocket trong extension
# Theo dõi server logs để kiểm tra event forwarding
```

### Debug Mode

Bật verbose logging:

```env
NODE_ENV=development
DEBUG=true
```

## 📈 Monitoring

### Health Checks

```bash
curl http://localhost:3000/health
```

### Trạng thái kết nối

Theo dõi trong extension popup:
- Trạng thái xác thực Discord
- Tính hợp lệ của CVNL token
- Tình trạng kết nối WebSocket
- Phiên chat đang hoạt động

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/tinh-nang-tuyet-voi`)
3. Commit changes (`git commit -m 'Thêm tính năng tuyệt vời'`)
4. Push lên branch (`git push origin feature/tinh-nang-tuyet-voi`)
5. Tạo Pull Request

## 📝 License

Dự án này được cấp phép theo MIT License - xem file LICENSE để biết chi tiết.

## 🆘 Hỗ trợ

Để được hỗ trợ và đặt câu hỏi:
- Tạo issue trong repository
- Kiểm tra phần khắc phục sự cố ở trên
- Xem server logs để có thông tin lỗi chi tiết

---

**Lưu ý**: Dự án này dành cho mục đích giáo dục và sử dụng cá nhân. Vui lòng tuân thủ điều khoản dịch vụ của CVNL và chính sách developer của Discord.