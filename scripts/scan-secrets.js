const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.data',
  'coverage',
  'test-results',
  'playwright-report',
  'dist',
  'build',
  '.temp',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'growth-system-agent-review.zip',
]);

const SUSPICIOUS_PATTERNS = [
  { name: 'Google API Key', regex: /AIzaSy[A-Za-z0-9_-]{33}/ },
  { name: 'OpenAI Secret Key', regex: /sk-[A-Za-z0-9_-]{32,}/ },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Hardcoded Operator Password', regex: /ADMIN_PASSWORD\s*[:=]\s*['"](?!your_secure_password_here|placeholder|<)[^'"]+['"]/i },
];

let findings = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scanDir(path.join(dir, entry.name));
      }
    } else if (entry.isFile()) {
      if (IGNORED_FILES.has(entry.name)) continue;
      if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.mp4') || entry.name.endsWith('.pdf')) continue;

      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(projectRoot, fullPath);

      // Skip test mocks and review documentation
      if (relPath.includes('__tests__') || relPath === 'docs/REVIEW_NOTES.md') continue;

      const content = fs.readFileSync(fullPath, 'utf8');

      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.regex.test(content)) {
          findings.push({
            file: relPath,
            rule: pattern.name,
          });
        }
      }
    }
  }
}

scanDir(projectRoot);

if (findings.length > 0) {
  console.error('[SECRET SCANNER] Potential secrets detected:');
  findings.forEach((f) => console.error(`  - ${f.file}: ${f.rule}`));
  process.exit(1);
} else {
  console.log('[SECRET SCANNER] OK: Clean. No hardcoded credentials detected.');
  process.exit(0);
}

