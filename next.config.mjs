const isStaticExport = process.env.STUDYLOOP_STATIC_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.STUDYLOOP_NEXT_DIST_DIR ?? ".next",
  ...(isStaticExport ? { output: "export" } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100,
  },
  images: isStaticExport
    ? { unoptimized: true }
    : {
        remotePatterns: [
          {
            protocol: "https",
            hostname: "*.supabase.co",
          },
        ],
      },
};

export default nextConfig;

if (
  process.env.NODE_ENV === "development" &&
  process.env.STUDYLOOP_CLOUDFLARE_DEV === "1"
) {
  import("@opennextjs/cloudflare").then((module) =>
    module.initOpenNextCloudflareForDev(),
  );
}
