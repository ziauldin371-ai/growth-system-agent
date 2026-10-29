import { describe, it, expect } from 'vitest';
import { isPrivateOrReservedIp } from '../ssrf-guard';

describe('SSRF Guard - isPrivateOrReservedIp', () => {
  it('blocks loopback IPv4 addresses (127.0.0.0/8)', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('127.0.0.254')).toBe(true);
    expect(isPrivateOrReservedIp('127.10.20.30')).toBe(true);
  });

  it('blocks cloud metadata endpoint 169.254.169.254 and link-local', () => {
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true);
  });

  it('blocks RFC 1918 private IPv4 networks', () => {
    // 10.0.0.0/8
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('10.254.254.254')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
    // Note: 172.32.0.1 is public
    expect(isPrivateOrReservedIp('172.32.0.1')).toBe(false);

    // 192.168.0.0/16
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.254.254')).toBe(true);
  });

  it('blocks 0.0.0.0/8 and broadcast/reserved ranges', () => {
    expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);
    expect(isPrivateOrReservedIp('224.0.0.1')).toBe(true); // Multicast
    expect(isPrivateOrReservedIp('240.0.0.1')).toBe(true); // Reserved
  });

  it('blocks IPv6 loopback, link-local, and unique local addresses', () => {
    expect(isPrivateOrReservedIp('::1')).toBe(true);
    expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
    expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
    expect(isPrivateOrReservedIp('fd00::1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:169.254.169.254')).toBe(true);
  });

  it('allows legitimate public IP addresses', () => {
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false); // Google DNS
    expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false); // Cloudflare DNS
    expect(isPrivateOrReservedIp('93.184.216.34')).toBe(false); // example.com
    expect(isPrivateOrReservedIp('142.250.190.46')).toBe(false); // Google
  });
});
