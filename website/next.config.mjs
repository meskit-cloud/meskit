/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/isa95',
        destination: '/isa-95',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
