#!/usr/bin/env node

/**
 * CodePrep Health Check Diagnostic Probe
 * Usage: node scripts/test-health.js [url]
 */

const http = require('http');

const targetUrl = process.argv[2] || 'http://localhost:5000/health';

console.log('Probing CodePrep instance health at:', targetUrl);

http.get(targetUrl, (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const data = JSON.parse(rawData);
      console.log('\n--- System Health Report ---');
      console.log('Overall Status:', data.overallStatus?.toUpperCase());
      console.log('Uptime:', data.uptimeSeconds + 's');
      console.log('RAM Used:', data.memory?.usedRssMb + ' MB');
      console.log('\nComponents:');
      console.log('  Database (SQLite):', data.components?.database?.status, '-', data.components?.database?.message);
      console.log('  AI Provider:', data.components?.aiProvider?.status, '-', data.components?.aiProvider?.message);
      console.log('  Docker Sandbox:', data.components?.dockerSandbox?.status, '-', data.components?.dockerSandbox?.message);
      console.log('  File Storage:', data.components?.fileStorage?.status, '-', data.components?.fileStorage?.message);
      console.log('----------------------------\n');
      process.exit(data.overallStatus === 'down' ? 1 : 0);
    } catch (e) {
      console.error('Failed to parse health response:', e.message);
      console.log('Raw output:', rawData);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('Could not connect to backend server:', e.message);
  console.log('Ensure backend is running on port 5000 (npm run dev or docker compose up).');
  process.exit(1);
});

