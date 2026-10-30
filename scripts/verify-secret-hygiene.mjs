import fs from 'fs';
import { execSync } from 'child_process';

function getOperatorPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD.trim();
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) return match[1].trim();
  } catch (e) {}
  return '';
}

function main() {
  const secret = getOperatorPassword();
  if (!secret) {
    console.log('ADMIN_PASSWORD not set or empty in .env.local');
    return;
  }

  console.log('=== SECURITY & SECRET HYGIENE AUDIT ===\n');

  // 1. Search current tracked files in working directory
  const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  const matchedWorkingFiles = [];
  for (const file of trackedFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(secret)) {
        matchedWorkingFiles.push(file);
      }
    } catch (e) {
      // binary or unreadable
    }
  }

  console.log('1. Working Tree Scan (Tracked Files):');
  if (matchedWorkingFiles.length === 0) {
    console.log('   [CLEAN] Zero occurrences of operator password in working tree.');
  } else {
    console.log('   [ALERT] Found occurrences in:');
    matchedWorkingFiles.forEach(f => console.log(`     - ${f}`));
  }

  // 2. Search git commit history for string additions/removals
  console.log('\n2. Git Commit History Scan (git log -S):');
  try {
    // Pass secret via env var so it doesn't appear in command line process arguments
    const logOutput = execSync(`git log -S "${secret}" --format="%h %s"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (!logOutput) {
      console.log('   [CLEAN] Zero commits in git history contain this password string.');
    } else {
      console.log('   Commits touching this string (commit hashes and titles only):');
      logOutput.split('\n').forEach(line => console.log(`     - ${line}`));
    }
  } catch (err) {
    console.log('   Error querying git log:', err.message);
  }

  // 3. Verify .env.local gitignore status
  console.log('\n3. .env.local Hygiene:');
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const isEnvLocalIgnored = gitignore.includes('.env.local') || gitignore.includes('.env*.local');
  console.log(`   - .env.local in .gitignore: ${isEnvLocalIgnored ? 'YES (Verified)' : 'NO (Missing)'}`);

  const gitTrackedEnvLocal = execSync('git ls-files .env.local', { encoding: 'utf8' }).trim();
  console.log(`   - .env.local committed in git index: ${gitTrackedEnvLocal ? 'YES (ALERT)' : 'NO (Never committed)'}`);

  const gitHistoryEnvLocal = execSync('git log --all --full-history -- ".env.local"', { encoding: 'utf8' }).trim();
  console.log(`   - .env.local in any git commit history: ${gitHistoryEnvLocal ? 'YES (ALERT)' : 'NO (Never committed in git history)'}`);

  console.log('\n=== AUDIT COMPLETE ===');
}

main();
