import type { NextConfig } from "next";

// CSP — locked down to the third parties Dottie actually uses:
//   * Stripe (Checkout + Billing portal + webhooks)
//   * Supabase (auth + DB + storage + realtime)
//   * Google Fonts (next/font)
//   * Google Analytics (gtag)
// Inline scripts are allowed because Next 16 emits inline JSON-LD and bootstrap.
// 'unsafe-eval' is added in development only (React's error overlay + HMR need it).
const isDev = process.env.NODE_ENV !== 'production'
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  'https://js.stripe.com',
  'https://*.googletagmanager.com',
].join(' ')

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src ${scriptSrc}`,
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // same-origin-allow-popups keeps Stripe Checkout/Billing popups working.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [{ source: '/sitemap.xml', destination: '/api/sitemap' }]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
