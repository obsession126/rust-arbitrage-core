/** @type {import('next').NextConfig} */
const nextConfig = {
  // Додаємо цей IP сюди обов'язково
  allowedDevOrigins: ['10.27.213.32', 'localhost:3000'],
  
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