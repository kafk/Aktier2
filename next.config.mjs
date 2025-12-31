/** @type {import('next').NextConfig} */

// Generate build ID at build time (includes date and time)
const now = new Date();
const buildDate = now.toISOString().slice(2, 10).replace(/-/g, "");
const buildTime = now.toISOString().slice(11, 16).replace(":", "");
const buildId = `${buildDate}-${buildTime}`;

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_DATE: buildId,
  },
};

export default nextConfig;
