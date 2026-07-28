const { io } = require('socket.io-client');

const USER_ID = 'fb2da822-a786-4e61-b94b-c01a41bb4ffd';
const SERVER_URL = 'http://localhost:4000';

async function testApi() {
  console.log('Connecting to Socket.IO...');
  const socket = io(SERVER_URL, {
    extraHeaders: {
      'x-user-id': USER_ID,
    }
  });

  socket.on('connect', async () => {
    console.log('Socket connected! ID:', socket.id);
    socket.emit('join_room', USER_ID);
    
    console.log('Sending "hi" to HTTP API...');
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/coach/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        body: JSON.stringify({ text: 'hi' })
      });
      
      const json = await res.json();
      console.log('HTTP Response:', json);
    } catch (err) {
      console.error('HTTP Error:', err);
    }
  });

  socket.on('ai_stream_start', () => {
    console.log('AI started thinking...');
  });

  socket.on('ai_stream_chunk', (data) => {
    process.stdout.write(data.chunk);
  });

  socket.on('ai_stream_end', (data) => {
    console.log('\n\nFinal AI Message from DB:', data.finalMessage.content);
    console.log('\n--- SUCCESS ---');
    socket.disconnect();
    process.exit(0);
  });

  socket.on('ai_stream_error', (data) => {
    console.error('\n\nAI stream error:', data);
    socket.disconnect();
    process.exit(1);
  });
  
  socket.on('ai_stream_action', (data) => {
    console.log('\n[AI ACTION TRIGGERED]:', data.actionPayload);
  });
}

testApi();
