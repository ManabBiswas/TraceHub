import express from 'express'
import cookieParser from 'cookie-parser';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import authRouter from './routes/auth.js';
import pendingRouter from './routes/pending.js';
import Resource from './models/Resource.js';

const app = express() 

// CORS configuration for production and development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",   // Vite dev server (primary)
  "http://localhost:3000",   // Alternative port
  "http://127.0.0.1:5173",   // IP-based dev server
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 hours
}))

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('TraceHub API running!');
});

// API Routes

// Authentication
app.use('/api/auth', authRouter);

// Resources (public read, authenticated write)
app.get('/api/resources', async (req, res) => {
  try {
    // Optionally filter by userId if provided
    const filter = req.query.userId ? { userId: req.query.userId } : {};
    const resources = await Resource.find(filter)
      .populate('userId', 'name email department')
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/resources/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('userId', 'name email department');
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload (protected - requires auth + PROFESSOR/HOD role)
app.use('/api/upload', uploadRouter);

// Pending resources (approval workflow - public read, passcode protected approve)
app.use('/api/pending', pendingRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;