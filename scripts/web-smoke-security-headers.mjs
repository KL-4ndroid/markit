export const EXPECTED_WEB_SECURITY_HEADERS = Object.freeze({
  'content-security-policy': "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  'permissions-policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '0',
});

export function assertWebSecurityHeaders(headers) {
  for (const [name, expected] of Object.entries(EXPECTED_WEB_SECURITY_HEADERS)) {
    const actual = headers.get(name);
    if (actual !== expected) {
      throw new Error(`security header ${name} is missing or invalid`);
    }
  }
}
