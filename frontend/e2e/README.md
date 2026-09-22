# City Model browser regression

Run the real stack from the worktree (`make start`), then in `frontend`:

```sh
npx playwright install chromium
npm run test:e2e
```

The test uses the production City Model page and real PostgreSQL-backed APIs.
It adds three explicitly named synthetic roads at local (600, 0), preserves
existing lane connections, and deletes only those test roads in `finally`.
Do not run against production or concurrently with another editor session.
`E2E_BASE_URL` and `E2E_API_URL` override the default localhost ports 3000/8000.

It changes lane count through the UI, selects the real junction by a canvas
click, toggles the added lane's maneuver, checks requests and persistence in
both states, and verifies compass camera behavior and environment controls.
The test inspects the real React-owned MapLibre ref to project coordinates
and set a bearing; it never replaces application state or mocks requests.
Screenshots are saved to `/tmp/pixel-lane-{before-maneuver,after-maneuver,compass,light,dark}.png`.
