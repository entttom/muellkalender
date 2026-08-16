import dns from 'node:dns/promises';
import { isIP } from 'node:net';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(ip) {
  const n = ipv4ToInt(ip);
  const ranges = [
    [ipv4ToInt('0.0.0.0'), ipv4ToInt('0.255.255.255')],
    [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
    [ipv4ToInt('127.0.0.0'), ipv4ToInt('127.255.255.255')],
    [ipv4ToInt('169.254.0.0'), ipv4ToInt('169.254.255.255')],
    [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
    [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
  ];
  return ranges.some(([start, end]) => n >= start && n <= end);
}

function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80')
  );
}

export function isPrivateIp(ip) {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

/**
 * SSRF-Schutz für ICS-URL-Proxy: nur https, keine privaten Netze, Redirects revalidieren.
 */
export async function assertSafeHttpsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Ungültige URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Nur HTTPS-URLs sind erlaubt');
  }

  if (url.username || url.password) {
    throw new Error('URLs mit Zugangsdaten sind nicht erlaubt');
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local')) {
    throw new Error('Lokale Hostnamen sind nicht erlaubt');
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error('Private IP-Adressen sind nicht erlaubt');
    }
  } else {
    const records = await dns.lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        throw new Error('Hostname zeigt auf eine private IP-Adresse');
      }
    }
  }

  return url;
}

export async function fetchSafeHttpsText(rawUrl, { maxBytes = 1_000_000, timeoutMs = 10_000, maxRedirects = 3 } = {}) {
  let current = rawUrl;

  for (let i = 0; i <= maxRedirects; i += 1) {
    const safeUrl = await assertSafeHttpsUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(safeUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: 'text/calendar, text/plain, */*' },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error('Redirect ohne Location-Header');
        }
        current = new URL(location, safeUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`ICS-URL antwortete mit Status ${response.status}`);
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > maxBytes) {
        throw new Error('ICS-Datei ist zu groß');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxBytes) {
        throw new Error('ICS-Datei ist zu groß');
      }

      return buffer.toString('utf8');
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('Zu viele Redirects');
}
