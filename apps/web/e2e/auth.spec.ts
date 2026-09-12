import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  const uniqueId = Date.now();
  const testUser = {
    email: `organizer${uniqueId}@example.com`,
    password: 'Password123!',
    name: `Test Organizer ${uniqueId}`
  };

  test('should register a new organizer successfully', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    
    await page.click('button[type="submit"]');
    
    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/organizer\/dashboard/);
    await expect(page.getByRole('button', { name: 'Create Event' }).first()).toBeVisible();
  });

  test('should login an existing organizer successfully', async ({ page }) => {
    // First register
    await page.goto('/register');
    const loginUser = {
      email: `loginuser${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Login User'
    };
    await page.fill('input[name="name"]', loginUser.name);
    await page.fill('input[name="email"]', loginUser.email);
    await page.fill('input[name="password"]', loginUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/organizer\/dashboard/);
    
    // Logout
    await page.click('button:has-text("Login User")');
    await page.click('text="Sign out"');
    await expect(page).toHaveURL(/\/login/);

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', loginUser.email);
    await page.fill('input[name="password"]', loginUser.password);
    await page.click('button[type="submit"]');

    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/organizer\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Error message should appear
    await expect(page.getByText('Email or password is incorrect. Please try again.')).toBeVisible();
    // URL shouldn't change
    await expect(page).toHaveURL(/\/login/);
  });

  test('unverified organizer sees setup banner and clicking Create Event opens verification dialog', async ({ page }) => {
    const unverifiedEmail = `unverified${Date.now()}@example.com`;
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Unverified Organizer');
    await page.fill('input[name="email"]', unverifiedEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/organizer\/dashboard/);

    // Should display the branded setup banner
    await expect(page.getByText('Verify your email', { exact: true })).toBeVisible();
    await expect(page.getByText('Your account is ready, but you need to verify your email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible();

    // Clicking "Create Event" should open the VerificationRequiredDialog
    await page.getByRole('button', { name: 'Create Event' }).first().click();
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await expect(page.getByText(unverifiedEmail)).toBeVisible();
    await expect(page.getByRole('button', { name: "I'll do this later" })).toBeVisible();

    // Dismiss dialog
    await page.getByRole('button', { name: "I'll do this later" }).click();

    // Now simulate email verification
    await page.request.post('http://localhost:8123/api/v1/auth/test-verify', {
      data: { email: unverifiedEmail },
    });
    await page.reload();

    // Banner should disappear and clicking Create Event navigates to /organizer/events/new
    await expect(page.getByText('Your account is ready, but you need to verify your email')).not.toBeVisible();
    await page.getByRole('button', { name: 'Create Event' }).first().click();
    await expect(page).toHaveURL(/\/organizer\/events\/new/);
  });
});
