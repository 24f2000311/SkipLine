import { test, expect } from '@playwright/test';

test.describe('Customer Journey Flow', () => {
  let queueId: string;
  let queueUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Create a queue as an organizer in a separate context
    const context = await browser.newContext();
    const page = await context.newPage();
    const uniqueId = Date.now();
    
    // Register
    await page.goto('/register');
    await page.fill('input[name="name"]', `Setup Org ${uniqueId}`);
    await page.fill('input[name="email"]', `setup${uniqueId}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/organizer\/dashboard/);

    // Create Event
    await page.click('text="Create Event"');
    await page.fill('input[name="name"]', 'Customer Flow Event');
    await page.fill('input[name="startAt"]', '2026-10-01T09:00');
    await page.fill('input[name="endAt"]', '2026-10-01T17:00');
    await page.click('button[type="submit"]:has-text("Create Event")');
    await page.waitForURL(/\/organizer\/events\/[a-zA-Z0-9-]+/);
    
    // Start Event
    await page.click('button:has-text("Start Event")');
    await expect(page.locator('span', { hasText: 'LIVE' })).toBeVisible();

    // Create Queue
    await page.click('button:has-text("Create Queue")');
    await page.fill('input[name="name"]', 'Customer Test Queue');
    await page.click('button[type="submit"]:has-text("Create Queue")');
    await expect(page.locator('text="Customer Test Queue"')).toBeVisible();

    // Go to Queue Page to get ID
    await page.click('text="Open Queue"');
    await page.waitForURL(/\/organizer\/events\/[a-zA-Z0-9-]+\/queues\/([a-zA-Z0-9-]+)/);
    
    // Extract queue ID from URL
    const url = page.url();
    const match = url.match(/\/queues\/([a-zA-Z0-9-]+)/);
    if (!match) throw new Error("Could not find queue ID in URL");
    queueId = match[1];
    queueUrl = `/q/${queueId}`;

    await context.close();
  });

  test('should join queue, restore session on refresh, and leave queue', async ({ page }) => {
    // 1. Open public queue page
    await page.goto(queueUrl);
    
    // Should see Join Queue form
    await expect(page.locator('h1')).toContainText('Customer Test Queue');
    await expect(page.getByText('Join Queue')).toBeVisible();

    // 2. Join Queue
    await page.fill('input#name', 'Test Customer');
    await page.click('button[type="submit"]:has-text("Join Queue")');

    // Should transition to WAITING state
    await expect(page.getByText("You're in line")).toBeVisible();
    await expect(page.locator('text="A-001"')).toBeVisible();

    // 3. Refresh page (Session Restoration)
    await page.reload();
    
    // Should still be in WAITING state, not Join form
    await expect(page.getByText("You're in line")).toBeVisible();
    await expect(page.locator('text="A-001"')).toBeVisible();

    // 4. Leave Queue
    await page.click('button:has-text("Leave Queue")');
    // Confirm Dialog
    await page.click('button:has-text("Yes, leave queue")');

    // Should transition to CANCELLED state
    await expect(page.locator('text="You left"')).toBeVisible();
    await expect(page.getByText('Your place in line has been cancelled.')).toBeVisible();
    
    // Click Done
    await page.click('button:has-text("Done")');
    
    // Should go back to Join form
    await expect(page.getByText('Join Queue', { exact: true })).toBeVisible();
  });
});
