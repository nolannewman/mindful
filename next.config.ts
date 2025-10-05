// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://s.ytimg.com",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "img-src 'self' data: https://i.ytimg.com https://*.supabase.co",
              // Allow YouTube/Vimeo/Calendly iframes
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://calendly.com https://*.calendly.com",
              "media-src 'self' blob: data: https://*.supabase.co https://*.supabase.in",
            ].join('; ')
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
