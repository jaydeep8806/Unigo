# UNIGO driver module

This module uses the existing Expo 58 / React Native JavaScript app, Expo Router,
AsyncStorage, expo-location, Supabase Auth, PostgreSQL RPCs and Supabase Realtime.
No runtime dependencies or separate application were introduced.

## Database setup

1. Apply `supabase/migrations/202611060002_drivers.sql` to the configured Supabase
   project using your normal migration workflow or the SQL editor. The migration
   creates drivers, rides, RLS policies, the matching RPC and the Realtime publication.
2. Enable anonymous sign-ins in Supabase Auth for existing guest sessions. The
   Supabase session is persisted using the existing AsyncStorage auth adapter.
   Existing email/password accounts are reused. Driver onboarding also provides
   the existing account sign-in form. Device-only guest profiles cannot be recovered
   after clearing app storage; use an account for cross-device access.
3. Keep `driver_settings.development = false` in production (the default).

The migration and seed have been exercised in local PostgreSQL via PGlite. This
does not deploy them to the hosted project. No database administrator credential
is included in the application.

## Development driver pool

Run `supabase/seed-drivers.sql` **only on a dedicated development database**. It
explicitly enables development matching and inserts 1,800 bikes and 1,200 cars
(600 compact cars and 600 sedans). Deterministic IDs and unique registrations make
repeat runs idempotent. Coordinates are distributed around Kalawad Road, University
Road, Raiya Road, 150 Feet Ring Road, Yagnik Road, Gondal Road, Mavdi, Nana Mava,
Kotecha Chowk, Race Course and central Rajkot. Names and contact numbers are generated
development data, not verified people. Source is recorded as `seed`.

Set `EXPO_PUBLIC_RIDE_SIMULATION=true` and run a development build to book from that
pool. Both the JavaScript development flag and the server setting must allow it.
Normal requests match registered drivers only; simulated requests match seed drivers
only. The trip screen labels simulated rides explicitly. Automatic acceptance and
progression occur exclusively in the server's simulated branch, never against real
driver accounts. Set the flag to false to exercise two-device rider/driver booking.

## Booking and lifecycle

- Step 4's **Register and continue** button saves through `registerDriver` and
  the `driver_action('register', ...)` RPC into `public.drivers`. It opens the
  dashboard using the returned database record only after the save succeeds.
  Failed saves keep the form intact and show an error. If confirmation times out,
  use **Retry connection** to recover a profile that may already have been saved.
- Persisted role selection follows the existing welcome/location flow. Profile
  includes role switching. Switching away from the dashboard takes the driver offline
  and is disabled during an active ride.
- A driver row is the canonical vehicle inventory record: one vehicle per account,
  globally unique normalized registration, category, identity and availability.
  Auto onboarding is also supported to preserve the existing Auto booking category.
- Matching picks randomly among drivers within 8 km with the exact booking category,
  a current location heartbeat, and no active assignment. It excludes the rider's own
  driver profile and every driver who has already received this request.
- Offers expire after 30 seconds. Rejection/expiry selects another eligible driver.
  No eligible candidate produces a terminal `unavailable` state with a retry path.
- RPC transactions serialize allocation and unique indexes enforce one active ride
  per rider and driver. Clients have no direct table write privileges. Only ride
  participants can read a ride; only its assigned real driver can advance it.
- Realtime subscriptions refresh participant state, with a five-second recovery poll.
  Active rider history is restored from the server. Expired abandoned offers are
  released by subsequent RPC calls; no background worker is required for allocation.
- Driver location is foreground-only, refreshed every 20 seconds. A 60-second lease
  removes stale drivers from matching. Background location and push notifications
  are not implemented; drivers should keep the dashboard open to receive offers.
- Arrival, start-code validation and completion are server-authoritative. Real ride
  progress is never advanced by a rider timer. Driver coordinates come from the stored
  location, not interpolated map positions.
- Earnings show gross quoted fares in the latest 50 rides, not settled payouts. The
  existing rider wallet/payment simulation and local feedback are retained. This
  module does not introduce payment processing, identity verification or payouts.

## Validation

Run `node --test scripts/test-drivers.mjs`. The integration test uses the existing
test-only PGlite installation in `.tools/commerce-validation`; it does not connect
to the hosted Supabase database. Run `npm run lint` and `npx tsc --noEmit` as well.
`tsconfig.json` enables TypeScript's no-emit compilation for this JavaScript project;
`checkJs` remains disabled, so it is not a strict JavaScript type audit.

For device verification, use two distinct sessions on a development database with
simulation disabled. Register a driver and go online near the rider's pickup. Book
the matching category, accept, arrive, enter the rider's code, start and complete.
Verify both screens, rejection, cancellation, backgrounding, and reconnection.
