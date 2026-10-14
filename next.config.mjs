const nextConfig = {
  reactCompiler: true,
  // Fast: gzip responses, hide framework header, trim bundle via package imports.
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "@liveblocks/client", "@liveblocks/react"],
  },
  // Secure: baseline headers for all routes. Secrets stay server-only —
  // only NEXT_PUBLIC_* keys ever reach the browser.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
