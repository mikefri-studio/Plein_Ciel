import { test, expect } from '@playwright/test';

test.describe('Tests de régression - Plein Ciel', () => {
  
  test('La page se charge et le titre est correct', async ({ page }) => {
    await page.goto('/');
    
    // Essaie plusieurs variantes de titre possibles
    const title = await page.title();
    console.log('Titre de la page:', title);
    
    // Vérifie que le titre contient "PLEIN CIEL" (case insensitive)
    await expect(title.toLowerCase()).toContain('plein ciel');
  });

  test('La carte météo s\'affiche correctement', async ({ page }) => {
    await page.goto('/');
    
    // Attends que la carte soit visible
    const mapContainer = page.locator('#map');
    await expect(mapContainer).toBeVisible();
  });

  test('Régression visuelle : capture d\'écran de l\'accueil', async ({ page }) => {
    // Désactive les animations pour éviter les faux positifs
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/');
    
    // Attends que la carte soit chargée
    await page.locator('#map').waitFor({ state: 'visible' });
    
    // Petit délai pour laisser le temps aux APIs de répondre
    await page.waitForTimeout(2000);
    
    // Prend la capture
    await expect(page).toHaveScreenshot('accueil-plein-ciel.png', {
      maxDiffPixels: 200,
      fullPage: true
    });
  });

});