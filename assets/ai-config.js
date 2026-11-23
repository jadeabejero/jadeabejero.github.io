// Site AI settings. Visitors use these automatically; they never need their own key.
// SECURITY: anything in this file is public. Either
//   1) set `proxy` to your Cloudflare Worker URL (recommended: the key never reaches the browser), or
//   2) set `key` to a Gemini API key that is RESTRICTED in Google Cloud Console to
//      HTTP referrer https://jadeabejero.github.io/* and to the "Generative Language API" only,
//      with billing OFF, so the worst case is someone using up the free daily quota.
// Leave both empty and the tools fall back to the built-in rules (no AI).
window.JX_AI = {
  key: 'AQ.Ab8RN6LNDRfmkqUBtlN7E5jI-kIvNb-y68tRIUVgfiOoiXOHyQ',                         // paste the restricted Gemini key here (option 2)
  proxy: '',                       // or your Worker URL, e.g. 'https://jx-ai.yourname.workers.dev' (option 1)
  model: 'gemini-3.5-flash-lite'   // low-cost model (2.5-flash-lite is closed to new keys)
};
