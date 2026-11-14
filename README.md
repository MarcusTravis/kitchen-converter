# Cups & Quarts

A fast, free, ad-free cooking and ingredient converter: cups, spoons, grams and ounces; cups ↔ grams for common ingredients; oven temperatures (°F, °C, Gas Mark); and pan-size recipe scaling.

**Live site:** [https://cupsnquarts.pages.dev](https://cupsnquarts.pages.dev)

Plain static HTML/CSS/vanilla JS. No framework, no build step: the repo root is deployed as-is by Cloudflare Pages on every push to `main`.

## Layout

- `assets/convert.js`: all conversion math (works in the browser and in Node).
- `assets/app.js`: the interactive converter on the home page.
- `assets/site.css`: styles.
- `data/ingredients.json`: ingredient densities (grams per US cup), each with its USDA FoodData Central ID and the portion it came from.
- `scripts/ingredient-list.json`: the ingredients and which USDA portion to use.
- `scripts/build-data.mjs`: rebuilds `data/ingredients.json` from the USDA SR Legacy CSV download.
- `scripts/generate-pages.mjs`: generates `index.html`, `oven-temperature/`, `pan-sizes/`, `about/`, `convert/` (long-tail chart pages), `404.html`, `sitemap.xml` and `robots.txt`. Generated files are committed; don't hand-edit them.
- `scripts/render-og.cjs`: renders the share preview image `assets/og-image.png` (1200×630) with a local Chrome.
- `tests/conversions.test.mjs`: core conversion tests.

## Common tasks

```sh
node tests/conversions.test.mjs          # run tests
node scripts/generate-pages.mjs          # regenerate all HTML after changing data or templates
# refresh ingredient data (download "SR Legacy" CSV from https://fdc.nal.usda.gov/download-datasets)
node scripts/build-data.mjs path/to/FoodData_Central_sr_legacy_food_csv_2018-04
```

If the site moves to a custom domain, change `SITE` in `scripts/generate-pages.mjs` and regenerate so canonical URLs and the sitemap match.

## Data

Ingredient weights are derived from USDA FoodData Central (SR Legacy), U.S. Department of Agriculture, Agricultural Research Service, released under CC0 1.0 (public domain dedication). Each entry in `data/ingredients.json` keeps its FDC ID and the USDA portion it came from. Weights are approximate.

## License

The code is released under the [MIT License](LICENSE), copyright Marcus Travis. The ingredient data is not covered by that license: it derives from USDA FoodData Central, which is public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

## Analytics

Cloudflare Web Analytics (cookieless) via the beacon snippet in every page, added by `scripts/generate-pages.mjs`. Pages-level auto-injection is off so views are not counted twice.
