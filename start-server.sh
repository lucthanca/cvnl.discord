#!/bin/bash

DIR=/mnt/u/projects/cvnl.discord
PORT=3000
WS_PORT=3001
PIDFILE=$DIR/server.pid
LOGFILE=$DIR/logs/server.log

# Đảm bảo thư mục logs tồn tại
mkdir -p $DIR/logs

cd $DIR
echo "Starting service at $(date)" >> $LOGFILE

# Kiểm tra và cleanup nếu port đang bị sử dụng
if ss -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$WS_PORT "; then
    echo "Port $PORT or $WS_PORT is already in use. Cleaning up..." >> $LOGFILE
    
    # Tìm và kill tất cả process node dist/index.js
    EXISTING_PIDS=$(pgrep -f "node dist/index.js")
    if [ ! -z "$EXISTING_PIDS" ]; then
        echo "Killing existing processes: $EXISTING_PIDS" >> $LOGFILE
        for PID in $EXISTING_PIDS; do
            kill $PID 2>/dev/null
        done
        # Đợi processes chết
        sleep 2
        # Force kill nếu còn sống
        for PID in $EXISTING_PIDS; do
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID 2>/dev/null
            fi
        done
        sleep 1
    fi
    
    # Nếu vẫn còn port bị chiếm, tìm và kill process đang chiếm port
    if ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        PORT_PID=$(ss -tulnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
        if [ ! -z "$PORT_PID" ]; then
            echo "Force killing process $PORT_PID holding port $PORT" >> $LOGFILE
            kill -9 $PORT_PID 2>/dev/null
        fi
    fi
    if ss -tuln 2>/dev/null | grep -q ":$WS_PORT "; then
        WS_PORT_PID=$(ss -tulnp 2>/dev/null | grep ":$WS_PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
        if [ ! -z "$WS_PORT_PID" ]; then
            echo "Force killing process $WS_PORT_PID holding port $WS_PORT" >> $LOGFILE
            kill -9 $WS_PORT_PID 2>/dev/null
        fi
    fi
    
    sleep 2
fi

# Kiểm tra xem service đã chạy chưa (sau khi cleanup)
if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat $PIDFILE)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        # Process tồn tại, kiểm tra xem có phải node dist/index.js không
        if ps -p $OLD_PID -o cmd= | grep -q "node dist/index.js"; then
            # Kiểm tra port
            if ss -tuln 2>/dev/null | grep -q ":$PORT " && ss -tuln 2>/dev/null | grep -q ":$WS_PORT "; then
                echo "Service already running with PID: $OLD_PID"
                echo "$(date) - Service already running with PID: $OLD_PID" >> $LOGFILE
                exit 0
            fi
        fi
    fi
    # PID file tồn tại nhưng process không còn, xóa file
    rm -f $PIDFILE
fi

# Run npm in background
# Force sử dụng WSL node bằng cách chạy trực tiếp thay vì qua npm
NODE_BIN="/home/vadu/.nvm/versions/node/v20.19.2/bin/node"

# Verify node binary exists
if [ ! -x "$NODE_BIN" ]; then
    echo "Error: WSL Node.js not found at $NODE_BIN" >> $LOGFILE
    echo "Error: WSL Node.js not found at $NODE_BIN"
    exit 1
fi

echo "Using Node: $NODE_BIN ($($NODE_BIN --version))" >> $LOGFILE

# Chạy trực tiếp node dist/index.js trong server directory
# Sử dụng setsid để detach process khỏi terminal session
cd $DIR/server
# setsid tạo new session, process sẽ không bị kill khi parent shell exit
setsid $NODE_BIN dist/index.js >> $LOGFILE 2>&1 &
NPM_PID=$!
cd $DIR

echo "NPM started with PID: $NPM_PID" >> $LOGFILE

# Đợi một chút để process spawn
sleep 2

# Verify process đang chạy
if ! ps -p $NPM_PID > /dev/null 2>&1; then
    echo "Failed to start: Process died immediately"
    echo "$(date) - Failed to start: Process died immediately" >> $LOGFILE
    echo "Check log for errors: tail -50 $LOGFILE"
    exit 1
fi

# Đợi Node process spawn và server startup (check port thực tế bằng curl/nc)
NODE_PID=""
echo "Waiting for Node.js server to start..." >> $LOGFILE

WAIT_COUNT=0
while true; do
    # Kiểm tra xem node process còn sống không
    if ! ps -p $NPM_PID > /dev/null 2>&1; then
        echo "Node process died unexpectedly"
        echo "$(date) - Node process died unexpectedly" >> $LOGFILE
        exit 1
    fi
    
    # Check port thực tế thay vì check log
    # Port 3000 (HTTP) - check bằng curl
    PORT_OK=0
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null | grep -q "200\|404\|302"; then
        PORT_OK=1
    fi
    
    # Port 3001 (WebSocket) - check bằng nc hoặc telnet
    WS_PORT_OK=0
    if nc -z localhost $WS_PORT 2>/dev/null || timeout 1 bash -c "echo -n > /dev/tcp/localhost/$WS_PORT" 2>/dev/null; then
        WS_PORT_OK=1
    fi
    
    if [ "$PORT_OK" -eq 1 ] && [ "$WS_PORT_OK" -eq 1 ]; then
        # Cả 2 port đã sẵn sàng
        echo $NPM_PID > $PIDFILE
        echo "Service started successfully on ports $PORT and $WS_PORT, Node PID: $NPM_PID"
        echo "$(date) - Service started, Node PID: $NPM_PID" >> $LOGFILE
        exit 0
    fi
    
    # Timeout sau 60s nếu không start được
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -gt 60 ]; then
        echo "Timeout: Service failed to start within 60 seconds"
        echo "$(date) - Timeout waiting for service" >> $LOGFILE
        kill $NPM_PID 2>/dev/null
        exit 1
    fi
    
    sleep 1
done