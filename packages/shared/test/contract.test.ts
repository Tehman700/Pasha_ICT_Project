/**
 * Contract + fixture tests.
 *
 * These check the invariants that quietly break a demo: a missing Urdu string,
 * a driver whose fixture data does not actually span families, a queue that is
 * ordered by booking time instead of ETA.
 *
 * Run: node --test packages/shared/test/
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { en, ur } from "../src/i18n/index.ts";
import { mockApi } from "../src/mock/client.ts";
import * as fx from "../src/mock/fixtures.ts";
import { colors } from "../src/tokens/colors.ts";
import { textStyle } from "../src/tokens/rn.ts";
import { typography } from "../src/tokens/typography.ts";

describe("i18n", () => {
  function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([k, v]) => {
      const path = prefix ? `${prefix}.${k}` : k;
      return typeof v === "object" && v !== null
        ? keyPaths(v as Record<string, unknown>, path)
        : [path];
    });
  }

  test("every English string has an Urdu counterpart", () => {
    const enKeys = keyPaths(en).sort();
    const urKeys = keyPaths(ur as unknown as Record<string, unknown>).sort();
    assert.deepEqual(urKeys, enKeys, "Urdu is Tier 1 — no key may be missing");
  });

  test("no Urdu string is left as English placeholder", () => {
    function walk(a: Record<string, unknown>, b: Record<string, unknown>, path = "") {
      for (const [k, v] of Object.entries(a)) {
        const p = path ? `${path}.${k}` : k;
        const other = b[k];
        if (typeof v === "object" && v !== null) {
          walk(v as Record<string, unknown>, other as Record<string, unknown>, p);
        } else if (typeof v === "string" && typeof other === "string") {
          // Allow shared proper nouns, but flag whole-string duplicates.
          if (v.length > 12) {
            assert.notEqual(other, v, `${p} appears untranslated`);
          }
        }
      }
    }
    walk(en, ur as unknown as Record<string, unknown>);
  });
});

describe("design tokens", () => {
  test("Urdu type steps never use negative tracking", () => {
    // Negative letter-spacing severs Nastaliq's connected script.
    for (const step of Object.keys(typography) as (keyof typeof typography)[]) {
      const ur = textStyle(step, "ur");
      assert.ok(
        ur.letterSpacing >= 0,
        `${step} has negative tracking in Urdu (${ur.letterSpacing})`,
      );
    }
  });

  test("Urdu line-height is taller than Latin for body text", () => {
    const latin = textStyle("bodyMd", "en");
    const nastaliq = textStyle("bodyMd", "ur");
    assert.ok(
      nastaliq.lineHeight > latin.lineHeight,
      "Nastaliq descends steeply; Latin line-heights collide",
    );
  });

  test("RN line-heights are absolute pixels, not ratios", () => {
    // A ratio (1.5) would make text overlap itself in RN.
    const s = textStyle("bodyMd", "en");
    assert.ok(s.lineHeight > 10, `expected px, got ${s.lineHeight}`);
  });

  test("exactly four queue states spend colour", () => {
    // design.md forbids a second brand action colour and scopes the timeline
    // pastels to agent UI, so state is carried by weight and fill — not hue.
    // Colour is spent four ways, each for a reason:
    //   NEARBY      primary border  — the one "act now" state
    //   AT_GATE     ink inversion   — highest attention, no new colour
    //   HANDED_OVER success fg      — terminal, positive
    //   LAPSED      error fg        — terminal, needs review
    const chromatic = [colors.primary, colors.success, colors.error];
    const spends = Object.entries(colors.status).filter(
      ([, v]) =>
        chromatic.includes(v.fg as never) ||
        chromatic.includes(v.border as never) ||
        v.fill === colors.ink, // ink inversion
    );
    assert.deepEqual(
      spends.map(([k]) => k).sort(),
      ["AT_GATE", "HANDED_OVER", "LAPSED", "NEARBY"],
      "only these four states may spend colour",
    );
  });

  test("the remaining three states are carried by weight alone", () => {
    // This is what keeps a forty-row queue readable — if every state were
    // coloured, none would stand out.
    const chromatic = [colors.primary, colors.success, colors.error];
    for (const key of ["SCHEDULED", "EN_ROUTE", "CANCELLED"] as const) {
      const v = colors.status[key];
      assert.ok(!chromatic.includes(v.fg as never), `${key} fg must be neutral`);
      assert.ok(!chromatic.includes(v.border as never), `${key} border must be neutral`);
    }
  });

  test("the AI timeline pastels are never used for queue state", () => {
    // design.md: "never as system action colors".
    const pastels = Object.values(colors.timeline) as string[];
    for (const [key, v] of Object.entries(colors.status)) {
      for (const val of [v.fg, v.border, v.fill]) {
        assert.ok(!pastels.includes(val), `${key} uses a timeline pastel`);
      }
    }
  });
});

describe("fixtures — the cases that break naive code", () => {
  test("a driver collects children from several different families", () => {
    const driverAuths = fx.authorizations.filter(
      (a) => a.collector_user_id === "usr-d1" && !a.revoked_at,
    );
    const families = new Set(driverAuths.map((a) => a.granted_by_user_id));
    assert.ok(families.size >= 3, `expected ≥3 families, got ${families.size}`);
    assert.ok(driverAuths.length >= 5, "van should carry several children");
  });

  test("a driver's children span more than one class", () => {
    const van = fx.queue.find((q) => q.collector_role === "driver");
    assert.ok(van, "expected a van in the queue");
    const classes = new Set(van!.sibling_group.map((s) => s.class_name));
    assert.ok(classes.size > 1, "multi-class staging must be demonstrable");
  });

  test("revocation is per-family, not global", () => {
    const revoked = fx.authorizations.find((a) => a.revoked_at);
    assert.ok(revoked, "need a revoked authorization to prove scoping");
    const stillActive = fx.authorizations.filter(
      (a) => a.collector_user_id === revoked!.collector_user_id && !a.revoked_at,
    );
    assert.ok(
      stillActive.length > 0,
      "revoking one family must not remove the driver's other access",
    );
  });

  test("at least one sibling group shares a single trip", () => {
    const byTrip = new Map<string, number>();
    for (const r of fx.pickupRequests) {
      if (r.trip_id) byTrip.set(r.trip_id, (byTrip.get(r.trip_id) ?? 0) + 1);
    }
    assert.ok([...byTrip.values()].some((n) => n > 1), "one trip → many requests");
  });

  test("one classroom device is offline, so the silent-classroom path is visible", () => {
    assert.ok(fx.devices.some((d) => !d.online));
  });

  test("a flagged manual handover exists in the audit log", () => {
    const flagged = fx.auditLog.filter((l) => l.flagged);
    assert.ok(flagged.length > 0, "manual fallback must surface for review");
    assert.equal(fx.handovers[0]?.method, "manual");
  });
});

describe("queue ordering", () => {
  test("queue is ordered by live ETA, not booking time", async () => {
    const queue = await mockApi.getQueue();
    const withEta = queue.filter((q) => q.eta_seconds !== null);
    for (let i = 1; i < withEta.length; i++) {
      assert.ok(
        withEta[i]!.eta_seconds! >= withEta[i - 1]!.eta_seconds!,
        "a later position must not have a sooner ETA",
      );
    }
  });

  test("positions are contiguous from 1", async () => {
    const queue = await mockApi.getQueue();
    queue.forEach((q, i) => assert.equal(q.position, i + 1));
  });
});

describe("QR token batch", () => {
  test("tokens have staggered expiries so only one is valid at a time", async () => {
    const batch = await mockApi.getQrTokens("trp-01");
    for (let i = 1; i < batch.length; i++) {
      assert.ok(
        new Date(batch[i]!.exp).getTime() > new Date(batch[i - 1]!.exp).getTime(),
        "a forwarded screenshot must not unlock the whole batch",
      );
    }
  });

  test("KNOWN GAP: batch covers less than the 90-minute trip window (M7.1)", async () => {
    const batch = await mockApi.getQrTokens("trp-01");
    const coverageMin =
      (new Date(batch.at(-1)!.exp).getTime() - Date.now()) / 60_000;
    // Documents the defect rather than asserting it is fine. When M7.1 sizes
    // the batch to the trip window, flip this to `>= 90` and it should pass.
    assert.ok(
      coverageMin < 90,
      "batch now covers the full window — update this test and M7.1",
    );
  });
});

describe("mock API surface", () => {
  test("every declared method returns without throwing", async () => {
    const results = await Promise.all([
      mockApi.login({ phone: "+923331000001", password: "x" }),
      mockApi.me(),
      mockApi.listSchools(),
      mockApi.listClasses(),
      mockApi.listStudents(),
      mockApi.searchStudents("ali"),
      mockApi.listUsers(),
      mockApi.listVehicles(),
      mockApi.listAuthorizations(),
      mockApi.listPickupRequests(),
      mockApi.getQueue(),
      mockApi.listDevices(),
      mockApi.listNameAudio(),
      mockApi.listHandovers(),
      mockApi.listAuditLog(),
      mockApi.listAnnouncements(),
      mockApi.getWaitTimes(),
      mockApi.getOnTimeRate(),
      mockApi.getMyChildren(),
      mockApi.getMySchedules(),
      mockApi.getMyPickupRequests(),
      mockApi.getMyCollectors(),
      mockApi.getMyManifest(),
      mockApi.getMyTrip(),
      mockApi.getMyQueueEntry(),
      mockApi.getPrepList("cls-nur"),
    ]);
    assert.equal(results.length, 26);
    assert.ok(results.every((r) => r !== undefined));
  });

  test("student search is case-insensitive and scoped", async () => {
    const hits = await mockApi.searchStudents("ALI");
    assert.ok(hits.length > 0);
    assert.ok(hits.every((s) => s.name.toLowerCase().includes("ali")));
  });

  test("a parent only sees collectors they themselves granted", async () => {
    const mine = await mockApi.getMyCollectors();
    assert.ok(mine.length > 0);
    assert.ok(mine.every((a) => a.granted_by_user_id === fx.currentParent.id));
  });

  test("weekday collector varies — van on weekdays, parent on Friday", async () => {
    const schedules = await mockApi.getMySchedules();
    const collectors = new Set(schedules.map((s) => s.collector_id));
    assert.ok(collectors.size > 1, "per-weekday collector must be expressible");
  });
});
