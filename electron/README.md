# FastenerERP Billing — Windows Desktop Build

This folder packages the web app as an online Windows desktop application.

## One-time setup

```bash
bun add -d electron @electron/packager
```

## Build a Windows executable

```bash
# 1. Build the web app (outputs to /dist)
bun run build

# 2. Package as a Windows app
npx @electron/packager . "FastenerERP Billing" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite \
  --ignore='^/src' --ignore='^/public' --ignore='^/electron-release' \
  --ignore='^/node_modules/(?!(electron-packager|@electron)).*'
```

The output lives at `electron-release/FastenerERP Billing-win32-x64/`.
Double-click `FastenerERP Billing.exe` to run.

All data is stored in `localStorage` and persists between launches.
No internet connection is required.
