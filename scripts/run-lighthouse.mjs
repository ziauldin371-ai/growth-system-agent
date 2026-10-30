import fs from 'fs';
import { execSync } from 'child_process';

function getOperatorPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) return match[1].trim();
  } catch (e) {}
  return '';
}

async function main() {
  const password = getOperatorPassword();
  
  // 1. Authenticate to get session cookie
  const res = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ziauldin371@gmail.com', password }),
  });

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Failed to obtain session cookie from login endpoint');
  }

  const cookieMatch = setCookie.match(/growth_agent_session=([^;]+)/);
  if (!cookieMatch) {
    throw new Error('growth_agent_session cookie not found in response');
  }

  const cookieValue = cookieMatch[1];
  console.log('Successfully acquired authenticated operator session cookie.');

  // 2. Run Lighthouse via npx
  const extraHeaders = JSON.stringify({ Cookie: `growth_agent_session=${cookieValue}` });
  const cmd = `npx lighthouse http://127.0.0.1:3000/ --only-categories=accessibility --output=json,html --output-path=docs/lighthouse-home --chrome-flags="--headless --no-sandbox" --extra-headers="${extraHeaders.replace(/"/g, '\\"')}"`;

  console.log('Running Lighthouse accessibility audit on Home (http://127.0.0.1:3000/)...');
  execSync(cmd, { stdio: 'inherit' });

  // 3. Read generated report
  const reportJson = JSON.parse(fs.readFileSync('docs/lighthouse-home.report.json', 'utf8'));
  const score = Math.round(reportJson.categories.accessibility.score * 100);
  console.log(`\n========================================`);
  console.log(`Lighthouse Accessibility Score: ${score}/100`);
  console.log(`Report saved to: docs/lighthouse-home.report.html`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
