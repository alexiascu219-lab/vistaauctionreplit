import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * Served at /missings on vistaauction.vercel.app, which is a separate Vercel
   * project running Vite. One project builds one framework, so this is a
   * multi-zone setup: this app owns /missings and the careers project rewrites
   * that prefix through to it. Keep in sync with BASE_PATH in src/lib/urls.ts.
   */
  basePath: '/missings',

  // The scanner needs getUserMedia, which browsers only grant on a secure
  // origin. Vercel is HTTPS, so this is really about keeping the headers honest
  // and denying everything we do not use.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            // camera is self, everything else off.
            value: 'camera=(self), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
