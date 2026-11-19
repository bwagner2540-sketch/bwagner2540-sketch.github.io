# bwagner2540-sketch.github.io
DAVG Coming Soon

Publishing: GitHub Pages serves the `main` branch at `/`, with custom domain
`davg.ai`. Cloudflare proxies the domain; this is not a Cloudflare Pages project.
`/celebrity/` redirects to the existing `/celebrity/pradera/` presentation.

The Site route and presentation smoke checks workflow verifies the homepage,
Celebrity entry routes, presentation assets, design notes and PDF output on main
and pull requests, then checks the actual domain after Pages deployment. It can
also be run manually. A failed check reports a failure; it does not roll back a
deployment automatically. If Cloudflare retains an old 404 after a route repair,
purge only the affected URLs and recheck the normal URLs without cache busters.
