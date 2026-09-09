import { test, expect } from '@playwright/test';

test.describe('Organizer Event & Queue Lifecycle', () => {
  const uniqueId = Date.now();
  const testUser = {
    email: `organizer${uniqueId}@example.com`,
    password: 'Password123!',
    name: `Test Organizer ${uniqueId}`
  };

  test.beforeEach(async ({ page }) => {
    // Register and login before each test
    await page.goto('/register');
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/organizer\/dashboard/);
  });

  test('should create an event, progress to live, and create a queue', async ({ page }) => {
    // 1. Create Event
    await page.click('text="Create Event"');
    await expect(page).toHaveURL(/\/organizer\/events\/new/);
    
    await page.fill('input[name="name"]', 'My E2E Event');
    await page.fill('input[name="description"]', 'Event for automated tests');
    await page.fill('input[name="startAt"]', '2026-10-01T09:00');
    await page.fill('input[name="endAt"]', '2026-10-01T17:00');
    await page.click('button[type="submit"]:has-text("Create Event")');
    
    // Should navigate to event details page
    await expect(page).toHaveURL(/\/organizer\/events\/[a-zA-Z0-9-]+/);
    await expect(page.locator('h1')).toContainText('My E2E Event');
    
    // 2. Start Event (Draft -> Live)
    await page.click('button:has-text("Start Event")');
    // Wait for the Live badge
    await expect(page.locator('span', { hasText: 'LIVE' })).toBeVisible();

    // 3. Create Queue
    await page.click('button:has-text("Create Queue")');
    // Fill the dialog
    await page.fill('input[name="name"]', 'Main Entrance Queue');
    await page.click('button[type="submit"]:has-text("Create Queue")');

    // Wait for queue card to appear
    await expect(page.locator('text="Main Entrance Queue"')).toBeVisible();

    // 4. Navigate to Queue Management Page
    await page.click('text="Open Queue"');
    await expect(page).toHaveURL(/\/organizer\/events\/[a-zA-Z0-9-]+\/queues\/[a-zA-Z0-9-]+/);

    // Wait for queue page to fully load
    await expect(page.locator('h1', { hasText: 'Main Entrance Queue' })).toBeVisible({ timeout: 10000 });

    // 5. Pause Queue  
    await page.click('button:has-text("Pause Queue")');
    await expect(page.locator('span', { hasText: 'PAUSED' })).toBeVisible({ timeout: 10000 });

    // 6. Resume Queue
    await page.click('button:has-text("Resume Queue")');
    await expect(page.locator('span', { hasText: 'OPEN' })).toBeVisible({ timeout: 10000 });

    // 7. Complete Event — navigate to event details via breadcrumb
    await page.locator('nav[aria-label="Breadcrumb"] a', { hasText: 'Event' }).click();
    await expect(page.locator('h1')).toContainText('My E2E Event', { timeout: 10000 });
    await page.click('button:has-text("Complete Event")');
    await expect(page.locator('span', { hasText: 'COMPLETED' })).toBeVisible({ timeout: 10000 });
  });
});
