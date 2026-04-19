const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Load env files the same way webpack does (.env first, .env.local overrides)
function loadEnv() {
  const envVars = {};
  const envFiles = ['.env', '.env.local'];
  for (const file of envFiles) {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`📄 Reading ${file}...`);
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.replace(/\r/g, '');
        const match = trimmed.match(/^(EXPO_PUBLIC_[^=]+)=(.*)$/);
        if (match) {
          envVars[match[1]] = match[2].trim();
          console.log(`   ${match[1]} = ${match[2].trim()}`);
        }
      }
    } else {
      console.log(`⚠️  ${file} not found`);
    }
  }
  return envVars;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Request timed out after 8s')); });
  });
}

async function run() {
  console.log('\n========================================');
  console.log('  FRONTEND → BACKEND CONNECTION TEST');
  console.log('========================================\n');

  const env = loadEnv();
  const baseUrl = env['EXPO_PUBLIC_API_URL'];

  if (!baseUrl) {
    console.error('\n❌ EXPO_PUBLIC_API_URL is not defined in any .env file!');
    process.exit(1);
  }

  const API_BASE = baseUrl + '/api';
  console.log(`\n✅ Resolved API_BASE = "${API_BASE}"\n`);

  const endpoints = [
    { name: 'Health Check',  url: `${API_BASE}/health` },
    { name: 'Products',      url: `${API_BASE}/products` },
    { name: 'Categories',    url: `${API_BASE}/categories` },
  ];

  for (const ep of endpoints) {
    process.stdout.write(`🔍 Testing ${ep.name} (${ep.url}) ... `);
    try {
      const result = await fetchUrl(ep.url);
      if (result.status === 200) {
        const extra = ep.name === 'Products'
          ? ` — ${result.body.count ?? '?'} products found`
          : '';
        console.log(`✅ OK (${result.status})${extra}`);
      } else {
        console.log(`⚠️  Status ${result.status}`);
        console.log('   Response:', JSON.stringify(result.body).slice(0, 200));
      }
    } catch (err) {
      console.log(`❌ FAILED — ${err.message}`);
    }
  }

  console.log('\n========================================\n');
}

run();
