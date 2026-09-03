import { expect, test } from '@playwright/test';

test('public landing, docs, demo, and health are available', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Get device locations');
  await expect(page.getByRole('link', { name: /try the read-only demo/i })).toBeVisible();

  await page.goto('/demo');
  await expect(page.getByText(/synthetic · read only/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sf delivery van/i })).toBeVisible();

  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: /build your tracking console/i })).toBeVisible();

  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: 'healthy', database: 'connected' });
});

test('private APIs return JSON 401 instead of a login redirect', async ({ request }) => {
  const response = await request.get('/api/devices', { maxRedirects: 0 });
  expect(response.status()).toBe(401);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(await response.json()).toEqual({ error: 'Unauthorized' });
});

test('setup, login, and private console work end to end', async ({ page, request }) => {
  const setupStatus = await request.get('/api/auth/setup');
  const { needsSetup } = await setupStatus.json();
  if (needsSetup) {
    const setup = await request.post('/api/auth/setup', {
      data: {
        username: 'beta-admin',
        password: 'correct-horse-battery-staple',
        mapProvider: 'OPENFREEMAP',
      },
    });
    expect(setup.ok()).toBeTruthy();
  }

  await page.goto('/login?next=/app');
  await page.getByLabel('Username').fill('beta-admin');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('main').getByRole('heading', { name: /no devices yet/i })).toBeVisible();
});
