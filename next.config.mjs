/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Library ini harus dijalankan langsung oleh Node, bukan di-bundle webpack
    serverComponentsExternalPackages: ['tesseract.js', 'pdf-parse'],
  },
};

export default nextConfig;
