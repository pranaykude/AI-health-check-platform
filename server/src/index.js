require('dotenv').config();
console.log("[SAFE MODE] No DB mutation mode enabled");
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const clientRoutes = require('./routes/clientRoutes');
const callRoutes = require('./routes/callRoutes');
const jobRoutes = require('./routes/jobRoutes');
const testAIRoute = require('./routes/testAI');
const errorHandler = require('./middleware/errorHandler');
const apiLimiter = require('./middleware/rateLimiter');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const logger = require('./utils/logger');
const { sendSuccess, sendError } = require('./utils/response');

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
app.use(morgan('dev'));

// Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());

// Data Sanitization against XSS
app.use(xss());

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check route
app.get('/api/v1/health', (req, res) => {
  sendSuccess(res, { timestamp: new Date().toISOString() }, 'Health Check API is running (v1)');
});


// API Routes
const jobController = require('./controllers/jobController');

app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/calls', callRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/test-ai', testAIRoute);
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
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`API Docs: http://localhost:${PORT}/api/v1/health`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});