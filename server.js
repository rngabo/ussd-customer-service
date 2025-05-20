// Basic Express server setup for USSD Customer Service
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev')); // for logging HTTP requests
app.use(express.static('public')); // Serve static files from 'public' directory

// Sessions storage - in-memory for simplicity
// In production, use a database or Redis
const sessions = {};

// Create a debug log function
function debugLog(message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}\n`;
  
  // Log to console
  console.log(logEntry);
  
  // Optional: Log to file - make sure directory exists
  try {
    fs.appendFileSync(path.join(__dirname, 'ussd-debug.log'), logEntry);
  } catch (error) {
    console.error('Could not write to log file:', error.message);
  }
}

// Process Level One Menu Selections
function processLevelOne(selection) {
  switch(selection) {
    case '1': // Account Issues
      return `CON Account Issues
1. Password Reset
2. Account Locked
3. Update Personal Details
4. Back to Main Menu`;
    
    case '2': // Product Information
      return `CON Product Information
1. Data Bundles
2. Voice Plans
3. Value Added Services
4. Back to Main Menu`;
    
    case '3': // Report a Problem
      return `CON Report a Problem
1. Network Issues
2. Billing Problems
3. Service Quality
4. Back to Main Menu`;
    
    case '4': // Talk to an Agent
      return `END We will connect you with a customer service agent shortly. 
Please expect a call within the next 30 minutes.
Thank you for your patience.`;
    
    default:
      return `END Invalid selection. Please dial *384*250250# again to restart.`;
  }
}

// Process Level Two Menu Selections
function processLevelTwo(level1, level2) {
  if (level1 === '1') { // Account Issues
    switch(level2) {
      case '1': // Password Reset
        return `CON Do you want to reset your account password?
1. Yes
2. No`;
      
      case '2': // Account Locked
        return `CON Is your account currently locked?
1. Yes
2. No`;
      
      case '3': // Update Personal Details
        return `CON Which details do you want to update?
1. Phone Number
2. Email
3. Address`;
      
      case '4': // Back to Main Menu
        return `CON Welcome to Our Customer Service
1. Account Issues
2. Product Information
3. Report a Problem
4. Talk to an Agent`;
      
      default:
        return `END Invalid selection. Please dial *384*250250# again to restart.`;
    }
  } 
  else if (level1 === '2') { // Product Information
    switch(level2) {
      case '1': // Data Bundles
        return `END Here are our data bundles:
- Daily: 50MB at KES 20
- Weekly: 500MB at KES 100
- Monthly: 2GB at KES 500
Dial *544# to purchase.`;
      
      case '2': // Voice Plans
        return `END Our voice plans:
- Daily: 20 mins at KES 20
- Weekly: 100 mins at KES 100
- Monthly: 400 mins at KES 300
Dial *100# to purchase.`;
      
      case '3': // Value Added Services
        return `END Our value added services:
- Call me back: *111#
- Please call me: *130#
- Bonga Points: *126#`;
      
      case '4': // Back to Main Menu
        return `CON Welcome to Our Customer Service
1. Account Issues
2. Product Information
3. Report a Problem
4. Talk to an Agent`;
      
      default:
        return `END Invalid selection. Please dial *384*250250# again to restart.`;
    }
  } 
  else if (level1 === '3') { // Report a Problem
    switch(level2) {
      case '1': // Network Issues
        return `CON What network issue are you experiencing?
1. No network coverage
2. Slow internet
3. Calls dropping`;
      
      case '2': // Billing Problems
        return `CON What billing issue are you facing?
1. Wrong charges
2. Double billing
3. Subscription issues`;
      
      case '3': // Service Quality
        return `CON What service quality issues are you experiencing?
1. Poor call quality
2. Messages not delivered
3. Internet connectivity`;
      
      case '4': // Back to Main Menu
        return `CON Welcome to Our Customer Service
1. Account Issues
2. Product Information
3. Report a Problem
4. Talk to an Agent`;
      
      default:
        return `END Invalid selection. Please dial *384*250250# again to restart.`;
    }
  } 
  else {
    return `END Invalid selection. Please dial *384*250250# again to restart.`;
  }
}

// Process Level Three Menu Selections
function processLevelThree(level1, level2, level3) {
  // Handle Account Issues -> Password Reset flow
  if (level1 === '1' && level2 === '1') {
    if (level3 === '1') { // Yes to password reset
      return `END A password reset link has been sent to your registered email address.
If you don't receive it within 10 minutes, please call our customer care line at 100.`;
    } 
    else if (level3 === '2') { // No to password reset
      return `END Thank you for using our service. If you need any other assistance, please dial *384*250250# again.`;
    }
  }
  
  // Handle Account Issues -> Account Locked flow
  if (level1 === '1' && level2 === '2') {
    if (level3 === '1') { // Yes account is locked
      return `END We'll process your account unlock request.
You'll receive an SMS with verification instructions within 30 minutes.`;
    }
    else if (level3 === '2') { // No account is not locked
      return `END If you're still having issues accessing your account, please call our customer care line at 100.`;
    }
  }
  
  // Handle Report a Problem -> Network Issues flow
  if (level1 === '3' && level2 === '1') {
    return `END Thank you for reporting a network issue.
We have logged your complaint and our team will resolve it soon.
Reference number: NW${Date.now().toString().slice(-6)}`;
  }
  
  // Handle Report a Problem -> Billing Problems flow
  if (level1 === '3' && level2 === '2') {
    return `END Thank you for reporting a billing issue.
We have logged your complaint and our team will investigate.
Reference number: BL${Date.now().toString().slice(-6)}`;
  }
  
  // Default response for level 3
  return `END Thank you for using our service. Your request has been registered.
If you need further assistance, please call our customer care line at 100.`;
}

// Root route to serve the USSD simulator
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ussd-test.html'));
});

// Alias routes for simulator
app.get('/ussd-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ussd-test.html'));
});

app.get('/ussd-simulate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ussd-test.html'));
});

// Main USSD callback endpoint
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

// Add debugging endpoint to check configuration
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

// Africa's Talking Simulator Connection Test
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

// Start the server
app.listen(PORT, () => {
  console.log(`USSD Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the USSD simulator`);
});