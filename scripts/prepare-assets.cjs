const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');

/** 使用项目已有漫画素材与 Logo，构建时离线压缩，运行时不再做滤镜运算。 */
async function main() {
  const imageDir = path.join(root, 'public/img');
  const buildDir = path.join(root, 'build');
  await fs.mkdir(buildDir, { recursive: true });

  const logo = path.join(root, 'logo.png');
  await sharp(logo)
    .resize(256, 256, { fit: 'contain', background: '#00000000' })
    .png()
    .toFile(path.join(imageDir, 'app-icon.png'));
  await sharp(logo)
    .resize(256, 256, { fit: 'contain', background: '#00000000' })
    .png()
    .toFile(path.join(buildDir, 'icon.png'));

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = await Promise.all(
    sizes.map((size) =>
      sharp(logo).resize(size, size, { fit: 'contain', background: '#00000000' }).png().toBuffer()
    )
  );
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;

  images.forEach((buffer, index) => {
    const entry = 6 + index * 16;
    header[entry] = sizes[index] % 256;
    header[entry + 1] = sizes[index] % 256;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(buffer.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });
  await fs.writeFile(path.join(buildDir, 'icon.ico'), Buffer.concat([header, ...images]));

  const panels = [
    { left: 0, top: 0, width: 590, height: 420, image: 2 },
    { left: 610, top: 0, width: 600, height: 710, image: 7 },
    { left: 1230, top: 0, width: 690, height: 530, image: 20 },
    { left: 0, top: 440, width: 590, height: 640, image: 5 },
    { left: 610, top: 730, width: 600, height: 350, image: 10 },
    { left: 1230, top: 550, width: 690, height: 530, image: 21 }
  ];
  const layers = await Promise.all(
    panels.map(async (panel) => ({
      left: panel.left,
      top: panel.top,
      input: await sharp(path.join(imageDir, `anime/${panel.image}.jpg`))
        .resize(panel.width, panel.height, { fit: 'cover', position: 'attention' })
        .grayscale()
        .toColourspace('srgb')
        .tint('#6e8298')
        .png()
        .toBuffer()
    }))
  );
  const screenTone = Buffer.from(
    '<svg width="1920" height="1080"><defs><pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#213b54" opacity=".16"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>'
  );
  await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#edf1f6' } })
    .composite([...layers, { input: screenTone }])
    .webp({ quality: 80 })
    .toFile(path.join(imageDir, 'manga-wallpaper.webp'));
  await sharp(path.join(imageDir, 'downloaded-image.jpg'))
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(imageDir, 'wallpaper.webp'));
  await sharp(path.join(imageDir, 'bg2.png'))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(imageDir, 'timeline.webp'));

  // 原生瀑布流保留视觉风格，只加载缩略版背景图。
  await fs.mkdir(path.join(imageDir, 'login'), { recursive: true });
  for (let index = 1; index <= 21; index++) {
    await sharp(path.join(imageDir, `anime/${index}.jpg`))
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(path.join(imageDir, `login/${index}.webp`));
  }
  console.log('漫画壁纸、登录缩略图与多尺寸 EXE 图标已生成。');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
