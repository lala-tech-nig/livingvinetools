/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://test.livingvinepropertiesinvestment.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
