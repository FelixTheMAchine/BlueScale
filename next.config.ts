import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "bcryptjs"],
  poweredByHeader: false,
};
export default nextConfig;
