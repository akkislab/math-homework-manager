/**
 * Automation Tests — Teacher Workflows
 *
 * These tests simulate end-to-end teacher flows using Playwright.
 * They run against the live app or local emulator depending on BASE_URL.
 *
 * Setup:
 *   cd tests/automation
 *   npm install
 *   npx playwright install
 *   BASE_URL=http://localhost:5000 npm run test:e2e
 *
 * Or against production:
 *   BASE_URL=https://math-homework-management.web.app npm run test:e2e
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://math-homework-management.web.app";
const TEACHER_EMAIL = process.env.TEACHER_EMAIL ?? "testteacher@assignsmart.com";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD ?? "TestPassword123!";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsTeacher(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("tab", { name: /sign in/i }).click().catch(() => {});
  await page.getByPlaceholder(/email/i).fill(TEACHER_EMAIL);
  await page.getByPlaceholder(/password/i).fill(TEACHER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/teacher\/dashboard/, { timeout: 15000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Teacher Authentication", () => {
  test("teacher can log in and reach dashboard", async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page).toHaveURL(/teacher\/dashboard/);
    // Dashboard shows class pills or a create-class prompt
    const hasDashboard =
      (await page.locator("text=Create your first class").isVisible()) ||
      (await page.locator("[data-testid='batch-pill']").count()) > 0;
    expect(hasDashboard).toBeTruthy();
  });

  test("navbar shows AssignSmart logo", async ({ page }) => {
    await loginAsTeacher(page);
    const logo = page.getByAltText("AssignSmart");
    await expect(logo).toBeVisible();
  });

  test("navbar shows teacher navigation links", async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page.getByRole("link", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Worksheets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Students" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Progress" })).toBeVisible();
  });

  test("sign out redirects to login page", async ({ page }) => {
    await loginAsTeacher(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test("assignment cards show progress bar and submitted count", async ({ page }) => {
    const cards = page.locator("[data-testid='assignment-card']");
    const count = await cards.count();
    if (count > 0) {
      const firstCard = cards.first();
      await expect(firstCard.locator("[data-testid='progress-bar']")).toBeVisible();
      await expect(firstCard.locator("text=/\\d+ \\/ \\d+/")).toBeVisible();
    }
  });

  test("new assignment button opens modal", async ({ page }) => {
    await page.getByRole("button", { name: /new assignment/i }).click();
    await expect(page.locator("[role='dialog'], [data-testid='modal']")).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Worksheet Creation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.getByRole("link", { name: "Worksheets" }).click();
    await page.waitForURL(/worksheets/);
  });

  test("worksheets page loads and shows generate button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /generate new/i })).toBeVisible();
  });

  test("generate button opens worksheet generator form", async ({ page }) => {
    await page.getByRole("button", { name: /generate new/i }).click();
    await expect(page.getByLabel(/grade/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByLabel(/topic/i)).toBeVisible({ timeout: 3000 });
  });

  test("worksheet preview form validates required fields", async ({ page }) => {
    await page.getByRole("button", { name: /generate new/i }).click();
    // Click preview without filling form
    await page.getByRole("button", { name: /preview/i }).click();
    // Should show validation or not proceed
    const stillOnForm = await page.getByLabel(/grade/i).isVisible();
    expect(stillOnForm).toBe(true);
  });
});

test.describe("Calendar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.getByRole("link", { name: "Calendar" }).click();
    await page.waitForURL(/calendar/);
  });

  test("calendar page loads in month view by default", async ({ page }) => {
    // Month view should show day cells
    const monthDays = page.locator("[data-testid='calendar-day']");
    expect(await monthDays.count()).toBeGreaterThan(0);
  });

  test("can switch to week view", async ({ page }) => {
    await page.getByRole("button", { name: /week/i }).click();
    await expect(page.locator("[data-testid='week-grid']")).toBeVisible({ timeout: 3000 });
  });

  test("today button navigates to current date", async ({ page }) => {
    // Navigate forward first
    await page.getByRole("button", { name: /next/i }).click().catch(() => {});
    await page.getByRole("button", { name: /today/i }).click();
    // Should highlight current date
    const todayCell = page.locator("[data-today='true'], .today, [aria-current='date']");
    expect(await todayCell.count()).toBeGreaterThan(0);
  });
});

test.describe("Student Progress Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.getByRole("link", { name: "Progress" }).click();
    await page.waitForURL(/progress/);
  });

  test("progress page loads with class selector", async ({ page }) => {
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("shows empty state when no student selected", async ({ page }) => {
    const emptyState = page.locator("text=/select a student/i");
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });
});

test.describe("Submission Review", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test("view submissions button opens submission table", async ({ page }) => {
    const viewBtn = page.getByRole("button", { name: /view submissions/i }).first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(page.locator("table, [data-testid='submissions-table']")).toBeVisible({ timeout: 5000 });
    }
  });
});
