import { SignJWT } from 'jose';
import fs from 'fs';
import { execSync } from 'child_process';

function getSessionSecret() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/^SESSION_SECRET=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return 'local_dev_session_secret_key_minimum_32_bytes_long_2026!';
}

async function main() {
  const realSecretStr = getSessionSecret();
  const realKey = new TextEncoder().encode(realSecretStr.padEnd(32, '_'));
  const wrongKey = new TextEncoder().encode('attacker_forged_secret_key_32_bytes!');

  console.log('Generating forgery test tokens...');

  // 1. Well-formed token signed with WRONG secret
  const wrongSecretToken = await new SignJWT({
    email: 'ziauldin371@gmail.com',
    name: 'Zia Ul Din',
    role: 'owner',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(wrongKey);

  // 2. Expired token signed with REAL secret
  const expiredToken = await new SignJWT({
    email: 'ziauldin371@gmail.com',
    name: 'Zia Ul Din',
    role: 'owner',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // expired 1 hr ago
    .sign(realKey);

  // 3. Tampered payload token
  const validToken = await new SignJWT({
    email: 'ziauldin371@gmail.com',
    name: 'Zia Ul Din',
    role: 'owner',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(realKey);

  const parts = validToken.split('.');
  // Modify one character in payload
  const tamperedPayload = parts[1].slice(0, -3) + (parts[1].endsWith('A') ? 'B' : 'A') + parts[1].slice(-2);
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

  const tests = [
    { name: '1. Well-formed token signed with WRONG secret', token: wrongSecretToken },
    { name: '2. Expired token signed with real secret', token: expiredToken },
    { name: '3. Tampered payload token (signature mismatch)', token: tamperedToken },
  ];

  console.log('\n======================================================');
  console.log('DEEP SESSION FORGERY VERIFICATION AGAINST RUNNING SERVER');
  console.log('======================================================\n');

  for (const t of tests) {
    console.log(`>>> Testing: ${t.name}`);

    // Test API route (Expects 401)
    const apiCmd = `curl.exe -i -s -H "Cookie: growth_agent_session=${t.token}" http://127.0.0.1:3000/api/leads`;
    const apiOut = execSync(apiCmd, { encoding: 'utf8' });
    const apiStatus = apiOut.split('\n')[0].trim();
    const isApi401 = apiStatus.includes('401');
    console.log(`   API /api/leads: ${apiStatus} -> ${isApi401 ? 'PASS (401 Unauthorized)' : 'FAIL'}`);

    // Test Page route (Expects 307 Redirect)
    const pageCmd = `curl.exe -i -s -H "Cookie: growth_agent_session=${t.token}" http://127.0.0.1:3000/businesses`;
    const pageOut = execSync(pageCmd, { encoding: 'utf8' });
    const pageStatus = pageOut.split('\n')[0].trim();
    const isPage307 = pageStatus.includes('307');
    console.log(`   Page /businesses: ${pageStatus} -> ${isPage307 ? 'PASS (307 Redirect to /login)' : 'FAIL'}\n`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
