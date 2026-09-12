import { test, expect } from '@playwright/test';

test.describe('Organizer Account Deletion & Data Isolation E2E', () => {
  const timestamp = Date.now();
  const organizerA = {
    name: 'Delete Test Organizer A',
    email: `org-del-a-${timestamp}@test.com`,
    password: 'Password123!',
    eventName: `Account A Delete Target Event ${timestamp}`,
  };

  const organizerB = {
    name: 'Clean Organizer B',
    email: `org-del-b-${timestamp}@test.com`,
    password: 'Password123!',
  };

  test('organizer can delete account with password, client state is torn down, and subsequent login sees no stale data', async ({ page }) => {
    // ==========================================
    // 1. Register & Login as Organizer A
    // ==========================================
    await page.goto('/register');
    await page.fill('input[name="name"]', organizerA.name);
    await page.fill('input[name="email"]', organizerA.email);
    await page.fill('input[name="password"]', organizerA.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // Verify email for Organizer A via test helper
    await page.request.post('http://localhost:8123/api/v1/auth/test-verify', {
      data: { email: organizerA.email },
    });
    await page.reload();
    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // Create Organizer A's event
    await page.click('text="Create Event"');
    await expect(page).toHaveURL(/\/organizer\/events\/new/);
    await page.fill('input[name="name"]', organizerA.eventName);
    await page.fill('input[name="description"]', 'Confidential Event destined for deletion');

    const now = new Date();
    const pastDate = new Date(now.getTime() - 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDate = `${pastDate.getFullYear()}-${pad(pastDate.getMonth() + 1)}-${pad(pastDate.getDate())}`;
    const startTime = `${pad(pastDate.getHours())}:${pad(pastDate.getMinutes())}`;
    const endDate = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`;
    const endTime = `${pad(futureDate.getHours())}:${pad(futureDate.getMinutes())}`;

    await page.fill('input[name="startDate"]', startDate);
    await page.fill('input[name="startTime"]', startTime);
    await page.fill('input[name="endDate"]', endDate);
    await page.fill('input[name="endTime"]', endTime);
    await page.click('button[type="submit"]:has-text("Create Event")');

    // Confirm redirected to event details and Event A exists
    await expect(page).toHaveURL(/\/organizer\/events\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole('heading', { name: organizerA.eventName })).toBeVisible();

    // Navigate to Settings page
    await page.click('a[href="/organizer/settings"]');
    await expect(page).toHaveURL(/\/organizer\/settings/);

    // Verify profile details and danger zone
    await expect(page.locator('text="Organizer Profile"')).toBeVisible();
    await expect(page.locator(`text="${organizerA.email}"`)).toBeVisible();
    await expect(page.locator('text="Danger Zone"')).toBeVisible();

    // Click "Delete Account" button
    await page.click('button:has-text("Delete Account")');

    // Confirmation dialog must appear
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text="Delete your Skipline account?"')).toBeVisible();

    // Attempt deletion with wrong password
    const passwordInput = dialog.locator('#delete-account-password');
    await passwordInput.fill('WrongPassword999!');
    await dialog.locator('button:has-text("Delete my account permanently")').click();

    // Verify error message is shown
    await expect(dialog.locator('div[role="alert"]')).toBeVisible();

    // Now enter the correct password
    await passwordInput.fill(organizerA.password);
    await dialog.locator('button:has-text("Delete my account permanently")').click();

    // Must redirect to landing page '/'
    await expect(page).toHaveURL('/');

    // Verify localStorage auth storage is cleared
    const authStorage = await page.evaluate(() => localStorage.getItem('skipline-auth-storage'));
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      expect(parsed.state?.user).toBeNull();
      expect(parsed.state?.accessToken).toBeNull();
    }

    // ==========================================
    // 2. Attempt Login with Deleted Account A
    // ==========================================
    await page.goto('/login');
    await page.fill('input[name="email"]', organizerA.email);
    await page.fill('input[name="password"]', organizerA.password);
    await page.click('button[type="submit"]');

    // Login must fail
    await expect(page.locator('text=/Email or password is incorrect/i')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // ==========================================
    // 3. Register & Login as Organizer B (Isolation Check)
    // ==========================================
    await page.goto('/register');
    await page.fill('input[name="name"]', organizerB.name);
    await page.fill('input[name="email"]', organizerB.email);
    await page.fill('input[name="password"]', organizerB.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // CRITICAL: Account B's dashboard must NEVER display Account A's event
    await expect(page.locator(`text="${organizerA.eventName}"`)).not.toBeVisible();

    // Account B must see empty state
    await expect(page.locator('text=/Your first event starts here/i')).toBeVisible();
  });
});
