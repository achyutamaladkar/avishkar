import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const certPath = path.resolve(process.cwd(), '.certs/cert.pem');
const keyPath = path.resolve(process.cwd(), '.certs/key.pem');
const hasLocalCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

const httpsConfig = hasLocalCert
  ? {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    ...(httpsConfig ? { https: httpsConfig } : {}),
  },
  preview: {
    host: true,
    ...(httpsConfig ? { https: httpsConfig } : {}),
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
