/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",        // static export for Firebase Hosting
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

module.exports = nextConfig;
