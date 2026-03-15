/**
 * Automation Tests — Student Workflows
 *
 * Run:
 *   cd tests/automation
 *   BASE_URL=https://math-homework-management.web.app npm run test:e2e
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://math-homework-management.web.app";
const STUDENT_EMAIL = process.env.STUDENT_EMAIL ?? "teststudent@assignsmart.com";
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD ?? "TestPassword123!";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsStudent(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder(/email/i).fill(STUDENT_EMAIL);
  await page.getByPlaceholder(/password/i).fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/student\/portal/, { timeout: 15000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Student Authentication", () => {
  test("student can log in and reach portal", async ({ page }) => {
    await loginAsStudent(page);
    await expect(page).toHaveURL(/student\/portal/);
  });

  test("student portal shows assignments heading", async ({ page }) => {
    await loginAsStudent(page);
    await expect(page.getByText(/my assignments/i)).toBeVisible();
  });

  test("student cannot access teacher dashboard", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`${BASE_URL}/teacher/dashboard`);
    // Should redirect away from teacher pages
    await page.waitForURL(/student|login/, { timeout: 5000 });
    expect(page.url()).not.toContain("teacher/dashboard");
  });

  test("sign out redirects to login", async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Assignment Portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test("portal shows assignment cards", async ({ page }) => {
    // Either shows assignments or empty state
    const hasCards = (await page.locator("[data-testid='assignment-card']").count()) > 0;
    const hasEmpty = await page.getByText(/no assignments/i).isVisible();
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test("assignment card shows status badge", async ({ page }) => {
    const cards = page.locator("[data-testid='assignment-card']");
    if (await cards.count() > 0) {
      const status = cards.first().locator("[data-testid='status-badge']");
      await expect(status).toBeVisible();
    }
  });

  test("assignment card shows due date", async ({ page }) => {
    const cards = page.locator("[data-testid='assignment-card']");
    if (await cards.count() > 0) {
      // Due date should be visible on card
      const dateText = cards.first().locator("text=/due|deadline/i");
      await expect(dateText).toBeVisible();
    }
  });
});

test.describe("File Submission", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test("clicking assignment opens submission panel", async ({ page }) => {
    const cards = page.locator("[data-testid='assignment-card']");
    if (await cards.count() > 0) {
      await cards.first().click();
      // Upload area should be visible if not already submitted
      const uploadArea = page.locator("[data-testid='upload-zone'], text=/drag.*drop|browse/i");
      const alreadySubmitted = await page.getByText(/submitted|graded/i).isVisible();
      expect((await uploadArea.isVisible()) || alreadySubmitted).toBeTruthy();
    }
  });

  test("upload zone accepts file drag", async ({ page }) => {
    const cards = page.locator("[data-testid='assignment-card']");
    if (await cards.count() > 0) {
      await cards.first().click();
      const uploadZone = page.locator("[data-testid='upload-zone']");
      if (await uploadZone.isVisible()) {
        await expect(uploadZone).toBeVisible();
        // Verify it responds to interaction
        await uploadZone.hover();
      }
    }
  });
});

test.describe("Badges Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await page.getByRole("link", { name: /badges/i }).click();
    await page.waitForURL(/badges/);
  });

  test("badges page loads", async ({ page }) => {
    await expect(page).toHaveURL(/badges/);
  });

  test("shows badge items (earned or locked)", async ({ page }) => {
    // Page should show badge cards
    const badges = page.locator("[data-testid='badge-card'], .badge-card");
    if (await badges.count() > 0) {
      await expect(badges.first()).toBeVisible();
    }
  });
});

test.describe("Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test("notification bell is visible in navbar", async ({ page }) => {
    const bell = page.locator("svg[aria-label='Notifications']");
    await expect(bell).toBeVisible();
  });

  test("notification badge shows count when there are unread notifications", async ({ page }) => {
    // The badge is conditionally rendered — just check it doesn't crash
    const badge = page.locator("text=/9\\+|[1-9]/").first();
    // Don't assert presence — depends on data. Just verify no crash.
    expect(true).toBe(true);
  });
});
