import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const projectRoot = path.resolve(root, '..');
const brandingDir = path.join(projectRoot, 'shared', 'branding');
const appAssetsDir = path.join(root, 'assets');
const adminPublicBrandingDir = path.join(projectRoot, 'fitpass-admin', 'public', 'branding');
const adminAppDir = path.join(projectRoot, 'fitpass-admin', 'app');

const iconSvgPath = path.join(brandingDir, 'fitpass-icon-option-1.svg');
const logoSvgPath = path.join(brandingDir, 'fitpass-logo-option-1.svg');

async function ensureDirs() {
  await fs.mkdir(appAssetsDir, { recursive: true });
  await fs.mkdir(adminPublicBrandingDir, { recursive: true });
}

async function generateMobileAssets() {
  const iconSvg = await fs.readFile(iconSvgPath);
  const logoSvg = await fs.readFile(logoSvgPath);

  await sharp(iconSvg).resize(1024, 1024).png().toFile(path.join(appAssetsDir, 'icon.png'));
  await sharp(iconSvg).resize(1024, 1024).png().toFile(path.join(appAssetsDir, 'adaptive-icon.png'));
  await sharp(iconSvg).resize(256, 256).png().toFile(path.join(appAssetsDir, 'favicon.png'));

  // Build a splash image with a white background and centered horizontal logo.
  const splashWidth = 1242;
  const splashHeight = 2436;
  const logoOverlay = await sharp(logoSvg)
    .resize(820, 250, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: splashWidth,
      height: splashHeight,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([
      {
        input: logoOverlay,
        left: Math.round((splashWidth - 820) / 2),
        top: Math.round((splashHeight - 250) / 2),
      },
    ])
    .png()
    .toFile(path.join(appAssetsDir, 'splash.png'));
}

async function copyAdminAssets() {
  await fs.copyFile(logoSvgPath, path.join(adminPublicBrandingDir, 'fitpass-logo.svg'));
  await fs.copyFile(iconSvgPath, path.join(adminPublicBrandingDir, 'fitpass-icon.svg'));

  // Next.js App Router supports app/icon.svg as the primary site icon.
  await fs.copyFile(iconSvgPath, path.join(adminAppDir, 'icon.svg'));
}

async function main() {
  await ensureDirs();
  await generateMobileAssets();
  await copyAdminAssets();
  console.log('FitPass option 1 branding assets generated successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
