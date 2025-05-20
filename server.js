// server.js - Main entry point for Express.js USSD application

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// USSD Menu State Management (in memory for simplicity)
// In production, use a database like MongoDB or Redis
const sessions = {};

// USSD Callback Endpoint
app.post('/api/ussd/callback', (req, res) => {
  const {
    sessionId,
    serviceCode,
    phoneNumber,
    text
  } = req.body;
  
  console.log('USSD Request:', req.body);
  
  let response = '';
  
  // Process USSD menu based on the text input
  const textArray = text ? text.split('*') : [];
  const level = textArray.length;
  
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
  
  // Set proper content type for Africa's Talking
  res.set('Content-Type', 'text/plain');
  res.send(response);
});

// Level One Menu Processing
function processLevelOne(option) {
  switch (option) {
    case "1":
      return "CON Account Issues Menu:\n1. Password Reset\n2. Account Activation\n3. Update Personal Info";
    case "2":
      return "CON Product Information:\n1. Product Pricing\n2. Product Features\n3. Product Availability";
    case "3":
      return "CON Report a Problem:\n1. Service Outage\n2. Billing Issue\n3. Product Defect";
    case "4":
      return "END Thank you for contacting us. An agent will call you back shortly.";
    default:
      return "END Invalid option selected. Please try again.";
  }
}

// Level Two Menu Processing
function processLevelTwo(mainOption, subOption) {
  if (mainOption === "1") { // Account Issues
    switch (subOption) {
      case "1":
        return "CON Please confirm you want to reset your password:\n1. Yes\n2. No";
      case "2":
        return "CON Please confirm you want to activate your account:\n1. Yes\n2. No";
      case "3":
        return "CON Please select info to update:\n1. Phone\n2. Email\n3. Address";
      default:
        return "END Invalid option selected. Please try again.";
    }
  } else if (mainOption === "2") { // Product Information
    switch (subOption) {
      case "1":
        return "END Our product pricing information has been sent to you via SMS.";
      case "2":
        return "END Product features information has been sent to you via SMS.";
      case "3":
        return "END Product availability information has been sent to you via SMS.";
      default:
        return "END Invalid option selected. Please try again.";
    }
  } else if (mainOption === "3") { // Report a Problem
    switch (subOption) {
      case "1":
        return "CON Please provide more details about the service outage:";
      case "2":
        return "CON Please provide your account number for billing issue:";
      case "3":
        return "CON Please provide the product name with defect:";
      default:
        return "END Invalid option selected. Please try again.";
    }
  }
  
  return "END Invalid option selected. Please try again.";
}

// Level Three Menu Processing
function processLevelThree(mainOption, subOption, detail) {
  if (mainOption === "1") { // Account Issues
    if (subOption === "1" || subOption === "2") {
      if (detail === "1") {
        return "END Your request has been submitted. You will receive a confirmation shortly.";
      } else {
        return "END Request cancelled. Thank you for using our service.";
      }
    } else if (subOption === "3") {
      return "END Your profile update request for option " + detail + " has been recorded. We will contact you shortly.";
    }
  } else if (mainOption === "3") { // Report a Problem
    return "END Thank you for your report. Reference number: " + Math.floor(100000 + Math.random() * 900000) + ". We will look into this issue.";
  }
  
  return "END Thank you for using our service. We will contact you shortly.";
}

// USSD Simulator UI
app.get('/ussd-test', (req, res) => {
  res.sendFile(__dirname + '/public/ussd-test.html');
});

// Simulate USSD request
app.post('/ussd-simulate', (req, res) => {
  const {
    sessionId,
    serviceCode,
    phoneNumber,
    text
  } = req.body;
  
  // Make internal request to USSD endpoint
  const ussdReq = {
    body: {
      sessionId: sessionId || 'SIM_' + Date.now(),
      serviceCode: serviceCode || '*384#',
      phoneNumber: phoneNumber || '+254700000000',
      text: text || ''
    }
  };
  
  const ussdRes = {
    set: () => {},
    send: (response) => {
      res.json({
        response,
        sessionId: ussdReq.body.sessionId,
        serviceCode: ussdReq.body.serviceCode,
        phoneNumber: ussdReq.body.phoneNumber,
        text: ussdReq.body.text
      });
    }
  };
  
  // Call the USSD handler directly
  app.handle(ussdReq, ussdRes, () => {});
});

// Serve static files
app.use(express.static('public'));

// Default route
app.get('/', (req, res) => {
  res.send('USSD Customer Service API - Running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
