import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApiMiddleware } from './server/api-router.mjs';
import { HostelDatabase } from './server/db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// 1. Mount Database, Auth & YouPI-PG V2 API Router
app.use(createApiMiddleware());

// 2. Serve public assets (/youpi.js, /icons/*)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// 3. Serve built production frontend (dist/)
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send(
      'PG Hostel Management System Backend is running. Run "npm run build" first for production static assets, or "npm run dev" for development.'
    );
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const info = HostelDatabase.getEngineInfo();
  console.log('==========================================================');
  console.log(`🚀 PG Hostel Management System + YouPI-PG V2 Live Server`);
  console.log(`🌐 URL:        http://0.0.0.0:${PORT}`);
  console.log(`🗄️  DB Engine:  ${info.engine} (${info.dbPath})`);
  console.log('==========================================================');
});
