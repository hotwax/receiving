# iPad quantity entry regression

Use an authenticated Receiving app connected to a real test instance. Do not save
progress or receive inventory. Use an empty local draft and clear entered values
before leaving the order.

Test on the physical iPad with the native keyboard:

1. Open a long TO and tap Qty. Type a quantity with the software keyboard.
2. Dismiss the keyboard while the field retains focus. Confirm the card remains
   visible and the lower panel does not become blank.
3. Refocus and edit the quantity; clear it without saving.
4. Scroll several screens and confirm the scanner remains below the header.
5. Repeat quantity entry on a one-item TO and in portrait orientation.

For a locally built app on a temporary HTTPS hostname, build with
`NODE_ENV=development VITE_OMS_TYPE=MOQUI pnpm exec vite build --mode development`
(for a Moqui test instance). Development mode is needed because release cookies
are scoped to `hotwax.io`. Serve **only `dist/`** with SPA fallback through a
temporary HTTPS tunnel. Do not expose the Vite server with inherited root dev
credentials, or copy credentials into app environment files. Sign in normally
on the iPad, and use a separate temporary Home Screen shortcut for standalone
testing. Close the tunnel when finished.
