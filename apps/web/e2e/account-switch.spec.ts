import { test, expect } from '@playwright/test';

test.describe('Account Switch Isolation Security E2E', () => {
  const timestamp = Date.now();
  const organizerA = {
    name: 'Organizer Alpha',
    email: `organizer-a-${timestamp}@test.com`,
    password: 'Password123!',
    eventName: `A Private Event ${timestamp}`,
  };

  const organizerB = {
    name: 'Organizer Beta',
    email: `organizer-b-${timestamp}@test.com`,
    password: 'Password123!',
    eventName: `B Private Event ${timestamp}`,
  };

  test('switching between accounts strictly isolates dashboard events and empty state', async ({ page }) => {
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

    // Create Organizer A's private event
    await page.click('text="Create Event"');
    await expect(page).toHaveURL(/\/organizer\/events\/new/);
    await page.fill('input[name="name"]', organizerA.eventName);
    await page.fill('input[name="description"]', 'Confidential Event for Organizer A');

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

    // Confirm redirected to event details
    await expect(page).toHaveURL(/\/organizer\/events\/[a-zA-Z0-9-]+/);

    // Navigate back to Organizer A's dashboard and confirm event is visible
    await page.goto('/organizer/dashboard');
    await expect(page.getByText(organizerA.eventName)).toBeVisible();

    // ==========================================
    // 2. Sign Out Organizer A
    // ==========================================
    await page.click(`button:has-text("${organizerA.name}")`);
    await page.click('text="Sign out"');
    await expect(page).toHaveURL(/\/login/);

    // ==========================================
    // 3. Register & Login as Organizer B (0 Events)
    // ==========================================
    await page.goto('/register');
    await page.fill('input[name="name"]', organizerB.name);
    await page.fill('input[name="email"]', organizerB.email);
    await page.fill('input[name="password"]', organizerB.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // Verify email for Organizer B
    await page.request.post('http://localhost:8123/api/v1/auth/test-verify', {
      data: { email: organizerB.email },
    });
    await page.reload();
    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // ==========================================
    // 4. CRITICAL PRIVACY & SECURITY ASSERTIONS
    // ==========================================
    // Organizer B has 0 events and must see the clean empty state
    await expect(page.getByText(/Your first event starts here/i)).toBeVisible();

    // MUST NEVER RENDER ORGANIZER A's EVENT
    await expect(page.getByText(organizerA.eventName)).not.toBeVisible();

    // ==========================================
    // 5. Create Event for Organizer B
    // ==========================================
    await page.click('text="Create Event"');
    await expect(page).toHaveURL(/\/organizer\/events\/new/);
    await page.fill('input[name="name"]', organizerB.eventName);
    await page.fill('input[name="description"]', 'Confidential Event for Organizer B');
    await page.fill('input[name="startDate"]', startDate);
    await page.fill('input[name="startTime"]', startTime);
    await page.fill('input[name="endDate"]', endDate);
    await page.fill('input[name="endTime"]', endTime);
    await page.click('button[type="submit"]:has-text("Create Event")');

    await expect(page).toHaveURL(/\/organizer\/events\/[a-zA-Z0-9-]+/);

    // Return to dashboard
    await page.goto('/organizer/dashboard');
    await expect(page.getByText(organizerB.eventName)).toBeVisible();
    await expect(page.getByText(organizerA.eventName)).not.toBeVisible();

    // ==========================================
    // 6. Sign Out Organizer B and Login as A Again
    // ==========================================
    await page.click(`button:has-text("${organizerB.name}")`);
    await page.click('text="Sign out"');
    await expect(page).toHaveURL(/\/login/);

    await page.fill('input[name="email"]', organizerA.email);
    await page.fill('input[name="password"]', organizerA.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // Confirm Organizer A sees only their event and never Organizer B's event
    await expect(page.getByText(organizerA.eventName)).toBeVisible();
    await expect(page.getByText(organizerB.eventName)).not.toBeVisible();
  });
});
