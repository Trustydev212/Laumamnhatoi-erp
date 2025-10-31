// Script wrapper to start Next.js frontend
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3002';

// In monorepo, node_modules is at root level
const rootDir = path.resolve(__dirname, '..', '..');
const nextBinPath = path.join(rootDir, 'node_modules', '.bin', 'next');

// Use npx which will automatically find next in node_modules
const args = ['next', 'start', '-p', process.env.PORT];
console.log(`Starting Next.js frontend on port ${process.env.PORT}...`);

// Use npx with --yes flag to avoid prompts, and set cwd to frontend directory
const child = spawn('npx', ['--yes', ...args], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env,
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start frontend:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Frontend process exited with code ${code}`);
  }
  process.exit(code || 0);
});

