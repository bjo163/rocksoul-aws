# Web Deployment

## Production target

The public Web application is deployed to **Vercel only**.

Production deployment is gated by the certified release path:

`feature/*` → `dev` → `main` → Vercel production

`main` remains the only production deployment source.

## CI requirements

The Vercel production workflow requires the repository secret:

- `VERCEL_TOKEN`

The Vercel project/environment must be connected through the Vercel CLI project configuration or the Vercel Git integration before production deployment is enabled.

## Branch policy

- `feature/*`: implementation and focused validation.
- `dev`: integration/staging work; no direct production deployment.
- `main`: certified release and production deployment.

Cloudflare Pages is no longer a supported production target for `apps/web`.
