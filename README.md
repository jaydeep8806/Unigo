# UniGo

A modern ride-hailing app for all people in India (₹ INR).
Built with Expo, React Native, and Expo Router.

## Run locally

Use Node.js 22.23.4 (see `.nvmrc`), then install the locked dependencies:

```sh
npm ci
npm start
```

Press `w` in the Expo terminal for the browser preview. For Expo Go on a phone,
run `npm run go` and scan the QR code; use Expo Go compatible with SDK 58.

On this Windows workspace, npm scripts automatically use the verified Node
22.23.4 runtime in `.tools/node.exe` when present. This folder is ignored by Git;
other machines should install the Node version in `.nvmrc`.

The welcome screen starts a local guest session. The ride flow, driver,
tracking, OTP, offers and payment are simulations stored on this device;
they are not connected to a dispatch or payment service. Saved places and
activity are also stored locally. Location search uses the Photon public demo
service; set `EXPO_PUBLIC_GEOCODER_URL` to a compatible hosted instance for
production use. Manual pickup selection is available if location is denied.

## Google Maps setup

The shared map is used for rides, trip tracking, the driver screen, delivery
location selection, nearby businesses and home services. Expo Go includes the
native map for testing. For standalone builds, enable the Maps SDK for Android
and iOS in Google Cloud and set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (Android) and
`EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY` in the build environment. Set the app's
Android package and iOS bundle identifier and restrict the respective keys to
those identifiers (and the Android signing certificate). Rebuild the native app
after changing these keys. See the [Expo SDK 58 setup guide](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/#deploy-app-with-google-maps).

For web, enable Maps JavaScript API and set `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`
in `.env`; restrict it to the site's HTTP referrers. Restart Expo after changing
environment variables. The browser falls back to OpenStreetMap if the Google
Maps script cannot be loaded. These keys are included in client applications, so
use separate restricted keys rather than treating them as secrets. Location
search and route calculation use the app's existing services.

```sh
npm run lint
```
