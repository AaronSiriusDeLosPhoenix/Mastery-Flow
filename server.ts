import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const isTsxRunning = process.execArgv.some((a) => a.includes('tsx')) || process.env._TSX_LOADED === 'true';

if (!isTsxRunning) {
  process.env._TSX_LOADED = 'true';
  const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
} else {
  runServer().catch((err) => {
    console.error('Fatal error starting MasteryFlow server:', err);
    process.exit(1);
  });
}

async function runServer() {
  const express = (await import('express')).default;
  const dotenv = (await import('dotenv')).default;
  const path = (await import('path')).default;
  const { apiRouter } = await import('./src/server/routes/api.js');

  dotenv.config();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'MasteryFlow', time: new Date().toISOString() });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MasteryFlow engine active on http://0.0.0.0:${PORT}`);
  });
}
