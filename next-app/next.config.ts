import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    experimental: {
        // Keeps warnings away if you don't have custom configs
    },
    devIndicators: false,
    typescript: {
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        ignoreBuildErrors: true,
    },
};
export default nextConfig;
