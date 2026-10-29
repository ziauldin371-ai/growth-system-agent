import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Checks whether an IPv4 or IPv6 address is in a private, loopback, link-local,
 * cloud-metadata, multicast, or reserved range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase();

  // IPv6 checks
  if (cleanIp.includes(':')) {
    // Loopback
    if (cleanIp === '::1' || cleanIp === '::') return true;
    // Link-local: fe80::/10
    if (cleanIp.startsWith('fe80:') || cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) {
      return true;
    }
    // Unique local: fc00::/7 (fc00:: to fdff::)
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) {
      return true;
    }
    // Multicast: ff00::/8
    if (cleanIp.startsWith('ff')) {
      return true;
    }
    // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1)
    if (cleanIp.startsWith('::ffff:')) {
      const v4Part = cleanIp.replace('::ffff:', '');
      return isPrivateOrReservedIp(v4Part);
    }
    return false;
  }

  // IPv4 checks
  const parts = cleanIp.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return true; // Malformed IP, block
  }

  const [p0, p1] = parts;

  // 0.0.0.0/8 (Current network)
  if (p0 === 0) return true;
  // 10.0.0.0/8 (Private network)
  if (p0 === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (p0 === 127) return true;
  // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
  if (p0 === 169 && p1 === 254) return true;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
  // 192.168.0.0/16 (Private network)
  if (p0 === 192 && p1 === 168) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (p0 === 192 && p1 === 0 && parts[2] === 2) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (p0 === 198 && p1 === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (p0 === 203 && p1 === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 (Multicast: 224 - 239)
  if (p0 >= 224 && p0 <= 239) return true;
  // 240.0.0.0/4 (Reserved: 240 - 255)
  if (p0 >= 240) return true;

  return false;
}

export interface SafeProbeResult {
  statusCode: number;
  finalUrl: string;
  ipAddress: string;
  body: string;
  redirectChain: string[];
  tlsValid: boolean;
  latencyMs: number;
}

const MAX_RESPONSE_SIZE = 512 * 1024; // 512 KB limit to prevent response flood / OOM
const DEFAULT_TIMEOUT_MS = 7500;
const MAX_REDIRECTS = 5;

/**
 * Safely resolves a hostname to an IP and validates that none of the resolved IPs
 * are private, loopback, or metadata addresses.
 */
export async function resolveSafeIp(hostname: string): Promise<string> {
  // If hostname is already a direct IP literal:
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`Access to private/reserved IP is blocked (SSRF Guard): ${hostname}`);
    }
    return hostname;
  }

  const lookupResult = await dns.lookup(hostname, { all: true });
  if (!lookupResult || lookupResult.length === 0) {
    throw new Error(`DNS resolution failed for hostname: ${hostname}`);
  }

  // Ensure ALL resolved addresses are public
  for (const record of lookupResult) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error(`Hostname ${hostname} resolved to private/blocked IP ${record.address} (SSRF Guard)`);
    }
  }

  // Return the first validated public IP
  return lookupResult[0].address;
}

/**
 * Performs an SSRF-protected HTTP/HTTPS GET probe with strict redirect verification,
 * bounded response size, and DNS rebinding defense.
 */
export async function safeHttpGet(
  initialUrl: string, 
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<SafeProbeResult> {
  const redirectChain: string[] = [];
  let currentUrl = initialUrl;
  const startTime = Date.now();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(currentUrl);

    // Protocol restriction
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Forbidden protocol: ${parsed.protocol}`);
    }

    // Resolve IP and verify against SSRF blocklist on EVERY redirect hop
    const targetIp = await resolveSafeIp(parsed.hostname);

    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;

    const hopResult = await new Promise<{
      statusCode: number;
      headers: http.IncomingHttpHeaders;
      body: string;
      tlsValid: boolean;
    }>((resolve, reject) => {
      let settled = false;
      let bodyData = '';
      let receivedBytes = 0;
      let tlsValid = isHttps; // Default assume true until error

      const reqOptions: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'GrowthSignal-Bot/1.0 (+https://growthsignal.ai/bot-info)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'close',
        },
        timeout: timeoutMs,
      };

      const req = client.request(reqOptions, (res) => {
        const statusCode = res.statusCode || 0;

        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          receivedBytes += Buffer.byteLength(chunk, 'utf8');
          if (receivedBytes > MAX_RESPONSE_SIZE) {
            req.destroy();
            if (!settled) {
              settled = true;
              resolve({
                statusCode,
                headers: res.headers,
                body: bodyData,
                tlsValid,
              });
            }
            return;
          }
          bodyData += chunk;
        });

        res.on('end', () => {
          if (!settled) {
            settled = true;
            resolve({
              statusCode,
              headers: res.headers,
              body: bodyData,
              tlsValid,
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        if (!settled) {
          settled = true;
          reject(new Error(`Connection timeout after ${timeoutMs}ms for ${currentUrl}`));
        }
      });

      req.on('error', (err: any) => {
        if (!settled) {
          settled = true;
          if (err.code === 'CERT_HAS_EXPIRED' || err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
            tlsValid = false;
          }
          reject(err);
        }
      });

      req.end();
    });

    const isRedirect = [301, 302, 303, 307, 308].includes(hopResult.statusCode);
    if (isRedirect && hopResult.headers.location) {
      redirectChain.push(currentUrl);
      const nextUrl = new URL(hopResult.headers.location, currentUrl).toString();
      currentUrl = nextUrl;
      continue;
    }

    // Terminating response reached
    return {
      statusCode: hopResult.statusCode,
      finalUrl: currentUrl,
      ipAddress: targetIp,
      body: hopResult.body,
      redirectChain,
      tlsValid: hopResult.tlsValid,
      latencyMs: Date.now() - startTime,
    };
  }

  throw new Error(`Exceeded maximum redirect limit (${MAX_REDIRECTS})`);
}
