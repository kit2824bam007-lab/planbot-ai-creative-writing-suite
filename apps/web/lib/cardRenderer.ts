/**
 * Pure Canvas Card Renderer (lib/cardRenderer.ts)
 * Renders high-DPI social media cards with 8 distinct aesthetic themes,
 * auto-shrinking typography, Kolam decorative borders, and watermark.
 */

export interface CardRenderOptions {
  text: string;
  templateId: string;
  aspectRatio: 'square' | 'story'; // square: 1080x1080, story: 1080x1920
  authorName?: string;
  themeTitle?: string;
}

export interface CardTemplateConfig {
  id: string;
  name: string;
  bgType: 'solid' | 'gradient';
  bgColors: string[];
  gradientAngle?: number;
  textColor: string;
  accentColor: string;
  hasKolamBorder?: boolean;
  fontFamily: string;
  isGradientText?: boolean;
}

export const CARD_TEMPLATES: Record<string, CardTemplateConfig> = {
  'midnight-glow': {
    id: 'midnight-glow',
    name: 'Midnight Glow',
    bgType: 'gradient',
    bgColors: ['#0F172A', '#1E1B4B', '#311042'],
    gradientAngle: 135,
    textColor: '#F8FAFC',
    accentColor: '#A855F7',
    fontFamily: 'Playfair Display, serif'
  },
  'golden-hour': {
    id: 'golden-hour',
    name: 'Golden Hour',
    bgType: 'gradient',
    bgColors: ['#FFEDD5', '#FED7AA', '#FDBA74'],
    gradientAngle: 45,
    textColor: '#431407',
    accentColor: '#C2410C',
    fontFamily: 'Playfair Display, serif'
  },
  'minimal-white': {
    id: 'minimal-white',
    name: 'Minimal White',
    bgType: 'solid',
    bgColors: ['#FFFFFF'],
    textColor: '#0F172A',
    accentColor: '#64748B',
    fontFamily: 'Inter, sans-serif'
  },
  'forest-calm': {
    id: 'forest-calm',
    name: 'Forest Calm',
    bgType: 'gradient',
    bgColors: ['#064E3B', '#047857', '#065F46'],
    gradientAngle: 160,
    textColor: '#ECFDF5',
    accentColor: '#34D399',
    fontFamily: 'Playfair Display, serif'
  },
  'rose-blush': {
    id: 'rose-blush',
    name: 'Rose Blush',
    bgType: 'gradient',
    bgColors: ['#FDF2F8', '#FCE7F3', '#FBCFE8'],
    gradientAngle: 120,
    textColor: '#831843',
    accentColor: '#BE185D',
    fontFamily: 'Playfair Display, serif'
  },
  'ocean-depths': {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    bgType: 'gradient',
    bgColors: ['#082F49', '#0C4A6E', '#0369A1'],
    gradientAngle: 180,
    textColor: '#F0F9FF',
    accentColor: '#38BDF8',
    fontFamily: 'Inter, sans-serif'
  },
  'tamil-classic': {
    id: 'tamil-classic',
    name: 'Tamil Classic',
    bgType: 'solid',
    bgColors: ['#FFFDF7'],
    textColor: '#3E2723',
    accentColor: '#D97706',
    hasKolamBorder: true,
    fontFamily: 'Noto Sans Tamil, serif'
  },
  'bold-statement': {
    id: 'bold-statement',
    name: 'Bold Statement',
    bgType: 'solid',
    bgColors: ['#09090B'],
    textColor: '#FFFFFF',
    accentColor: '#EC4899',
    isGradientText: true,
    fontFamily: 'Inter, sans-serif'
  }
};

/**
 * Draws decorative Indian Kolam / Mandala corner borders
 */
