import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',use:{baseURL:process.env.NEXTAUTH_URL||'http://localhost:3000'},reporter:'list'});
