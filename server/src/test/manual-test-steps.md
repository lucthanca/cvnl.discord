# Manual Test Steps for C1 Match Event

## Prerequisites
1. Discord bot is running
2. WebSocket server is running on port 8080
3. At least one user is logged in with a valid CVNL token
4. User has a Discord channel created

## Step 1: Get Test Data
1. Check your database for existing users:
   ```sql
   SELECT discordId, cvnlUserId, cvnlUserName, token FROM User LIMIT 5;
   ```

2. Get user channel info:
   ```sql
   SELECT * FROM UserChannel WHERE discordId = 'YOUR_DISCORD_ID';
   ```

## Step 2: Prepare Test Environment
1. Open the Discord server where the bot is active
2. Go to the user's private channel
3. Open browser developer console on the web client

## Step 3: Test C1 Match Event
### Option A: Using WebSocket Test Script
1. Update the test file with real user data:
   ```javascript
   const authMessage = {
     type: 'auth',
     userId: 'REAL_CVNL_USER_ID',
     token: 'REAL_CVNL_TOKEN'
   };
   ```

2. Run the test:
   ```bash
   cd server/src/test
   node websocket-test.js
   ```

### Option B: Manual WebSocket Connection
1. Connect to WebSocket using browser console:
   ```javascript
   const ws = new WebSocket('ws://localhost:8080');
   
   ws.onopen = () => {
     console.log('Connected');
     // Send auth
     ws.send(JSON.stringify({
       type: 'auth',
       userId: 'YOUR_CVNL_USER_ID',
       token: 'YOUR_CVNL_TOKEN'
     }));
   };
   
   ws.onmessage = (event) => {
     console.log('Received:', JSON.parse(event.data));
   };
   ```

2. After authentication success, send c1 match event:
   ```javascript
   ws.send(JSON.stringify({
     type: 'c1',
     data: {
       chatId: 'test_chat_' + Date.now(),
       partnerId: 'test_partner_123',
       partnerName: 'Test Partner',
       partnerGender: 'female',
       partnerAge: 28,
       partnerJob: 2
     }
   }));
   ```

## Step 4: Verify Results
1. Check Discord channel for new thread creation
2. Check database for chat thread record:
   ```sql
   SELECT * FROM ChatThread ORDER BY createdAt DESC LIMIT 5;
   ```
3. Check server logs for any errors

## Expected Results
1. ✅ New thread created in Discord channel
2. ✅ Thread name format: "Chat với Test Partner"
3. ✅ ChatThread record saved in database
4. ✅ Match message sent to thread
5. ✅ No errors in server logs

## Common Issues & Solutions

### Issue 1: Upsert Error
```
Error: Failed to save chat thread: Unique constraint failed
```
**Solution**: The database schema might need adjustment for the unique constraint.

### Issue 2: Thread Creation Failed
```
Error creating thread: Missing permissions
```
**Solution**: Check bot permissions in the Discord channel.

### Issue 3: User Not Found
```
User not found for Discord ID
```
**Solution**: Ensure user has logged in via /login command first.

## Test Data Examples

### Valid Test Users (Update with real data)
```json
{
  "discordId": "123456789012345678",
  "cvnlUserId": "user123",
  "cvnlUserName": "TestUser",
  "token": "valid_token_here"
}
```

### Valid C1 Match Event
```json
{
  "type": "c1",
  "data": {
    "chatId": "chat_20241201_001",
    "partnerId": "partner_456",
    "partnerName": "Nguyễn Văn A",
    "partnerGender": "male",
    "partnerAge": 25,
    "partnerJob": 1
  }
}
```
