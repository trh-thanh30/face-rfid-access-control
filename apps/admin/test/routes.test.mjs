import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("route pages remain thin and render views", async () => {
  const routes = [
    ["login", "LoginView"],
    ["dashboard", "DashboardView"],
    ["people", "PeopleView"],
    ["people/[id]", "PersonDetailView"],
    ["people/[id]/face-enrollment", "FaceEnrollmentView"],
    ["access-grants", "AccessGrantsView"],
    ["access-points", "AccessPointsView"],
    ["devices", "DevicesView"],
    ["access-events", "AccessEventsView"],
  ];
  for (const [route, view] of routes) {
    const page = await readFile(
      new URL(`../app/${route}/page.tsx`, import.meta.url),
      "utf8",
    );
    assert.match(page, new RegExp(view));
    assert.doesNotMatch(page, /use client/);
  }
});

test("admin views include accessibility and privacy guardrails", async () => {
  const shell = await readFile(
    new URL("../src/components/admin-shell.tsx", import.meta.url),
    "utf8",
  );
  const enrollment = await readFile(
    new URL(
      "../src/views/face-enrollment/face-enrollment.view.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(shell, /aria-label="Điều hướng quản trị"/);
  assert.match(enrollment, /embedding không hiển thị/);
  assert.doesNotMatch(enrollment, /template\.embedding|embedding\.map/);
});
