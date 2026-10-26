# TRMNL OG near-live cross-section

A second Worker for the [KPHX Airspace Cross-Section](../README.md). The original Worker feeds Liquid on the TRMNL platform. This one acts as a **custom TRMNL server**, so a TRMNL OG on USB power can fetch a fresh 800x480 1-bit picture every 20 seconds instead of waiting on the platform's schedule.

Same data sources, same chart layout idea (airport in the middle, expanded low-altitude band, collision-free tags, route codes), drawn straight into a 1-bit bitmap with no dependencies.

## How it works

```
TRMNL OG --GET /api/display--> Worker --> { image_url, refresh_rate: 20 }
TRMNL OG --GET /img/xs-<n>.bmp --> Worker fetches ADS-B, renders 800x480 BMP
OG sleeps refresh_rate seconds, repeats
```

The firmware reads `refresh_rate` from the `/api/display` reply and sleeps that long. It caches images by `filename`, so the Worker sends a new filename every refresh window.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/setup` | First-boot registration |
| `GET /api/display` | Image URL, filename, `refresh_rate` |
| `POST /api/log` | Accepts the device log upload |
| `GET /img/<name>.bmp` | The picture (800x480, 1 bpp, 62 byte header, as the firmware requires) |
| `GET /preview.png` | Same picture for a browser |
| `GET /` | Status page showing the URL to enter on the device |

Add `?demo=1` to `/preview.png` for synthetic traffic.

## Deploy

```bash
cd trmnl-og
npx wrangler login
npx wrangler deploy
```

Open the printed `https://trmnl-og-xs.<your-subdomain>.workers.dev/preview.png?demo=1` first. You should see the chart. Then open the Worker URL without `?demo=1` to confirm live traffic.

Settings are in `[vars]` in `wrangler.toml`. No secrets are needed.

## Point the OG at it

1. Hold the back button for 5 to 14 seconds (15 or more fully resets the device), then let go.
2. Join the `TRMNL-xxxx` Wi-Fi network from your phone. The setup page opens, or go to `http://4.3.2.1`.
3. Choose your Wi-Fi, then in the advanced section set **API server** to your Worker URL (no path at the end).
4. Save. The OG joins Wi-Fi and starts polling.

To go back to TRMNL's own server, clear the API server field.

## Test locally

```bash
node test-local.mjs     # renders demo traffic to out/xs.bmp and out/xs.png and checks the BMP header
node bench.mjs          # CPU time per image
```

## Credits and licence note

Aircraft silhouettes: [tar1090](https://github.com/wiedehopf/tar1090) (GPL-3.0). `icons.js` contains those shapes as polygon data, so keep that credit and treat this folder as GPL-3.0 when you distribute it. Traffic from airplanes.live, adsb.lol and adsb.fi.

## Notes and limits

- Silhouettes are the same tar1090 icons the X plugin uses, with the same type to icon table and airline list copied from `worker.js`. They are flattened to polygons in `icons.js` and filled straight into the bitmap. Airline traffic is solid, everything else is outlined, and military tags have a dashed border, as in the Liquid template.
- Facing and a 20 degree climb or descent tilt follow the real heading and vertical rate.
- To rebuild `icons.js` after changing icons in `full.liquid`: `npm i svgpath` somewhere, then `SVGPATH_FROM=/path/to/that/folder/ node build-icons.mjs`.
- The firmware does a full refresh every 8th update to clear ghosting, so the screen flashes then.
- Expect jumps rather than smooth motion. E-ink refreshes take a second or two.
- Routes come from the community routeset API and are cached for 30 minutes. They are missing for GA and military flights.
- Hobby display on unverified ADS-B data. Not for navigation.
