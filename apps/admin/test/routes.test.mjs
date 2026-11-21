import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("route pages remain thin and render views", async () => {
  const loginPage = await readFile(
    new URL("../app/login/page.tsx", import.meta.url),
    "utf8",
  );
  const dashboardPage = await readFile(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(loginPage, /LoginView/);
  assert.match(dashboardPage, /DashboardView/);
  assert.doesNotMatch(loginPage, /use client/);
  assert.doesNotMatch(dashboardPage, /use client/);
});
