/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is fully client-side (all data in IndexedDB), so it exports to
  // static files — deployable to any host and installable as a PWA.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
