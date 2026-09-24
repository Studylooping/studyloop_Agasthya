import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";

const isStaticExport = process.env.STUDYLOOP_STATIC_EXPORT === "1";
const disableWebpackBuildWorker =
  process.env.STUDYLOOP_DISABLE_WEBPACK_BUILD_WORKER !== "0";
const distDir = process.env.STUDYLOOP_NEXT_DIST_DIR ?? ".next";

class EnsurePagesManifestPlugin {
  constructor(distDirPath) {
    this.distDirPath = distDirPath;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap("EnsurePagesManifestPlugin", () => {
      const serverDir = join(this.distDirPath, "server");
      const serverPagesDir = join(serverDir, "pages");
      const manifestPath = join(serverDir, "pages-manifest.json");
      const manifest = existsSync(serverPagesDir)
        ? Object.fromEntries(
            readdirSync(serverPagesDir)
              .filter((fileName) => fileName.endsWith(".js"))
              .sort()
              .map((fileName) => {
                const route = `/${basename(fileName, ".js")}`;
                return [route, `pages/${fileName}`];
              }),
          )
        : {};
      mkdirSync(serverDir, { recursive: true });
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    });
  }
}

class EnsureRoutesManifestPlugin {
  constructor(distDirPath) {
    this.distDirPath = distDirPath;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap("EnsureRoutesManifestPlugin", () => {
      const manifestPath = join(this.distDirPath, "routes-manifest.json");
      if (existsSync(manifestPath)) return;

      const manifest = {
        version: 3,
        pages404: true,
        caseSensitive: false,
        basePath: "",
        redirects: [],
        headers: [],
        rewrites: {
          beforeFiles: [],
          afterFiles: [],
          fallback: [],
        },
        dynamicRoutes: [],
        staticRoutes: [],
        dataRoutes: [],
        rsc: {
          header: "RSC",
          contentTypeHeader: "text/x-component",
          varyHeader: "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding",
          prefetchHeader: "Next-Router-Prefetch",
          didPostponeHeader: "x-nextjs-postponed",
        },
      };

      mkdirSync(this.distDirPath, { recursive: true });
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    });
  }
}

class EnsureAppPathsManifestPlugin {
  constructor(distDirPath) {
    this.distDirPath = distDirPath;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap("EnsureAppPathsManifestPlugin", () => {
      const serverDir = join(this.distDirPath, "server");
      const appDir = join(serverDir, "app");
      const manifestPath = join(serverDir, "app-paths-manifest.json");
      if (existsSync(manifestPath) || !existsSync(appDir)) return;

      const manifest = {};
      const visit = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const entryPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            visit(entryPath);
            continue;
          }
          if (entry.name !== "page.js" && entry.name !== "route.js") continue;

          const relativeToApp = relative(appDir, entryPath)
            .split(sep)
            .join("/");
          const relativeToServer = relative(serverDir, entryPath)
            .split(sep)
            .join("/");
          manifest[`/${relativeToApp.replace(/\.js$/, "")}`] =
            relativeToServer;
        }
      };

      visit(appDir);
      mkdirSync(serverDir, { recursive: true });
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    });
  }
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const staticGenerationMaxConcurrency = readPositiveInt(
  process.env.STUDYLOOP_STATIC_GENERATION_MAX_CONCURRENCY,
  1,
);
const staticGenerationMinPagesPerWorker = readPositiveInt(
  process.env.STUDYLOOP_STATIC_GENERATION_MIN_PAGES_PER_WORKER,
  25,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  ...(isStaticExport ? { output: "export" } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    ...(disableWebpackBuildWorker ? { webpackBuildWorker: false } : {}),
    cpus: 1,
    staticGenerationMaxConcurrency,
    staticGenerationMinPagesPerWorker,
    workerThreads: false,
  },
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
  webpack(config, { dev }) {
    const distDirPath = resolve(process.cwd(), distDir);
    config.plugins.push(new EnsureRoutesManifestPlugin(distDirPath));
    config.plugins.push(new EnsureAppPathsManifestPlugin(distDirPath));
    if (!dev) {
      config.plugins.push(new EnsurePagesManifestPlugin(distDirPath));
    }
    return config;
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