function drawKolamCorners(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;

  const inset = 60;
  const cornerSize = 70;

  // Frame outer border
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  // Inner decorative border
  ctx.strokeRect(inset + 12, inset + 12, width - (inset + 12) * 2, height - (inset + 12) * 2);

  // 4 Corner flourishes
  const corners = [
    { x: inset, y: inset, dx: 1, dy: 1 },
    { x: width - inset, y: inset, dx: -1, dy: 1 },
    { x: inset, y: height - inset, dx: 1, dy: -1 },
    { x: width - inset, y: height - inset, dx: -1, dy: -1 }
  ];

  for (const c of corners) {
    ctx.beginPath();
    ctx.arc(c.x + c.dx * 20, c.y + c.dy * 20, 10, 0, Math.PI * 2);
    ctx.fill();

    // Curved loop
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + c.dy * cornerSize);
    ctx.quadraticCurveTo(c.x + c.dx * 35, c.y + c.dy * 35, c.x + c.dx * cornerSize, c.y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Wraps text into lines according to canvas width
 */
function getWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const resultLines: string[] = [];
  const rawParagraphs = text.split('\n');

  for (const para of rawParagraphs) {
    if (para.trim() === '') {
      resultLines.push('');
      continue;
    }

    const words = para.trim().split(/\s+/);
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const testLine = `${currentLine} ${words[i]}`;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        resultLines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    resultLines.push(currentLine);
  }

  return resultLines;
}

/**
 * Main Canvas Render Function
 */
export async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  options: CardRenderOptions
): Promise<string> {
  const isStory = options.aspectRatio === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const template = CARD_TEMPLATES[options.templateId] || CARD_TEMPLATES['midnight-glow'];

  // 1. Draw Background
  if (template.bgType === 'solid') {
    ctx.fillStyle = template.bgColors[0];
    ctx.fillRect(0, 0, width, height);
  } else {
    // Gradient
    const angleRad = ((template.gradientAngle || 45) * Math.PI) / 180;
    const x2 = Math.cos(angleRad) * width;
    const y2 = Math.sin(angleRad) * height;
    const grad = ctx.createLinearGradient(0, 0, Math.abs(x2), Math.abs(y2));

    const step = 1 / Math.max(1, template.bgColors.length - 1);
    template.bgColors.forEach((color, i) => {
      grad.addColorStop(i * step, color);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Kolam Border (Tamil Classic)
  if (template.hasKolamBorder) {
    drawKolamCorners(ctx, width, height, template.accentColor);
  }

  // 3. Script Detection for Font Family
  const isTamil = /[\u0B80-\u0BFF]/.test(options.text);
  const preferredFont = isTamil ? 'Noto Sans Tamil, sans-serif' : template.fontFamily;

  // 4. Auto-Fit Font Size (Shrink 72px -> 36px)
  const paddingX = template.hasKolamBorder ? 140 : 100;
  const paddingY = template.hasKolamBorder ? 160 : 120;
  const maxContentWidth = width - paddingX * 2;
  const maxContentHeight = height - paddingY * 2 - 140; // reserve space for header & watermark

  let fontSize = 68;
  let lineHeight = fontSize * 1.5;
  let lines: string[] = [];

  while (fontSize >= 32) {
    ctx.font = `600 ${fontSize}px ${preferredFont}`;
    lines = getWrappedLines(ctx, options.text, maxContentWidth);
    const totalTextHeight = lines.length * lineHeight;

    if (totalTextHeight <= maxContentHeight) {
      break;
    }
    fontSize -= 4;
    lineHeight = fontSize * 1.48;
  }

  // 5. Draw Header / Theme
  if (options.themeTitle) {
    ctx.save();
    ctx.font = `500 28px ${preferredFont}`;
    ctx.fillStyle = template.accentColor;
    ctx.textAlign = 'center';
    ctx.fillText(options.themeTitle.toUpperCase(), width / 2, paddingY + 20);
    ctx.restore();
  }

  // 6. Draw Main Text Content
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${fontSize}px ${preferredFont}`;

  const totalBlockHeight = lines.length * lineHeight;
  const startY = (height - totalBlockHeight) / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;

    if (template.isGradientText) {
      const textGrad = ctx.createLinearGradient(width * 0.2, y, width * 0.8, y);
      textGrad.addColorStop(0, '#F43F5E');
      textGrad.addColorStop(0.5, '#EC4899');
      textGrad.addColorStop(1, '#8B5CF6');
      ctx.fillStyle = textGrad;
    } else {
      ctx.fillStyle = template.textColor;
    }

    ctx.fillText(line, width / 2, y);
  });
  ctx.restore();

  // 7. Subtle Watermark (40% opacity)
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.font = `500 24px Inter, sans-serif`;
  ctx.fillStyle = template.textColor;
  ctx.textAlign = 'center';
  ctx.fillText('✨ DreamInk AI', width / 2, height - (template.hasKolamBorder ? 90 : 60));
  ctx.restore();

  return canvas.toDataURL('image/png');
}
