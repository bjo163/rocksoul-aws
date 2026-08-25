/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.GITHUB_PAGES === 'true' ? '/cosmic' : '',
  assetPrefix: process.env.GITHUB_PAGES === 'true' ? '/cosmic/' : undefined,
};

export default nextConfig;
