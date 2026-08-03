require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const predictionRoutes = require('./routes/prediction');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/predictor', predictionRoutes);

// Simple health check route
app.get('/', (req, res) => {
  res.json({ message: 'AMR-Insight gateway is running' });
});

// Final error-handling middleware — catches anything that reaches Express
// without having been handled by a route's own try/catch (e.g. a bug in
// middleware itself, or a synchronous throw before a route's try block).
// Every route already returns this same {success,data,error} envelope on
// failure; this just guarantees the same shape even when nothing upstream
// caught the error. Never leak the raw error/stack to the client — log the
// full detail server-side only.
app.use((err, req, res, next) => {
  console.error('Unhandled error reached global error handler:', err);
  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      field: null,
    },
  });
});

// unhandledRejection: a rejected Promise with no .catch anywhere. Node's
// own default here is just a warning (not a crash), but we log explicitly
// rather than relying on that default silently changing between Node
// versions. The process itself is still in a known-good state after this,
// so there's no reason to exit.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// uncaughtException: per Node's own guidance, once this fires the process
// is in an undefined state — continuing to serve requests risks corrupted
// in-memory state or repeating whatever broke in a way that's worse than
// just stopping. So: log everything we can, then exit non-zero and let a
// process manager (pm2/systemd/Docker restart policy/etc.) bring up a fresh,
// known-good process. Swallowing this and staying alive is the wrong
// trade-off — a brief restart beats an indefinitely half-broken process.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception — exiting process:', err);
  process.exit(1);
});

// Connect to MongoDB, then start the server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Gateway server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });