# Web Cloudflare Worker

Cloudflare worker used for:

- Serving public website from R2 storage and Cloudflare cache
- Creating / listing / deleting files in R2 storage
- Transforming images on the fly that are served to the user

Publishing via the Wrangler CLI:

```
wrangler deploy
wrangler deploy -e staging
```
