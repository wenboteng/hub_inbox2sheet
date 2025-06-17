/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add a rule to handle the problematic module
    config.module.rules.push({
      test: /node_modules\/undici/,
      use: {
        loader: 'ignore-loader'
      }
    });

    return config;
  },
  // Disable server components for the crawler
  experimental: {
    serverComponentsExternalPackages: ['cheerio', 'axios']
  }
};

module.exports = nextConfig; 