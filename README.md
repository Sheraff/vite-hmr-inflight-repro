# Vite: a request made during `hotUpdate` is cached with the old `?t=`

Reproduction for https://github.com/vitejs/vite/issues/24142.

After a file save, a transform request that starts while `hotUpdate` hooks run is cached after the update but built with the module's previous timestamp. The module served at `/a.js?t=<new>` then imports itself as `/a.js`, so it runs twice (`app/a.js` imports itself, as Fast Refresh modules do).

```sh
npm install
npm run repro     # BUG: a.js imports a different URL of itself
npm run control   # same steps without the request during the update: OK
```

`repro.mjs` loads `app/a.js`, saves it, and fetches it again the way the browser does. Two small plugins set up the timing:

- `slow-resolve`: resolving `./b.js` takes 300 ms, so the transform is still running after the update;
- `request-during-update`: requests `/a.js` from a `hotUpdate` hook, as a browser tab or another plugin can.
