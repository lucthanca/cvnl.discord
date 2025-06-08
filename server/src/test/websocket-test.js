import WebSocket from 'ws';

// Test data for c1 - match event
const testC1MatchEvent = {
  type: 'c1',
  data: {
    chatId: 'test_chat_' + Date.now(),
    partnerId: 'test_partner_' + Math.random().toString(36).substr(2, 9),
    partnerName: 'Test Partner',
    partnerGender: 'male',
    partnerAge: 25,
    partnerJob: 1
  }
};

// Test steps
console.log('=== CVNL Discord WebSocket Test ===');
console.log('Step 1: Connecting to WebSocket server...');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server');
  
  console.log('\nStep 2: Sending authentication message...');
  // Replace with a valid CVNL user ID from your database
  const authMessage = {
    type: 'auth',
    userId: 'YOUR_CVNL_USER_ID_HERE', // Change this to an actual user ID
    token: 'YOUR_CVNL_TOKEN_HERE'      // Change this to an actual token
  };
  
  ws.send(JSON.stringify(authMessage));
  console.log('📤 Sent auth message:', authMessage);
});

ws.on('message', function message(data) {
  const parsedData = JSON.parse(data.toString());
  console.log('📥 Received message:', parsedData);
  
  if (parsedData.type === 'auth_success') {
    console.log('\nStep 3: Authentication successful, sending c1 match event...');
    
    setTimeout(() => {
      ws.send(JSON.stringify(testC1MatchEvent));
      console.log('📤 Sent c1 match event:', testC1MatchEvent);
    }, 1000);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Auto close after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout, closing connection...');
  ws.close();
}, 30000);
