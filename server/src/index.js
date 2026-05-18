require('dotenv').config();
console.log("[SAFE MODE] No DB mutation mode enabled");
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const clientRoutes = require('./routes/clientRoutes');
const callRoutes = require('./routes/callRoutes');
const jobRoutes = require('./routes/jobRoutes');
const testAIRoute = require('./routes/testAI');
const errorHandler = require('./middleware/errorHandler');
const apiLimiter = require('./middleware/rateLimiter');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const { sendSuccess, sendError } = require('./utils/response');

const authRoutes = require('./routes/authRoutes');

const app = express();

// Trust proxy for rate limiting (behind ngrok/proxies)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', process.env.PUBLIC_URL],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());

// Data Sanitization against XSS
app.use(xss());

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Ngrok Warning Bypass Middleware & Infrastructure Headers
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Health check route
app.get('/api/v1/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    infrastructure: {
      public_url: process.env.PUBLIC_URL || 'not_set',
      node_env: process.env.NODE_ENV,
      port: PORT
    },
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      openai: !!process.env.OPENAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY
    }
  };
  
  sendSuccess(res, healthStatus, 'AI Voice Platform Health Status');
});


// API Routes
const jobController = require('./controllers/jobController');

const supportMemberRoutes = require('./routes/supportMemberRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/calls', callRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/test-ai', testAIRoute);
app.use('/api/auth', authRoutes);
app.use('/api/v1/support-members', supportMemberRoutes);
app.use('/api/v1/chat', chatRoutes);
app.get('/api/v1/metrics', jobController.getMetrics);

// Compatibility route for Frontend Dashboard health checks
app.get('/api/queue/health', jobController.getQueueStats);

// Legacy/Twilio Console Aliases
const callController = require('./controllers/callController');
app.get('/twilio/voice', callController.voiceResponse);
app.post('/twilio/voice', require('./controllers/voiceController').handleIncomingVoice);
app.post('/twilio/process-speech', require('./controllers/voiceController').processSpeech);
app.post('/twilio/webhook', callController.handleWebhook);
app.post('/twilio/recording', callController.handleRecording);

// 404 handler
app.use((req, res) => {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
});

// Global error handler
app.use(errorHandler);

// Start server
const http = require('http');
const socketService = require('./services/socketService');

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

// Initialize real-time Socket.IO coordination
socketService.init(server);

server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`API Docs: http://localhost:${PORT}/api/v1/health`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});