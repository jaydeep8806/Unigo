# Food & Shop setup

This feature is reached through the existing Food and Shops service tiles. The
home page, UniGoMoto ride flow, global location selection and other services are
unchanged. Both commerce sections share a separate delivery address.

## What works without merchant setup

- Live Photon area/street/landmark search, GPS and the existing Leaflet pin picker.
- Structured Home/Work/College/Other addresses saved on the device.
- OpenStreetMap discovery of real nearby businesses, including nodes and building
  footprints. No generated business names, ratings, stock or delivery claims.
- Permission denial, unsupported location, empty result, timeout and retry states.

The explicit launch zone is a **25 km radius around Rajkot city centre**
(22.3039, 70.8022), including nearby areas such as Shapar and Metoda from the
request. This is not the municipal boundary. Discovery searches within 6 km of
the selected address. Registered merchants use their individual delivery radii.
Change this service policy consistently in `commerceLocations.js` and the SQL
checkout function if the business adopts a different boundary.

Search uses OpenStreetMap coverage; it cannot guarantee every address. The exact
pin picker is the fallback for an unmapped street. Configure
`EXPO_PUBLIC_GEOCODER_URL` to a hosted Photon instance for production traffic.

## Enable ordering and inventory

1. Apply `supabase/migrations/202610300001_food_shop.sql` to the existing Supabase
   project using Supabase migrations or its SQL editor. No remote migration has
   been applied by this change.
2. Configure Supabase email/password authentication and confirmation emails.
   Food & Shop has its own account dialog; existing guest ride access is retained.
3. Create genuine merchants in `commerce_shops` as an administrator. Use
   `kind = 'food'` for restaurants or `kind = 'shops'` for shops. Supply the real
   owner user's UUID, coordinates, address, category, radius, delivery fee and
   status. Merchant creation and ownership reassignment are deliberately not
   exposed to ordinary clients. Do not insert fictitious delivery partners.
4. The assigned owner signs in through **Shop owner dashboard** within Food/Shop,
   adds menu items/products, prices, stock, images and low-stock thresholds, then
   handles orders there. Product image fields accept HTTPS URLs; no file-upload
   storage bucket is provisioned. Available stock and the available toggle both
   control purchasing. Merchant `status` is the authoritative accepting-orders
   flag; opening/closing time fields are descriptive and not an automatic scheduler.
5. Test a buyer account: select address → merchant → menu/products → cart →
   confirm address → cash-on-delivery order. Orders appear in **My orders**.

Only registered delivery partners have menu/order buttons. Map discoveries show
details and explicitly state that ordering is not available. No fake checkout,
payment collection or live courier tracking is simulated.

## Database/API design

The existing Supabase client is reused instead of introducing another API server.
Its PostgREST interface supplies the requested address, merchant and product
CRUD APIs. Names are prefixed to avoid conflicts with ride tables:

| Data | Table / RPC |
| --- | --- |
| Restaurants and shops | `commerce_shops` (`kind` discriminator) |
| Food menu and shop inventory | `commerce_products` |
| Signed-in user addresses | `commerce_addresses` (structured JSON address) |
| Orders and immutable line-item snapshots | `commerce_orders` |
| Stock adjustment | `commerce_adjust_stock` |
| Atomic checkout | `commerce_place_order` |
| Owner order progression | `commerce_advance_order` |

RLS limits product mutations to the assigned owner, addresses to their user, and
orders to the buyer or shop owner. Checkout recalculates prices and delivery fees
from database records, validates the service zone and merchant radius, locks
stock rows in a stable order, and commits all line items atomically. A request
reference makes network retries idempotent. Revision checks prevent stale owner
edits from overwriting stock changes. Orders progress from placed to accepted,
preparing, out for delivery, and delivered. Cancellation/refunds and online
payment integration are not part of this implementation.

## Validation

Run lint and the project's JavaScript-compatible compiler check:

```powershell
npm.cmd run lint
.\.tools\node.exe node_modules/typescript/bin/tsc --noEmit --project jsconfig.json --allowJs --jsx react-jsx --skipLibCheck
```

Run the regression suite with a temporary test-only PostgreSQL engine (no app
runtime dependency):

```powershell
npm.cmd install --prefix .tools/commerce-validation --no-package-lock --no-audit --no-fund @electric-sql/pglite@0.5.13
.\.tools\node.exe --test scripts/test-commerce.mjs
```

Tests execute the actual migration against PostgreSQL/WASM with mock Supabase
auth roles. They cover service boundaries, exact-pin preservation, out-of-stock
rollback, duplicate retries, invalid quantities, unauthorized mutations, order
visibility, stale edits and competing last-stock requests. PGlite serializes
queries; this does not replace a real multi-connection load test on Supabase.
Run a device smoke test for keyboard/safe-area layout, GPS denial, pin movement,
switching Food/Shop, merchant login and checkout before release.
