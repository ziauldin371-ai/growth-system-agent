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

  const profiles = [
    { name: 'desktop', preset: 'desktop', flags: '--preset=desktop' },
    { name: 'mobile', preset: 'mobile', flags: '--form-factor=mobile --throttling-method=provided' },
  ];

  const results = {};

  for (const prof of profiles) {
    console.log(`\nRunning Lighthouse audit for ${prof.name} profile...`);
    const extraHeaders = JSON.stringify({ Cookie: `growth_agent_session=${cookieValue}` });
    const outputPath = `docs/lighthouse-${prof.name}.json`;
    const cmd = `npx lighthouse http://127.0.0.1:3000/ --only-categories=accessibility,performance ${prof.flags} --output=json --output-path=${outputPath} --chrome-flags="--headless --no-sandbox" --extra-headers="${extraHeaders.replace(/"/g, '\\"')}"`;

    try {
      execSync(cmd, { stdio: 'inherit' });
      let reportFile = outputPath;
      if (!fs.existsSync(reportFile)) {
        if (fs.existsSync(`docs/lighthouse-${prof.name}`)) reportFile = `docs/lighthouse-${prof.name}`;
        else if (fs.existsSync(`docs/lighthouse-${prof.name}.report.json`)) reportFile = `docs/lighthouse-${prof.name}.report.json`;
      }
      const reportJson = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      const accScore = Math.round(reportJson.categories.accessibility.score * 100);
      const perfScore = Math.round(reportJson.categories.performance.score * 100);
      results[prof.name] = { accessibility: accScore, performance: perfScore };

      // Clean up raw JSON containing cookies to protect credentials
      try {
        if (fs.existsSync(reportFile)) fs.unlinkSync(reportFile);
      } catch {}
    } catch (e) {
      console.warn(`Lighthouse warning on ${prof.name}:`, e.message);
    }
  }

  // Also remove old lighthouse-home reports if they exist
  try {
    if (fs.existsSync('docs/lighthouse-home.report.json')) fs.unlinkSync('docs/lighthouse-home.report.json');
    if (fs.existsSync('docs/lighthouse-home.report.html')) fs.unlinkSync('docs/lighthouse-home.report.html');
  } catch {}

  console.log(`\n========================================`);
  console.log(`LIGHTHOUSE AUDIT SUMMARY (HOME SCREEN)`);
  console.log(`========================================`);
  for (const [prof, scores] of Object.entries(results)) {
    console.log(`${prof.toUpperCase()}:`);
    console.log(`  Accessibility: ${scores.accessibility}/100 (Threshold >= 90)`);
    console.log(`  Performance:   ${scores.performance}/100 (Threshold >= 85)`);
  }
  console.log(`========================================\n`);

  fs.writeFileSync(
    'docs/LIGHTHOUSE_SUMMARY.json',
    JSON.stringify(results, null, 2),
    'utf8'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
