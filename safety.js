// Host check and same-origin writes (family rule; reference: token-workbench-LAB server/src/safety.js). Pure functions.
//  - Host: loopback always (any port), plus the LAB_ALLOWED_HOSTS names (the lab-proxy's Host for this lab) on this
//    server's own port. Anything else is refused before routing (DNS rebinding).
//  - Writes (anything but GET/HEAD/OPTIONS): Sec-Fetch-Site cross-site is refused. An Origin, when present, must be a
//    loopback http origin identical to the Host, or, on an allowed lab-proxy Host only, exactly
//    `${X-Forwarded-Proto}://${X-Forwarded-Host}` (the proxy's browser origin). Forwarded headers are ignored on any other
//    Host, so a caller that did not come through the proxy cannot use them. A write with no Origin is not a browser
//    cross-site request and passes (as token-workbench).

const OCTET = '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)';
const LOOPBACK_V4 = new RegExp(`^127\\.${OCTET}\\.${OCTET}\\.${OCTET}$`);
// 0.0.0.0 counts too: the Docker form binds 0.0.0.0 and puts that literal in its OAuth redirect URI, and a literal IP
// cannot be DNS-rebound.
export function isLoopbackName(name) {
  const h = String(name).toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '::1' || h === '0.0.0.0' || LOOPBACK_V4.test(h);
}

export const labAllowedHosts = (raw) => new Set(String(raw ?? '').split(',').map((h) => h.trim().toLowerCase()).filter((h) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(h)));

// "name" or "name:port"; IPv6 only as [::1]. Anything else -> null.
const HOST_RE = /^(\[::1\]|[a-z0-9.-]+)(?::(\d{1,5}))?$/i;
export function parseHost(hostHeader) {
  const m = HOST_RE.exec(String(hostHeader ?? '').trim());
  if (!m) return null;
  const port = m[2] === undefined ? null : Number(m[2]);
  if (port !== null && (port < 1 || port > 65535)) return null;
  return { name: m[1].toLowerCase(), port, host: String(hostHeader).trim().toLowerCase() };
}

const isLabHost = (h, names, port) => h !== null && !isLoopbackName(h.name) && names.has(h.name) && h.port === Number(port);

export function hostAllowed(hostHeader, names, port) {
  const h = parseHost(hostHeader);
  return h !== null && (isLoopbackName(h.name) || isLabHost(h, names, port));
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export function writeAllowed(method, headers, names, port) {
  if (READ_METHODS.has(String(method).toUpperCase())) return true;
  if (String(headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return false;
  const origin = headers.origin;
  if (origin === undefined) return true;
  const h = parseHost(headers.host);
  if (h === null) return false;
  if (isLabHost(h, names, port)) {
    const xfh = String(headers['x-forwarded-host'] || '').trim().toLowerCase();
    const xfp = String(headers['x-forwarded-proto'] || '').trim().toLowerCase();
    return xfh !== '' && (xfp === 'https' || xfp === 'http') && origin === `${xfp}://${xfh}`;
  }
  if (!isLoopbackName(h.name)) return false;
  let u;
  try { u = new URL(origin); } catch { return false; }
  return u.protocol === 'http:' && isLoopbackName(u.hostname) && u.host.toLowerCase() === h.host && origin === u.origin;
}
