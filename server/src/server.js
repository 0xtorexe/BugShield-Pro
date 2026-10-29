const http = require('http');
const app = require('./app');
const config = require('./config');
const { sequelize } = require('./models');
const { initSocket } = require('./realtime/socket');
const { startDeadlineCron } = require('./jobs/deadline.cron');

async function start() {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('✓ Database connection established');

    // Sync models (creates tables if missing). Use migrations for production.
    await sequelize.sync({ alter: config.env === 'development' });
    // eslint-disable-next-line no-console
    console.log('✓ Models synchronized');

    const server = http.createServer(app);
    initSocket(server);
    startDeadlineCron();

    server.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`✓ BugShield Pro API running at http://localhost:${config.port}`);
      // eslint-disable-next-line no-console
      console.log(`  Environment: ${config.env}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
