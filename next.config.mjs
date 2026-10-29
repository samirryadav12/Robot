/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // The homepage is the standalone RoboNest 3D page (public/robonest/index.html). It is served
  // as its own document so its global CSS and WebGL loops never touch the other DevDash pages.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/robonest/index.html" }],
    };
  },
};

export default nextConfig;
