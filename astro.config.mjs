import { defineConfig } from 'astro/config';

// `base` varies per customer: a bare github.io project page needs
// `/<repo-name>`, a custom domain (served from a `public/CNAME` file) needs
// `/`. The deploy workflow (.github/workflows/deploy.yml) computes this and
// passes it as PUBLIC_BASE_PATH rather than baking a value in here.
export default defineConfig({
  output: 'static',
  base: process.env.PUBLIC_BASE_PATH || '/',
});
