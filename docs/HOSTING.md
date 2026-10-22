# Cloudflare Pages

The static application can be published on the Cloudflare Pages Free plan. Build with Node.js >=18:

```sh
npm run build:hosted
```

Upload **only `dist/`**, or a ZIP containing its files, using Pages Direct Upload. The site entry point is `index.html` at the ZIP root. Never upload the repository root: it contains personal progress backups. The build output includes only the bundled app and Cloudflare response headers.

For Cloudflare Git integration, use production branch `main`, build command `npm run build:hosted`, and output directory `dist`. Connecting GitHub requires the account owner's authorization. Direct Upload projects must be recreated to switch to Git integration.

## Behavior on the hosted site

- All three years, grading, explanations, grouped questions, themes, retry buttons and playback settings work in the static bundle.
- Images and audio still load from their original remote URLs. The host does not contain copies of media files.
- Bulk audio downloading and disk caching currently require the local Node server. The hosted static site retains direct audio playback; it cannot call the local cache API.
- Study progress stays in localStorage for the hosted origin. Export progress for each year from localhost, then import those files on the hosted site. Changing hostname/browser/device does not automatically sync progress.
- No account, authentication data or personal progress backups are published with the static build. The hosted app itself is publicly accessible at its Pages URL.

After deployment, verify the HTTPS URL, all year selectors, playback and theme toggle. A running localhost server is not needed to use the hosted app.
