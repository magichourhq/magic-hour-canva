# Magic Hour for Canva

The Magic Hour Video app for Canva, a Design Editor intent built with the Canva Apps SDK and App UI Kit. Choose an image (the one selected in the design or an uploaded PNG, JPEG or WebP) or start from a creative brief, describe the motion, and generate a short video with the [Magic Hour API](https://docs.magichour.ai). Preview the result and add it to the design as a native video.

The video flow comes from [`@magichourhq/editor-kit`](https://github.com/magichourhq/editor-kit), which uses [`@magichourhq/browser-client`](https://github.com/magichourhq/browser-client).

- The person using the app enters their own Magic Hour API key. It stays in session memory.
- The accepted project ID is saved in app-origin local storage, so an interrupted generation can be resumed without paying again.
- The video and its generated preview image are uploaded with `aiDisclosure: "app_generated"`.
- **Use selected image** gives the full original image, including areas outside a crop or frame.

## Development

```sh
yarn install
yarn check
yarn test
yarn build
```

`yarn build` writes `dist/app.js` and `dist/messages_en.json`. The UI Kit CSS is inlined into `app.js`, because the Developer Portal accepts a single JS file. `messages_en.json` holds the app's own messages plus the catalogs of `@magichourhq/browser-client` and `@magichourhq/editor-kit`, with the same message IDs as the translations in the Developer Portal.

To try the app in Canva, run `yarn dev` and set the app's development JavaScript URL in the Developer Portal to `http://localhost:5173/app.js`. Use the Portal's preview. The bundle does not run outside Canva. Set `PORT` to change the port, or `LOCAL_TLS_KEY` and `LOCAL_TLS_CERT` to serve over HTTPS.

The app's scopes are `canva:design:content:read`, `canva:design:content:write`, `canva:asset:private:read` and `canva:asset:private:write`.

## Release

1. Bump `version` in `package.json` in a pull request and merge it.
2. The Release workflow builds the app and creates a GitHub release `v<version>` with `app.js` and `messages_en.json` attached. Nothing is uploaded to Canva automatically.
3. Download `app.js` and `messages_en.json` from the release.
4. In the Canva Developer Portal, open the Magic Hour app, upload `app.js` as the JavaScript bundle, and upload `messages_en.json` for the UI translations.

## License

MIT
