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
});
