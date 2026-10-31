const { spawn, execSync } = require('child_process');
const crypto = require('crypto');

const dynamicCronSecret = crypto.randomBytes(24).toString('hex');
const dynamicUnsubscribeSecret = crypto.randomBytes(24).toString('hex');

function generateUnsubscribeToken(email, expiresInDays = 90) {
  const secret = process.env.UNSUBSCRIBE_SECRET || dynamicUnsubscribeSecret;
  
  const payload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
}

async function runAudit() {
  const port = 3005;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Starting real Next.js production server on port ${port}...`);

  const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      CRON_SECRET: dynamicCronSecret,
      UNSUBSCRIBE_SECRET: dynamicUnsubscribeSecret,
    },
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => console.log(`[Next.js stdout]: ${d.toString().trim()}`));
  server.stderr.on('data', (d) => console.error(`[Next.js stderr]: ${d.toString().trim()}`));

  // Wait for server to become ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      execSync(`curl.exe -s -o NUL ${baseUrl}/login`);
      ready = true;
      console.log(`Real Next.js production server is READY on ${baseUrl}!\n`);
      break;
    } catch {
      process.stdout.write('.');
    }
  }

  if (!ready) {
    console.error('Server failed to start in time.');
    server.kill();
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('STEP 6 EVIDENCE AUDIT: REAL SERVER CURL VERIFICATION');
  console.log('='.repeat(80));

  const runCurl = (description, cmd) => {
    console.log(`\n>>> [TEST]: ${description}`);
    console.log(`$ ${cmd}`);
    try {
      const output = execSync(cmd, { encoding: 'utf8' });
      console.log(output.trim());
      return output;
    } catch (e) {
      console.log(e.stdout || e.message);
      return e.stdout;
    }
  };

  // 1. Private Routes - Unauthenticated (Expect 401)
  const privateRoutes = [
    '/api/leads',
    '/api/businesses',
    '/api/outreach',
    '/api/jobs',
    '/api/analytics',
    '/api/discovery/feed',
  ];

  for (const route of privateRoutes) {
    runCurl(
      `Private route ${route} without auth cookie returns HTTP 401`,
      `curl.exe -i -s ${baseUrl}${route}`
    );
  }

  // 2. Cron scheduled-run route: requires secret
  runCurl(
    'Cron route without secret returns HTTP 401 Unauthorized',
    `curl.exe -i -s ${baseUrl}/api/cron/scheduled-run`
  );

  runCurl(
    'Cron route with wrong secret header returns HTTP 401 Unauthorized',
    `curl.exe -i -s -H "Authorization: Bearer wrong_invalid_secret" ${baseUrl}/api/cron/scheduled-run`
  );

  runCurl(
    'Cron route with valid CRON_SECRET header succeeds (HTTP 200)',
    `curl.exe -i -s -H "Authorization: Bearer ${dynamicCronSecret}" ${baseUrl}/api/cron/scheduled-run`
  );

  // 3. Unsubscribe route: Publicly works via signed token
  const validSignedToken = generateUnsubscribeToken('client.optout@acmefirm.com');
  runCurl(
    'Unsubscribe route works publicly with valid HMAC-signed token (HTTP 200 JSON)',
    `curl.exe -i -s -H "Accept: application/json" "${baseUrl}/api/compliance/unsubscribe?token=${validSignedToken}"`
  );

  runCurl(
    'Unsubscribe route rejects tampered/forged token (HTTP 400 Bad Request)',
    `curl.exe -i -s -H "Accept: application/json" "${baseUrl}/api/compliance/unsubscribe?token=${validSignedToken}tampered"`
  );

  console.log('\n' + '='.repeat(80));
  console.log('AUDIT COMPLETE. Shutting down test server...');
  server.kill();
  process.exit(0);
}

runAudit();

