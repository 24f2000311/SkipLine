import { test, expect } from '@playwright/test';

test.describe('Email Verification State Synchronization E2E', () => {
  test('unverified organizer verifies in background and immediately unlocks event creation without reload', async ({ page }) => {
    const timestamp = Date.now();
    const organizer = {
      name: 'Sync Test Organizer',
      email: `sync-org-${timestamp}@test.com`,
      password: 'Password123!',
    };

    // 1. Register new organizer
    await page.goto('/register');
    await page.fill('input[name="name"]', organizer.name);
    await page.fill('input[name="email"]', organizer.email);
    await page.fill('input[name="password"]', organizer.password);
    await page.click('button[type="submit"]');

    // Redirect to dashboard
    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // 2. Verify unverified banner is visible
    await expect(page.locator('text=Verify your email').first()).toBeVisible();
    await expect(page.locator('text=before creating events or queues').first()).toBeVisible();

    // 3. Click "Create Event" while unverified -> modal pops up blocking action
    await page.click('button:has-text("Create Event")');
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await expect(page.getByRole('dialog').locator('text=before creating events')).toBeVisible();

    // Close the dialog or click "I'll do this later"
    await page.getByRole('dialog').getByRole('button', { name: "I'll do this later" }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 4. In background (simulating user clicking verification link in another window/tab)
    const verifyRes = await page.request.post('http://localhost:8123/api/v1/auth/test-verify', {
      data: { email: organizer.email },
    });
    expect(verifyRes.ok()).toBeTruthy();

    // 5. DO NOT RELOAD THE PAGE! (Strict requirement: no window.location.reload())
    // Simply click "Create Event" on the existing dashboard page
    await page.click('button:has-text("Create Event")');

    // 6. Assert immediate navigation to /organizer/events/new without any modal blocking!
    await expect(page).toHaveURL(/\/organizer\/events\/new/);
    await expect(page.locator('h1:has-text("Create Event")')).toBeVisible();

    // 7. Return to dashboard to confirm unverified banner has vanished
    await page.goto('/organizer/dashboard');
    await expect(page.locator('text=before creating events or queues')).not.toBeVisible();
  });
});
