import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { chromium, request } from "playwright";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:8000";

// Inspect the real MapLibre ref without adding a production test-only API.
// All selection and maneuver actions below are physical browser clicks.
async function mapAction(page, action, point = [0, 0]) {
  return page.evaluate(
    ({ action, point }) => {
      const el = document.querySelector(".maplibregl-map");
      let fiber =
        el[Object.keys(el).find((key) => key.startsWith("__reactFiber"))];
      for (; fiber; fiber = fiber.return) {
        for (let hook = fiber.memoizedState; hook; hook = hook.next) {
          const map = hook.memoizedState?.current;
          if (typeof map?.getBearing !== "function") continue;
          if (action === "center") map.jumpTo({ center: point, zoom: 17 });
          if (action === "rotate") map.jumpTo({ bearing: 90 });
          const p = map.project(point);
          const rect = el.getBoundingClientRect();
          return {
            x: p.x + rect.x,
            y: p.y + rect.y,
            bearing: map.getBearing(),
            center: map.getCenter().toArray(),
            zoom: map.getZoom(),
          };
        }
      }
      throw new Error("Real MapLibre instance not found");
    },
    { action, point },
  );
}
const lngLat = (x, y) => [
  ((x / 6371000) * 180) / Math.PI,
  ((y / 6371000) * 180) / Math.PI,
];
async function selectAt(page, point) {
  const position = await mapAction(page, "read", point);
  await page.mouse.click(position.x, position.y);
}
async function waitPressed(button, value) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      (await button.getAttribute("aria-pressed")) === value &&
      (await button.isEnabled())
    )
      break;
    await button.page().waitForTimeout(100);
  }
  assert.equal(await button.getAttribute("aria-pressed"), value);
}

