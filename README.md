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

```sh
npm run lint
```
