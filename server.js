// 1. Add Better Error Handling and Logging to server.js

// Add these at the top of your server.js file after the existing imports
const fs = require('fs');
const path = require('path');

// Create a debug log function
function debugLog(message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}\n`;
  
  // Log to console
  console.log(logEntry);
  
  // Optional: Log to file
  fs.appendFileSync(path.join(__dirname, 'ussd-debug.log'), logEntry);
}

// Then modify your USSD callback endpoint for better error handling
app.post('/api/ussd/callback', (req, res) => {
  try {
    debugLog('USSD Request Received', req.body);
    
    const {
      sessionId,
      serviceCode,
      phoneNumber,
      text
    } = req.body;
    
    // Validate required parameters
    if (!sessionId || !serviceCode || !phoneNumber) {
      debugLog('Missing required parameters', { sessionId, serviceCode, phoneNumber });
      return res.status(400).send('Missing required parameters');
    }
    
    let response = '';
    
    // Process USSD menu based on the text input
    const textArray = text ? text.split('*') : [];
    const level = textArray.length;
    
    debugLog('Processing menu', { level, textArray });
    
    // Main menu - First request with empty text
    if (text === '') {
      response = `CON Welcome to Our Customer Service
1. Account Issues
2. Product Information
3. Report a Problem
4. Talk to an Agent`;
    } else {
      // Process based on menu level and user selection
      switch (level) {
        case 1:
          response = processLevelOne(textArray[0]);
          break;
        case 2:
          response = processLevelTwo(textArray[0], textArray[1]);
          break;
        case 3:
          response = processLevelThree(textArray[0], textArray[1], textArray[2]);
          break;
        default:
          response = "END Thank you for using our service. We will contact you shortly.";
      }
    }
    
    // Store session data if needed
    sessions[sessionId] = {
      phoneNumber,
      lastResponse: response,
      timestamp: new Date()
    };
    
    debugLog('USSD Response', { response });
    
    // Set proper content type for Africa's Talking
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (error) {
    debugLog('USSD Error', { error: error.message, stack: error.stack });
    res.status(500).send('END An error occurred. Please try again later.');
  }
});

// 2. Create a Local Testing Script to Validate Your USSD Flow

// Save this as test-ussd-flow.js
/*
const axios = require('axios');

// Define the endpoint - change this to match your deployment
const ENDPOINT = 'http://localhost:3000/api/ussd/callback';

// Generate a unique session ID
const sessionId = 'TEST_' + Date.now();
const phoneNumber = '+254700000000';
const serviceCode = '*384*250250#';

// Function to make USSD requests
async function makeUSSDRequest(text) {
  try {
    console.log(`\n----- Making request with text: "${text}" -----`);
    
    const response = await axios.post(ENDPOINT, {
      sessionId,
      serviceCode,
      phoneNumber,
      text
    });
    
    console.log('Response:', response.data);
    
    // Return true if the response starts with END, indicating the session is over
    return response.data.startsWith('END');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return true; // End the session on error
  }
}

// Test the complete USSD flow
async function testUSSDFlow() {
  // Start session with empty text
  let isEnd = await makeUSSDRequest('');
  if (isEnd) return;
  
  // Select option 1: Account Issues
  isEnd = await makeUSSDRequest('1');
  if (isEnd) return;
  
  // Select option 1: Password Reset
  isEnd = await makeUSSDRequest('1*1');
  if (isEnd) return;
  
  // Confirm Yes
  await makeUSSDRequest('1*1*1');
}

testUSSDFlow();
*/

// 3. Updating the USSD Simulator HTML to match your service code

// Update the serviceCode input default value in public/ussd-test.html:
// <input type="text" class="form-control" id="serviceCode" value="*384*250250#">

// 4. Add debugging endpoint to check configuration

app.get('/api/debug', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    port: PORT,
    routes: app._router.stack
      .filter(r => r.route)
      .map(r => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods).join(',')
      })),
    sessions: Object.keys(sessions).length
  });
});

// 5. Africa's Talking Simulator Connection Test
app.get('/api/test-at-connection', async (req, res) => {
  try {
    // Simulate the format that Africa's Talking would send
    const testBody = {
      sessionId: 'AT_TEST_' + Date.now(),
      serviceCode: '*384*250250#',
      phoneNumber: '+254700000000',
      text: ''
    };
    
    // Log the test request
    debugLog('AT Connection Test Request', testBody);
    
    // Create fake response handlers to capture the response
    let responseContent = '';
    const fakeRes = {
      set: () => {},
      send: (content) => {
        responseContent = content;
      }
    };
    
    // Call your USSD handler directly to simulate
    const fakeReq = { body: testBody };
    
    // Process the request through your handler
    app.handle(fakeReq, fakeRes, () => {});
    
    // Return the results to check what would be sent back to AT
    res.json({
      status: 'success',
      testRequest: testBody,
      response: responseContent,
      message: 'If you see a menu response above, your USSD handler is working correctly.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});