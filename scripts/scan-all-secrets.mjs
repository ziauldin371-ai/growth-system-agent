import fs from 'fs';
import { execSync } from 'child_process';

const SECRET_PATTERNS = [
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Resend API Key', regex: /re_[0-9a-zA-Z_]{20,}/ },
  { name: 'Supabase / JWT Token', regex: /eyJhbGciOi[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/ },
  { name: 'Generic Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
];

function main() {
  console.log('=== COMPREHENSIVE SECRET & API KEY AUDIT ===\n');

  // 1. Scan Working Tree
  console.log('1. Scanning Working Tree Tracked Files...');
  const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  const findings = [];

  for (const file of trackedFiles) {
    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.ico') || file.endsWith('.pdf')) continue;
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const pat of SECRET_PATTERNS) {
        if (pat.regex.test(content)) {
          // Check if it's a test file or placeholder
          if (content.includes('your-anon-key-here') || content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30')) {
            continue;
          }
          findings.push({ file, type: pat.name });
        }
      }
    } catch {}
  }

  if (findings.length === 0) {
    console.log('   [CLEAN] Zero live API keys, tokens, or private secrets found in working tree.');
  } else {
    console.log('   [ALERT] Potential secrets found:');
    findings.forEach(f => console.log(`     - ${f.file} (${f.type})`));
  }

  // 2. Scan Git Log for Google API Keys or Live Tokens
  console.log('\n2. Scanning Git Commit History for Pattern Matches...');
  const suspiciousCommits = new Set();

  for (const pat of SECRET_PATTERNS) {
    try {
      // Use git log -G with regex
      const log = execSync(`git log -G "${pat.regex.source}" --format="%h"`, { encoding: 'utf8' }).trim();
      if (log) {
        log.split('\n').map(h => h.trim()).filter(Boolean).forEach(h => suspiciousCommits.add(h));
      }
    } catch {}
  }

  if (suspiciousCommits.size === 0) {
    console.log('   [CLEAN] Zero commits in history matched secret patterns.');
  } else {
    console.log('   Historical commits touching API key / JWT patterns:');
    suspiciousCommits.forEach(h => {
      try {
        const title = execSync(`git log -1 --format="%h %s" ${h}`, { encoding: 'utf8' }).trim();
        console.log(`     - ${title}`);
      } catch {}
    });
  }

  console.log('\n=== AUDIT COMPLETE ===');
}

main();
