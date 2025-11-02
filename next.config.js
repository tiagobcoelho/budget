/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['postgres'],
  images: {
    domains: ['images.clerk.dev'],
  },
}

module.exports = nextConfig
