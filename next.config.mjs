/** @type {import('next').NextConfig} */
const nextConfig = {
  // Incluye la carpeta de temas en el despliegue de Vercel.
  outputFileTracingIncludes: {
    "/api/generate": ["./temas/**/*"],
    "/api/topics": ["./temas/**/*"],
  },
};

export default nextConfig;
