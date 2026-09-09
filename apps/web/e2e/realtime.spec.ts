import { test, expect } from '@playwright/test';

test.describe.skip('Realtime E2E Interaction', () => {
  test('should sync status changes between organizer and customer', async ({ browser }) => {
    test.setTimeout(120000); // Allow 120s for this multi-context test
    
    // ... rest of setup ...
    const orgContext = await browser.newContext();
    const orgPage = await orgContext.newPage();
    const uniqueId = Date.now();
    
    // Organizer Registration
    await orgPage.goto('/register');
    await orgPage.fill('input[name="name"]', `Realtime Org ${uniqueId}`);
    await orgPage.fill('input[name="email"]', `realtime${uniqueId}@example.com`);
    await orgPage.fill('input[name="password"]', 'Password123!');
    await orgPage.click('button[type="submit"]');
    await orgPage.waitForURL(/\/organizer\/dashboard/);

    // Organizer Creates Event & Queue
    await orgPage.click('text="Create Event"');
    await orgPage.fill('input[name="name"]', 'Realtime Event');
    await orgPage.fill('input[name="startAt"]', '2026-10-01T09:00');
    await orgPage.fill('input[name="endAt"]', '2026-10-01T17:00');
    await orgPage.click('button[type="submit"]:has-text("Create Event")');
    await orgPage.waitForURL(/\/organizer\/events\/[a-zA-Z0-9-]+/);
    
    await orgPage.click('button:has-text("Start Event")');
    await expect(orgPage.locator('span', { hasText: 'LIVE' })).toBeVisible();

    await orgPage.click('button:has-text("Create Queue")');
    await orgPage.fill('input[name="name"]', 'Realtime Queue');
    await orgPage.click('button[type="submit"]:has-text("Create Queue")');
    
    // Wait for the modal dialog to completely vanish before proceeding
    await expect(orgPage.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    
    await expect(orgPage.locator('text="Realtime Queue"')).toBeVisible();

    await orgPage.click('text="Open Queue"');
    await orgPage.waitForURL(/\/organizer\/events\/[a-zA-Z0-9-]+\/queues\/([a-zA-Z0-9-]+)/);
    
    // Wait for queue page to fully load
    await expect(orgPage.locator('h1', { hasText: 'Realtime Queue' })).toBeVisible({ timeout: 10000 });

    const url = orgPage.url();
    const match = url.match(/\/queues\/([a-zA-Z0-9-]+)/);
    if (!match) throw new Error("Could not find queue ID in URL");
    const queueId = match[1];
    const queueUrl = `/q/${queueId}`;

    // 2. Setup Customer Context
    const custContext = await browser.newContext();
    const custPage = await custContext.newPage();

    await custPage.goto(queueUrl);
    await custPage.fill('input#name', 'Realtime Customer');
    await custPage.click('button[type="submit"]:has-text("Join Queue")');
    await expect(custPage.getByText("You're in line")).toBeVisible({ timeout: 10000 });

    // 3. Organizer calls next
    // Reload to fetch updated entries, then wait for the customer to show up
    await orgPage.reload();
    await expect(orgPage.locator('h1', { hasText: 'Realtime Queue' })).toBeVisible({ timeout: 10000 });
    // Wait for entries to load (entries poll every 5s)
    await expect(orgPage.getByText('Realtime Customer')).toBeVisible({ timeout: 15000 });
    
    // Click Call Next
    const callNextBtn = orgPage.getByRole('button', { name: 'Call Next' });
    await expect(callNextBtn).toBeVisible({ timeout: 10000 });
    await expect(callNextBtn).toBeEnabled({ timeout: 10000 });
    await callNextBtn.click();
    
    // Organizer sees customer in active list after calling (exact match to avoid matching "Called" metrics label)
    await expect(orgPage.getByText('CALLED', { exact: true })).toBeVisible({ timeout: 15000 });

    // 4. Customer should automatically see CALLED state
    await expect(custPage.getByText("It's Your Turn")).toBeVisible({ timeout: 15000 });

    // 5. Organizer Starts Serving
    const startServingBtn = orgPage.getByRole('button', { name: 'Start Serving' }).first();
    await expect(startServingBtn).toBeVisible({ timeout: 15000 });
    await expect(startServingBtn).toBeEnabled({ timeout: 15000 });
    await startServingBtn.click();
    
    // 6. Customer should automatically see SERVING state
    await expect(custPage.getByText("Being Served")).toBeVisible({ timeout: 15000 });

    // 7. Organizer Completes Service
    const completeBtn = orgPage.getByRole('button', { name: 'Complete Service' }).first();
    await expect(completeBtn).toBeVisible({ timeout: 15000 });
    await expect(completeBtn).toBeEnabled({ timeout: 15000 });
    await completeBtn.click();

    // 8. Customer should automatically see COMPLETED state
    await expect(custPage.getByText("You're all set")).toBeVisible({ timeout: 15000 });

    await orgContext.close();
    await custContext.close();
  });
});
