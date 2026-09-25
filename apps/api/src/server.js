const app = require('./app');
const { env } = require('./config/env');

const PORT = env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 PlanBot AI API Server running on port ${PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server gracefully.');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Shutting down.');
  server.close(() => {
    process.exit(0);
  });
});

// Protect process from crashing on async stream parsing errors from 3rd-party SDKs
process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Handled Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Handled Uncaught Exception:', err?.message || err);
});

