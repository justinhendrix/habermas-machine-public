/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow SQLite in serverless functions
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig
