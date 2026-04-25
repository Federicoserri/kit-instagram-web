const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const HANDLE = 'elmercadotest';
const OUT_DIR = path.join(__dirname, 'assets');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        downloadImage(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  console.log(`Abriendo perfil de @${HANDLE}...`);
  await page.goto(`https://www.instagram.com/${HANDLE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Handle cookie/login dialogs
  const dismissSelectors = [
    'button:has-text("Rechazar")',
    'button:has-text("Decline")',
    'button:has-text("Only allow essential cookies")',
    'button:has-text("Allow essential and optional cookies")',
    'button:has-text("Not now")',
    'button:has-text("Ahora no")',
  ];
  for (const sel of dismissSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await page.waitForTimeout(1500);
      }
    } catch {}
  }

  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
    const title = document.querySelector('title')?.textContent || '';

    // Profile picture
    const profileImg = document.querySelector('img[data-testid="user-avatar"]')?.src
      || document.querySelector('header img')?.src
      || document.querySelector('img[alt*="foto"]')?.src
      || document.querySelector('img[alt*="profile"]')?.src
      || '';

    // Stats
    const statItems = Array.from(document.querySelectorAll('li'));
    let followers = '', following = '', posts = '';
    for (const li of statItems) {
      const text = li.innerText || '';
      const titleAttr = li.querySelector('[title]')?.getAttribute('title') || '';
      if (text.includes('seguidores') || text.includes('followers')) {
        followers = titleAttr || text.replace(/[^0-9.,KkMm]/g, '');
      }
      if (text.includes('seguidos') || text.includes('following')) {
        following = text.replace(/[^0-9.,KkMm]/g, '');
      }
      if (text.includes('publicacion') || text.includes('post')) {
        posts = titleAttr || text.replace(/[^0-9.,KkMm]/g, '');
      }
    }

    // Bio
    const bioEl = document.querySelector('span[class*="x1lliihq"]') ||
      document.querySelector('header section span') ||
      document.querySelector('div[class*="biography"]');
    const bio = bioEl?.innerText || metaDesc || '';

    // Username display
    const usernameEl = document.querySelector('h2') || document.querySelector('header h1');
    const displayName = usernameEl?.innerText || title.split('•')[0].trim();

    // Post images
    const imgs = Array.from(document.querySelectorAll('article img, main img'))
      .map(img => img.src)
      .filter(src => src && src.includes('instagram') && !src.includes('profile') && src.includes('http'))
      .slice(0, 9);

    // Links in bio
    const links = Array.from(document.querySelectorAll('a[href*="l.instagram.com"], a[href*="linktree"], a[href*="bio.link"]'))
      .map(a => a.href);

    return { displayName, bio, followers, following, posts, profileImg, postImages: imgs, links, metaDesc };
  });

  console.log('Datos extraídos:', JSON.stringify(data, null, 2));

  // Download profile picture
  if (data.profileImg) {
    try {
      await downloadImage(data.profileImg, path.join(OUT_DIR, 'profile.jpg'));
      console.log('Foto de perfil descargada');
    } catch (e) {
      console.log('No se pudo descargar foto de perfil:', e.message);
    }
  }

  // Download post images
  const savedPosts = [];
  for (let i = 0; i < data.postImages.length; i++) {
    const dest = path.join(OUT_DIR, `post_${i + 1}.jpg`);
    try {
      await downloadImage(data.postImages[i], dest);
      savedPosts.push(`assets/post_${i + 1}.jpg`);
      console.log(`Post ${i + 1} descargado`);
    } catch (e) {
      console.log(`No se pudo descargar post ${i + 1}:`, e.message);
    }
  }

  data.savedPostImages = savedPosts;
  fs.writeFileSync(path.join(__dirname, 'instagram-data.json'), JSON.stringify(data, null, 2));
  console.log('Datos guardados en instagram-data.json');

  await browser.close();
})();
