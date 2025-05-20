const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 3000;
const PASSWORD = '250250250'; // hardcoded entry password
const sessions = {}; // in-memory session store

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

function debugLog(message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}\n`;
  console.log(logEntry);
  fs.appendFileSync(path.join(__dirname, 'ussd-debug.log'), logEntry);
}

// USSD callback handler
app.post('/api/ussd/callback', (req, res) => {
  try {
    debugLog('USSD Request Received', req.body);
    let { sessionId, serviceCode, phoneNumber, text } = req.body;

    if (!sessionId || !serviceCode || !phoneNumber) {
      debugLog('Missing required parameters', { sessionId, serviceCode, phoneNumber });
      return res.status(400).send('Missing required parameters');
    }

    // Split user input by *
    const textArray = text ? text.split('*') : [];
    const level = textArray.length;

    let response = getMenuText(level, textArray);

    // Save session (optional)
    sessions[sessionId] = { phoneNumber, lastResponse: response, timestamp: new Date() };
    debugLog('USSD Response', { response });

    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (error) {
    debugLog('USSD Error', { error: error.message, stack: error.stack });
    res.status(500).send('END An error occurred. Please try again later.');
  }
});

// Menu logic in one function
function getMenuText(level, arr) {
  // 1. Password entry
  if (level === 0 || arr[0] === '') {
    return 'CON Enter your access password:';
  }
  if (level === 1) {
    if (arr[0] !== PASSWORD) {
      return 'END Incorrect password. Access denied.';
    }
    // Password correct, show main menu
    return `CON Welcome! What would you like to pay for?
1. Paid - Simba Code: 3020
2. Paid - Simba Code: 6398
3. Paid - Hospital Code: 1256
4. Paid - Hotel 8796`;
  }
  // 2. Main menu option chosen
  if (level === 2) {
    const menuOption = arr[1];
    let service = '';
    switch (menuOption) {
      case '1': service = 'Paid - Simba Code: 3020'; break;
      case '2': service = 'Paid - Simba Code: 6398'; break;
      case '3': service = 'Paid - Hospital Code: 1256'; break;
      case '4': service = 'Paid - Hotel 8796'; break;
      default: return 'END Invalid selection. Try again.';
    }
    // After any selection, ask for rating
    return `CON You selected: ${service}
How was the service?
1. Excellent
2. Good
3. Average
4. Poor`;
  }
  // 3. Service rating
  if (level === 3) {
    let ratingMsg = '';
    switch (arr[2]) {
      case '1': ratingMsg = 'Excellent'; break;
      case '2': ratingMsg = 'Good'; break;
      case '3': ratingMsg = 'Average'; break;
      case '4': ratingMsg = 'Poor'; break;
      default: ratingMsg = null;
    }
    if (!ratingMsg) return 'END Invalid rating selection. Goodbye!';
    return `END Thank you! You rated the service as: ${ratingMsg}.`;
  }
  // Fallback
  return 'END Thank you for using our service!';
}

// Optional: debug endpoint
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

// Start server
app.listen(PORT, () => {
  console.log(`USSD Server running at http://localhost:${PORT}`);
});
