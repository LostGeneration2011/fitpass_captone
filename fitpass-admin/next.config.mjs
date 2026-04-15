/** @type {import('next').NextConfig} */


import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
