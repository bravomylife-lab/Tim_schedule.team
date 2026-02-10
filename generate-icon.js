const fs = require('fs');
const path = require('path');

// Color definitions (RGBA)
const COLORS = {
  background: { r: 21, g: 101, b: 192, a: 255 },      // #1565C0
  headerBar: { r: 13, g: 71, b: 161, a: 255 },        // #0D47A1
  ringDot: { r: 244, g: 67, b: 54, a: 255 },          // #F44336
  white: { r: 255, g: 255, b: 255, a: 255 },
  lightBlue: { r: 100, g: 181, b: 246, a: 255 },      // #64B5F6
  transparent: { r: 0, g: 0, b: 0, a: 0 }
};

// Create BMP data from pixel array
function createBMP(width, height, pixels) {
  const rowSize = Math.floor((width * 4 + 3) / 4) * 4; // Each row must be multiple of 4 bytes
  const pixelDataSize = rowSize * height;
  const bmpHeaderSize = 40;
  const bmpSize = bmpHeaderSize + pixelDataSize + pixelDataSize / 8; // Add AND mask

  const buffer = Buffer.alloc(bmpSize);
  let offset = 0;

  // BITMAPINFOHEADER
  buffer.writeUInt32LE(40, offset); offset += 4;           // Header size
  buffer.writeInt32LE(width, offset); offset += 4;         // Width
  buffer.writeInt32LE(height * 2, offset); offset += 4;    // Height * 2 (for ICO)
  buffer.writeUInt16LE(1, offset); offset += 2;            // Planes
  buffer.writeUInt16LE(32, offset); offset += 2;           // Bits per pixel
  buffer.writeUInt32LE(0, offset); offset += 4;            // Compression
  buffer.writeUInt32LE(pixelDataSize, offset); offset += 4; // Image size
  buffer.writeInt32LE(0, offset); offset += 4;             // X pixels per meter
  buffer.writeInt32LE(0, offset); offset += 4;             // Y pixels per meter
  buffer.writeUInt32LE(0, offset); offset += 4;            // Colors used
  buffer.writeUInt32LE(0, offset); offset += 4;            // Important colors

  // Write pixel data (bottom to top, BGRA format)
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const pixel = pixels[y * width + x];
      buffer[offset++] = pixel.b;
      buffer[offset++] = pixel.g;
      buffer[offset++] = pixel.r;
      buffer[offset++] = pixel.a;
    }
    // Padding to align to 4 bytes
    while (offset % 4 !== 0) {
      buffer[offset++] = 0;
    }
  }

  // AND mask (all zeros for full alpha channel)
  const andMaskSize = Math.ceil(width / 8) * height;
  for (let i = 0; i < andMaskSize; i++) {
    buffer[offset++] = 0;
  }

  return buffer;
}

// Draw a filled circle
function drawCircle(pixels, width, height, cx, cy, radius, color) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        pixels[y * width + x] = color;
      }
    }
  }
}

// Draw a filled rectangle
function drawRect(pixels, width, height, x1, y1, x2, y2, color) {
  for (let y = y1; y <= y2 && y < height; y++) {
    for (let x = x1; x <= x2 && x < width; x++) {
      if (x >= 0 && y >= 0) {
        pixels[y * width + x] = color;
      }
    }
  }
}

// Draw letter "T"
function drawT(pixels, width, height, x, y, size, color) {
  const thickness = Math.max(1, Math.floor(size / 5));
  const topWidth = size;
  const stemWidth = thickness * 2;

  // Top bar of T
  drawRect(pixels, width, height,
    x - topWidth / 2, y,
    x + topWidth / 2, y + thickness - 1,
    color);

  // Vertical stem of T
  drawRect(pixels, width, height,
    x - stemWidth / 2, y,
    x + stemWidth / 2, y + size,
    color);
}

// Create icon of specific size
function createIcon(size) {
  const pixels = new Array(size * size);

  // Fill background
  pixels.fill(COLORS.background);

  // Scale factors
  const scale = size / 48; // Base design on 48x48

  // Header bar (top ~25%)
  const headerHeight = Math.floor(size * 0.25);
  drawRect(pixels, size, size, 0, 0, size - 1, headerHeight - 1, COLORS.headerBar);

  // Ring dots (binding rings at top)
  const ringRadius = Math.max(1, Math.floor(2 * scale));
  const ringY = Math.floor(headerHeight * 0.5);
  const ringSpacing = Math.floor(size * 0.3);

  drawCircle(pixels, size, size,
    Math.floor(size / 2 - ringSpacing / 2), ringY, ringRadius, COLORS.ringDot);
  drawCircle(pixels, size, size,
    Math.floor(size / 2 + ringSpacing / 2), ringY, ringRadius, COLORS.ringDot);

  // White divider line
  const dividerY = headerHeight;
  drawRect(pixels, size, size, 0, dividerY, size - 1, dividerY, COLORS.white);

  // Large "T" letter in center
  const letterSize = Math.floor(size * 0.35);
  const letterY = Math.floor(headerHeight + (size - headerHeight - letterSize) * 0.3);
  drawT(pixels, size, size, Math.floor(size / 2), letterY, letterSize, COLORS.white);

  // Small calendar grid dots at bottom
  if (size >= 32) {
    const gridSize = 4;
    const dotRadius = Math.max(1, Math.floor(1 * scale));
    const gridSpacing = Math.floor(size * 0.15);
    const gridStartY = Math.floor(size * 0.75);
    const gridStartX = Math.floor(size * 0.25);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < gridSize; col++) {
        const dotX = gridStartX + col * gridSpacing;
        const dotY = gridStartY + row * gridSpacing;
        if (dotY < size && dotX < size) {
          drawCircle(pixels, size, size, dotX, dotY, dotRadius, COLORS.lightBlue);
        }
      }
    }
  }

  return pixels;
}

// Create ICO file
function createICO(outputPath) {
  const sizes = [16, 32, 48, 256];
  const images = sizes.map(size => ({
    size,
    pixels: createIcon(size),
    bmp: null
  }));

  // Generate BMPs
  images.forEach(img => {
    img.bmp = createBMP(img.size, img.size, img.pixels);
  });

  // ICO header
  const headerSize = 6;
  const dirEntrySize = 16;
  const icoHeader = Buffer.alloc(headerSize);
  icoHeader.writeUInt16LE(0, 0);      // Reserved
  icoHeader.writeUInt16LE(1, 2);      // Type: 1 = ICO
  icoHeader.writeUInt16LE(images.length, 4); // Number of images

  // Directory entries
  let offset = headerSize + (dirEntrySize * images.length);
  const dirEntries = images.map(img => {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // Width (0 means 256)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // Height
    entry.writeUInt8(0, 2);              // Color palette
    entry.writeUInt8(0, 3);              // Reserved
    entry.writeUInt16LE(1, 4);           // Color planes
    entry.writeUInt16LE(32, 6);          // Bits per pixel
    entry.writeUInt32LE(img.bmp.length, 8); // Image size
    entry.writeUInt32LE(offset, 12);     // Offset to image data
    offset += img.bmp.length;
    return entry;
  });

  // Combine all parts
  const buffers = [icoHeader, ...dirEntries, ...images.map(img => img.bmp)];
  const icoBuffer = Buffer.concat(buffers);

  // Write to file
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`✓ ICO file created: ${outputPath}`);
  console.log(`  Sizes: ${sizes.join('x, ')}x`);
  console.log(`  Total size: ${icoBuffer.length} bytes`);
}

// Generate the icon
const outputPath = path.join(__dirname, 'tim-icon.ico');
createICO(outputPath);
