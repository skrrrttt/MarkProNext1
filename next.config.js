/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable PWA features
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
      ],
    },
  ],
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bqgvlbutnrxovkdnjwna.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
