/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['172.24.160.1'],
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;