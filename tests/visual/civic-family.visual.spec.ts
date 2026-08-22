import { expect, test } from '@playwright/test';

const applications = [
  { id: 'cab', url: 'http://127.0.0.1:4303/' },
  { id: 'web', url: 'http://127.0.0.1:4304/' },
  { id: 'xrp', url: 'http://127.0.0.1:4305/' },
  { id: 'flow', url: 'http://127.0.0.1:4306/' },
] as const;

for (const application of applications) {
  test(`${application.id} retains the shared Lunar and Solar visual contract`, async ({ page }) => {
    await page.goto(application.url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}' });
    await expect(page).toHaveScreenshot(`${application.id}-lunar.png`);
    await page.getByRole('button', { name: 'Use light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-mw-theme', 'solar');
    await expect(page).toHaveScreenshot(`${application.id}-solar.png`);
  });
}
