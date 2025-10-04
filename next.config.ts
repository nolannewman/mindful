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
              "img-src 'self' data: https://i.ytimg.com",
              "connect-src 'self' https://*.supabase.co",
              // IMPORTANT: allow YouTube/Vimeo frames
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
              "media-src 'self' blob:",
            ].join('; ')
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;

