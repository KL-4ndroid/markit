/**
 * PWA 圖示生成腳本
 * 從 logo.png 生成所有需要的 PWA 圖示尺寸
 * 
 * 使用方式：
 * 1. 確保 logo.png 在專案根目錄
 * 2. 執行: node scripts/generate-icons.js
 * 
 * 需要安裝: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 需要生成的圖示尺寸
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// 路徑設定
const LOGO_PATH = path.join(__dirname, '..', 'logo.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  try {
    // 檢查 logo.png 是否存在
    if (!fs.existsSync(LOGO_PATH)) {
      console.error('❌ 找不到 logo.png，請將您的 LOGO 放在專案根目錄');
      console.log('📍 預期位置:', LOGO_PATH);
      process.exit(1);
    }

    // 建立輸出目錄
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log('✅ 建立目錄:', OUTPUT_DIR);
    }

    console.log('🎨 開始生成 PWA 圖示...\n');

    // 讀取原始圖片
    const image = sharp(LOGO_PATH);
    const metadata = await image.metadata();
    
    console.log(`📐 原始圖片尺寸: ${metadata.width}x${metadata.height}`);
    console.log(`📦 格式: ${metadata.format}\n`);

    // 生成各種尺寸的圖示
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
      
      await sharp(LOGO_PATH)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ 生成: icon-${size}x${size}.png`);
    }

    // 生成 favicon
    const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
    await sharp(LOGO_PATH)
      .resize(32, 32)
      .toFile(faviconPath);
    
    console.log(`✅ 生成: favicon.ico`);

    // 生成 Apple Touch Icon
    const appleTouchIconPath = path.join(__dirname, '..', 'public', 'apple-touch-icon.png');
    await sharp(LOGO_PATH)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(appleTouchIconPath);
    
    console.log(`✅ 生成: apple-touch-icon.png`);

    console.log('\n🎉 所有圖示生成完成！');
    console.log('\n📋 生成的檔案：');
    console.log(`   - ${ICON_SIZES.length} 個 PWA 圖示 (public/icons/)`);
    console.log(`   - 1 個 favicon (public/favicon.ico)`);
    console.log(`   - 1 個 Apple Touch Icon (public/apple-touch-icon.png)`);

  } catch (error) {
    console.error('❌ 生成圖示時發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行生成
generateIcons();
