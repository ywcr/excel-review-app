Local vendored browser bundles for the Web Worker to avoid CDN fetch latency.
- xlsx.full.min.js (from npm xlsx dist)
- jszip.min.js (from npm jszip dist)

These are used by public/validation-worker.js via importScripts('/vendor/...').
