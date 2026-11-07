import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:120000,workers:1,use:{baseURL:'http://localhost:4173/postgresql-lab/',headless:true,launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{}},webServer:{command:'node scripts/serve.mjs',port:4173,reuseExistingServer:!process.env.CI}});
