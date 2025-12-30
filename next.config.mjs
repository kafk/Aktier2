/** @type {import('next').NextConfig} */

// Generate build ID at build time
const buildDate = new Date().toISOString().slice(2, 10).replace(/-/g, "");

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
};

export default nextConfig;