test(
  "real City Model: added lane toggles, persists, compass and environment survive",
  { timeout: 120000 },
  async () => {
    const api = await request.newContext({ baseURL: apiURL });
    const workspaceResponse = await api.get("/api/v1/cities/editor-workspace");
    assert.equal(workspaceResponse.status(), 200);
    const original = await workspaceResponse.json();
    const root = `/api/v1/cities/${original.id}`;
    const roads = [
      [
        "A",
        [
          [470, 0],
          [600, 0],
        ],
      ],
      [
        "C",
        [
          [600, 0],
          [730, 0],
        ],
      ],
      [
        "B",
        [
          [600, -130],
          [600, 0],
        ],
      ],
    ].map(([name, points]) => ({
      id: randomUUID(),
      name: `E2E regression ${name}`,
      road_type: "RESIDENTIAL",
      geometry: { points: points.map(([x, y]) => ({ x, y })) },
      width_m: 8,
      is_width_estimated: false,
      lanes: ["FORWARD", "BACKWARD"].map((direction, index) => ({
        id: randomUUID(),
        index,
        direction,
        lane_type: "GENERAL",
      })),
    }));
    const junction = {
      id: randomUUID(),
      position: { x: 600, y: 0 },
      connected_road_ids: roads.map((r) => r.id),
      connected_lane_ids: roads.flatMap((r) => r.lanes.map((l) => l.id)),
      control_type: "UNCONTROLLED",
      traffic_light_id: null,
    };
    let browser;
    try {
      const seeded = await api.put(`${root}/topology`, {
        data: {
          roads: [...original.roads, ...roads].map(({ id, geometry }) => ({
            id,
            geometry,
          })),
          intersections: [...original.intersections, junction],
          new_roads: roads,
        },
      });
      assert.equal(seeded.status(), 204, await seeded.text());
      const restored = await api.put(`${root}/lane-connections`, {
        data: { connections: original.lane_connections },
      });
      assert.equal(restored.status(), 200, await restored.text());
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto(`${baseURL}/ru`);
      await page.locator('a[href="/ru/app/city-model"]').first().click();
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForFunction(
        () => document.querySelector(".maplibregl-canvas")?.width > 0,
      );
      await page.waitForTimeout(1200);
      await mapAction(page, "center", lngLat(600, 0));
      await selectAt(page, lngLat(665, 0));
      const save = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/roads/${roads[1].id}/properties`) &&
          r.request().method() === "PATCH",
      );
      await page
        .getByRole("spinbutton", { name: "Полосы", exact: true })
        .fill("3");
      const savedRoadResponse = await save;
      assert.equal(savedRoadResponse.status(), 200);
      const savedRoad = await savedRoadResponse.json();
      await selectAt(page, lngLat(600, 0));
      const panel = page.locator("section").filter({
        has: page.getByRole("heading", { name: "Выбранный перекрёсток" }),
      });
      assert.ok((await panel.innerText()).includes(junction.id));
      const button = panel
        .locator("details")
        .filter({ hasText: "E2E regression C" })
        .getByRole("button", { name: "Налево", exact: true })
        .last();
      await button.waitFor();
      await button.scrollIntoViewIfNeeded();
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      await panel.evaluate((element) => {
        window.__intersectionPanel = element;
      });
      const before = await button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: el.textContent,
          pressed: el.getAttribute("aria-pressed"),
          disabled: el.disabled,
          pointerEvents: getComputedStyle(el).pointerEvents,
          rect: r.toJSON(),
          hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            ?.outerHTML,
        };
      });
      console.log("BEFORE", JSON.stringify(before));
      assert.match(before.hit, /button/);
      assert.equal(before.pointerEvents, "auto");
      await page.evaluate(() => {
        window.__events = [];
        for (const type of ["pointerdown", "click"])
          document.addEventListener(
            type,
            (e) =>
              window.__events.push({
                type,
                target: e.target.textContent,
                prevented: e.defaultPrevented,
              }),
            true,
          );
      });
      await page.screenshot({ path: "/tmp/pixel-lane-before-maneuver.png" });
      async function toggle(value) {
        await button.scrollIntoViewIfNeeded();
        const panelState = await panel.evaluate((element) => ({
          scrollTop: element.scrollTop,
          expanded: [...element.querySelectorAll("details")].map(
            (detail) => detail.open,
          ),
        }));
        const pending = page.waitForResponse(
          (r) =>
            r.url().endsWith("/lane-connections") &&
            r.request().method() === "PUT",
        );
        await button.click();
        assert.equal(await button.getAttribute("aria-pressed"), value);
        const response = await pending;
        const payload = response.request().postDataJSON();
        const body = await response.json();
        console.log(
          "MANEUVER",
          JSON.stringify({
            status: response.status(),
            payload,
            response: body,
          }),
        );
        assert.equal(response.status(), 200, JSON.stringify(body));
        if (value === "true")
          assert.ok(
            payload.connections.some(
              (c) =>
                c.from_lane_id === savedRoad.lanes[2].id &&
                c.maneuver === "LEFT",
            ),
          );
        await waitPressed(button, value);
        for (const delay of [250, 1000, 2000]) {
          await page.waitForTimeout(delay);
          assert.equal(await button.getAttribute("aria-pressed"), value);
        }
        assert.ok((await panel.innerText()).includes(junction.id));
        assert.equal(
          await panel.evaluate(
            (element) =>
              element === window.__intersectionPanel && element.isConnected,
          ),
          true,
        );
        assert.deepEqual(
          await panel.evaluate((element) => ({
            scrollTop: element.scrollTop,
            expanded: [...element.querySelectorAll("details")].map(
              (detail) => detail.open,
            ),
          })),
          panelState,
        );
      }
      await toggle("true");
      await page.screenshot({ path: "/tmp/pixel-lane-after-maneuver.png" });
      await toggle("false");
      console.log("EVENTS", await page.evaluate(() => window.__events));
      await page.reload();
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForTimeout(1000);
      await mapAction(page, "center", lngLat(600, 0));
      await selectAt(page, lngLat(600, 0));
      await panel.evaluate((element) => {
        window.__intersectionPanel = element;
      });
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      // Also verify enabled persistence: a false-only reload could mask a no-save bug.
      await toggle("true");
      await page.reload();
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForTimeout(1000);
      await mapAction(page, "center", lngLat(600, 0));
      await selectAt(page, lngLat(600, 0));
      await panel.evaluate((element) => {
        window.__intersectionPanel = element;
      });
      assert.equal(await button.getAttribute("aria-pressed"), "true");
      await toggle("false");
      const compass = page.getByRole("button", { name: /север/i });
      const box = await compass.boundingBox();
      console.log("COMPASS BOX", box);
      assert.ok(box.width >= 56 && box.height >= 56);
      const beforeRotation = await compass.locator("svg").getAttribute("style");
      const pointOnDial = (degrees) => ({
        x: box.x + box.width / 2 + Math.sin((degrees * Math.PI) / 180) * 23,
        y: box.y + box.height / 2 - Math.cos((degrees * Math.PI) / 180) * 23,
      });
      const north = pointOnDial(0);
      await page.mouse.move(north.x, north.y);
      await page.mouse.down();
      for (let angle = 15; angle <= 90; angle += 15) {
        const point = pointOnDial(angle);
        await page.mouse.move(point.x, point.y);
      }
      await page.mouse.up();
      const rotated = await mapAction(page, "read");
      assert.ok(Math.abs(rotated.bearing - 90) < 8, rotated.bearing);
      assert.notEqual(
        await compass.locator("svg").getAttribute("style"),
        beforeRotation,
      );
      await page.mouse.move(north.x, north.y);
      await page.mouse.down();
      for (let angle = 15; angle <= 360; angle += 15) {
        const point = pointOnDial(angle);
        await page.mouse.move(point.x, point.y);
        if (angle % 90 === 0) {
          const camera = await mapAction(page, "read");
          const actual = ((camera.bearing % 360) + 360) % 360;
          const expected = (90 + angle) % 360;
          assert.ok(
            Math.abs(((actual - expected + 540) % 360) - 180) < 8,
            `${angle}° drag produced ${camera.bearing}° bearing`,
          );
        }
      }
      await page.mouse.up();
      const fullTurn = await mapAction(page, "read");
      assert.ok(Math.abs(fullTurn.bearing - 90) < 8, fullTurn.bearing);
      await compass.screenshot({ path: "/tmp/pixel-lane-compass.png" });
      await compass.click();
      await page.waitForTimeout(350);
      const reset = await mapAction(page, "read");
      assert.ok(Math.abs(reset.bearing) < 0.01);
      assert.ok(
        reset.center.every(
          (value, index) => Math.abs(value - rotated.center[index]) < 1e-9,
        ),
      );
      assert.equal(reset.zoom, rotated.zoom);
      console.log("COMPASS CAMERA", JSON.stringify({ rotated, reset }));
      const overlay = page.locator("[data-weather]");
      const timeTrigger = page
        .locator('button[aria-haspopup="menu"]')
        .filter({ hasText: /Авто|Утро|День|Вечер|Ночь/ });
      for (const [label, mode] of [
        ["Утро", "morning"],
        ["День", "day"],
        ["Вечер", "evening"],
        ["Ночь", "night"],
        ["Авто", "night"],
      ]) {
        await timeTrigger.click();
        await page
          .getByRole("menuitemradio", { name: new RegExp(`^${label}`) })
          .click();
        assert.equal(await overlay.getAttribute("data-time-of-day"), mode);
      }
      for (const [label, weather] of [
        ["Дождь", "rain"],
        ["Снег", "snow"],
        ["Туман", "fog"],
        ["Ясно", "clear"],
      ]) {
        await page
          .locator('button[aria-haspopup="menu"]')
          .filter({ hasText: /Ясно|Дождь|Снег|Туман/ })
          .click();
        await page
          .getByRole("menuitemradio", { name: new RegExp(`^${label}`) })
          .click();
        assert.equal(await overlay.getAttribute("data-weather"), weather);
        if (weather !== "clear") {
          const intensity = page.getByRole("group", { name: "Интенсивность" });
          for (const button of await intensity.getByRole("button").all()) {
            await button.click();
            assert.equal(await button.getAttribute("aria-pressed"), "true");
          }
        }
        if (weather === "rain")
          assert.equal(await overlay.locator("canvas").count(), 1);
      }
      await page.getByLabel("Дата", { exact: true }).fill("2026-10-15");
      await page.getByLabel("Время", { exact: true }).fill("21:30");
      assert.equal(
        await page.locator("time").getAttribute("datetime"),
        "2026-10-15T21:30",
      );
      const clockBox = await page.locator("time").boundingBox();
      assert.ok(clockBox.x < 100 && clockBox.y > 900);
      assert.equal(await overlay.getAttribute("data-time-of-day"), "night");
      console.log(
        "ENVIRONMENT all time/weather/intensity/date/clock/RainCanvas checks passed",
      );
      // Use the actual appearance switcher so next-themes and map styling
      // update together, including transition suppression.
      await page.getByLabel("Время", { exact: true }).fill("12:00");
      for (const theme of ["light", "dark"]) {
        for (let count = 0; count < 3; count++) {
          if ((await page.locator("html").getAttribute("data-theme")) === theme)
            break;
          await page
            .getByRole("button", { name: /^(Светлая|Тёмная|Как в системе)$/ })
            .click();
        }
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          theme,
        );
        await page.waitForTimeout(750);
        await button.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `/tmp/pixel-lane-${theme}.png` });
      }
      for (const width of [390, 768]) {
        await page.setViewportSize({ width, height: 1000 });
        await button.scrollIntoViewIfNeeded();
        const bounds = await compass.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
        assert.equal(
          await button.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return (
              document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2,
              ) === el
            );
          }),
          true,
        );
        await page.screenshot({ path: `/tmp/pixel-lane-${width}.png` });
      }
      assert.deepEqual(errors, []);
    } finally {
      if (browser) await browser.close();
      for (const road of roads) {
        const response = await api.delete(`${root}/roads/${road.id}`);
        assert.ok(
          [204, 404].includes(response.status()),
          await response.text(),
        );
      }
      await api.dispose();
    }
  },
);

test(
  "real editor: a maneuver waits for a pending T-junction topology save",
  { timeout: 120000 },
  async () => {
    const api = await request.newContext({ baseURL: apiURL });
    const original = await (
      await api.get("/api/v1/cities/editor-workspace")
    ).json();
    const root = `/api/v1/cities/${original.id}`;
    const roads = [
      {
        name: "Pending A",
        points: [
          [470, 0],
          [600, 0],
        ],
      },
      {
        name: "Pending C",
        points: [
          [600, 0],
          [730, 0],
        ],
      },
    ].map(({ name, points }) => ({
      id: randomUUID(),
      name,
      road_type: "RESIDENTIAL",
      geometry: { points: points.map(([x, y]) => ({ x, y })) },
      width_m: 8,
      is_width_estimated: false,
      lanes: ["FORWARD", "BACKWARD"].map((direction, index) => ({
        id: randomUUID(),
        index,
        direction,
        lane_type: "GENERAL",
      })),
    }));
    let browser;
    let createdRoadId;
    try {
      const seeded = await api.put(`${root}/topology`, {
        data: {
          roads: [...original.roads, ...roads].map(({ id, geometry }) => ({
            id,
            geometry,
          })),
          intersections: original.intersections,
          new_roads: roads,
        },
      });
      assert.equal(seeded.status(), 204, await seeded.text());
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      const writes = [];
      page.on("response", (response) => {
        if (
          response.request().method() === "PUT" &&
          (response.url().endsWith("/topology") ||
            response.url().endsWith("/lane-connections"))
        ) {
          writes.push({
            path: new URL(response.url()).pathname,
            status: response.status(),
            payload: response.request().postDataJSON(),
          });
        }
      });
      await page.goto(`${baseURL}/ru/app/city-model`);
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForTimeout(850);
      await mapAction(page, "center", lngLat(600, 0));
      await page
        .getByRole("button", { name: "Редактировать", exact: true })
        .click();
      await page.getByRole("button", { name: /Нарисовать дорогу/ }).click();
      await page.route("**/api/v1/cities/*/topology", async (route) => {
        createdRoadId = route.request().postDataJSON().new_roads[0].id;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });
      await selectAt(page, lngLat(600, -130));
      await selectAt(page, lngLat(600, 0));
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: "Готово", exact: true }).click();
      await page.waitForTimeout(100);
      await selectAt(page, lngLat(600, 0));
      const panel = page.locator("section").filter({
        has: page.getByRole("heading", { name: "Выбранный перекрёсток" }),
      });
      const button = panel
        .locator("details")
        .filter({ hasText: "Pending A" })
        .getByRole("button", { name: "Направо", exact: true });
      await button.scrollIntoViewIfNeeded();
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      await button.click();
      assert.equal(await button.getAttribute("aria-pressed"), "true");
      for (const delay of [250, 1000, 2000]) {
        await page.waitForTimeout(delay);
        assert.equal(await button.getAttribute("aria-pressed"), "true");
      }
      assert.ok((await panel.innerText()).includes("Подходы\n3"));
      assert.ok(
        writes.some(
          (write) => write.path.endsWith("/topology") && write.status === 204,
        ),
      );
      assert.ok(
        writes.some(
          (write) =>
            write.path.endsWith("/lane-connections") &&
            write.status === 200 &&
            write.payload.connections.length > 0,
        ),
      );
      await page.reload();
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForTimeout(1000);
      await mapAction(page, "center", lngLat(600, 0));
      await selectAt(page, lngLat(600, 0));
      assert.equal(await button.getAttribute("aria-pressed"), "true");
      await button.click();
      await page.waitForTimeout(2000);
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      await page.reload();
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForTimeout(1000);
      await mapAction(page, "center", lngLat(600, 0));
      await selectAt(page, lngLat(600, 0));
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      console.log(
        "PENDING TOPOLOGY",
        JSON.stringify(
          writes.map(({ path, status, payload }) => ({
            path,
            status,
            connections: payload?.connections?.length,
          })),
        ),
      );
    } finally {
      if (browser) await browser.close();
      for (const id of [createdRoadId, ...roads.map((road) => road.id)].filter(
        Boolean,
      )) {
        const deleted = await api.delete(`${root}/roads/${id}`);
        assert.ok([204, 404].includes(deleted.status()), await deleted.text());
      }
      await api.dispose();
    }
  },
);
