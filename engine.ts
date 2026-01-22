import { EditParams, HSLChannel, Point } from './types';

// ... (Keep rgbToHsl and hslToRgb helpers) ...
export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
};

// ... (Keep applyColorGrade helper if you have it from previous step, otherwise remove this comment) ...

// --- NEW: Monotone Cubic Spline Interpolation for smooth curves ---
const createSplineInterpolator = (points: Point[]) => {
  // Sort points by x
  points.sort((a, b) => a.x - b.x);

  const n = points.length;
  if (n === 0) return (x: number) => 0;
  if (n === 1) return (x: number) => points[0].y;

  // Calculate slopes (m)
  const m = new Array(n).fill(0);
  const d = new Array(n - 1).fill(0);
  
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i+1].x - points[i].x;
    const dy = points[i+1].y - points[i].y;
    d[i] = dy / dx;
  }

  m[0] = d[0];
  m[n-1] = d[n-2];

  for (let i = 1; i < n - 1; i++) {
    if (d[i-1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = points[i+1].x - points[i].x; // h_i
      const w2 = points[i].x - points[i-1].x; // h_{i-1}
      m[i] = (w1 + w2) / ((w1 / d[i-1]) + (w2 / d[i]));
    }
  }

  // Return interpolation function
  return (x: number) => {
    // Find segment
    let i = 0;
    if (x >= points[n-1].x) return points[n-1].y;
    if (x <= points[0].x) return points[0].y;
    
    // Binary search could be faster, but linear is fine for small N
    while (points[i+1].x < x) i++;
    
    const h = points[i+1].x - points[i].x;
    const t = (x - points[i].x) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    
    const y = h00 * points[i].y + h10 * h * m[i] + h01 * points[i+1].y + h11 * h * m[i+1];
    return Math.max(0, Math.min(1, y));
  };
};

// Precompute 256-entry Look Up Table (LUT) for the curve
const generateCurveLUT = (points: Point[]) => {
  const lut = new Uint8Array(256);
  const interpolate = createSplineInterpolator(points);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(interpolate(i / 255) * 255);
  }
  return lut;
};

export const applyPipeline = (imgData: ImageData, params: EditParams, width: number, height: number) => {
  const data = imgData.data;
  const length = data.length;

  // ... (Standard params calculations) ...
  const exposureMul = Math.pow(2, params.exposure);
  const contrastFactor = (259 * (params.contrast + 255)) / (255 * (259 - params.contrast));
  const vibranceAmt = params.vibrance / 100;
  
  // Generate LUT for Point Curve
  const hasPointCurve = params.curvePoints.length > 2 || params.curvePoints[0].y !== 0 || params.curvePoints[1].y !== 1;
  let curveLUT: Uint8Array | null = null;
  if (hasPointCurve) {
    curveLUT = generateCurveLUT(params.curvePoints);
  }

  // Center/Dist for Vignette
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let i = 0; i < length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure & Profiles
    r *= exposureMul;
    g *= exposureMul;
    b *= exposureMul;

    // 2. White Balance
    r += params.temperature;
    b -= params.temperature;
    g += params.tint;
    r -= params.tint * 0.5; b -= params.tint * 0.5;

    // 3. Tones (Luminance Masked)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const normLum = Math.max(0, Math.min(1, lum / 255));
    
    const shadowW = Math.max(0, 1 - Math.pow(normLum, 0.5) * 2);
    const highlightW = Math.max(0, Math.pow(normLum, 2));
    const whiteW = Math.max(0, Math.pow(normLum, 4));
    const blackW = Math.max(0, 1 - Math.pow(normLum, 0.2));

    const toneDelta = 
      (params.shadows * shadowW * 0.5) +
      (params.highlights * highlightW * 0.5) +
      (params.whites * whiteW * 0.8) +
      (params.blacks * blackW * 0.8);
    
    r += toneDelta; g += toneDelta; b += toneDelta;

    // 4. Clarity / Dehaze
    if (params.dehaze !== 0) {
      const dh = params.dehaze / 100;
      r = (r - 128 * dh) / (1 - Math.abs(dh) * 0.4) + 128 * dh;
      g = (g - 128 * dh) / (1 - Math.abs(dh) * 0.4) + 128 * dh;
      b = (b - 128 * dh) / (1 - Math.abs(dh) * 0.4) + 128 * dh;
    }

    if (params.clarity !== 0) {
      const cl = params.clarity / 200;
      const midW = 1.0 - Math.abs(normLum - 0.5) * 2;
      const clFactor = 1 + cl * midW;
      r = (r - 128) * clFactor + 128;
      g = (g - 128) * clFactor + 128;
      b = (b - 128) * clFactor + 128;
    }

    // 5. Parametric Curve (Legacy/Simple)
    const cShadowW = Math.max(0, 1 - normLum * 4);
    const cDarksW = Math.max(0, 1 - Math.abs(normLum - 0.25) * 4);
    const cLightsW = Math.max(0, 1 - Math.abs(normLum - 0.75) * 4);
    const cHighlightsW = Math.max(0, normLum * 4 - 3);

    const curveDelta = 
      (params.curveShadows * cShadowW) +
      (params.curveDarks * cDarksW) +
      (params.curveLights * cLightsW) +
      (params.curveHighlights * cHighlightsW);
    
    r += curveDelta; g += curveDelta; b += curveDelta;

    // 6. Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 7. NEW: Point Curve (Applied after contrast, before color)
    if (curveLUT) {
      // Clamp to 0-255 before lookup
      r = curveLUT[Math.max(0, Math.min(255, Math.round(r)))];
      g = curveLUT[Math.max(0, Math.min(255, Math.round(g)))];
      b = curveLUT[Math.max(0, Math.min(255, Math.round(b)))];
    }

    // 8. Color Logic (HSL)
    let [h, s, l] = rgbToHsl(Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b)));
    
    if (vibranceAmt !== 0) {
      const vW = (1.0 - s);
      s *= (1 + vibranceAmt * vW);
    }
    s *= params.saturation;

    const hueDeg = h * 360;
    let channel: HSLChannel = 'red';
    if (hueDeg < 20 || hueDeg >= 345) channel = 'red';
    else if (hueDeg < 45) channel = 'orange';
    else if (hueDeg < 75) channel = 'yellow';
    else if (hueDeg < 160) channel = 'green';
    else if (hueDeg < 200) channel = 'aqua';
    else if (hueDeg < 260) channel = 'blue';
    else if (hueDeg < 310) channel = 'purple';
    else channel = 'magenta';

    const hConfig = params.hsl[channel];
    h = (h + hConfig.hue / 360) % 1;
    s = Math.max(0, Math.min(1, s * (1 + hConfig.saturation / 100)));
    l = Math.max(0, Math.min(1, l * (1 + hConfig.luminance / 100)));

    [r, g, b] = hslToRgb(h, s, l);

    // 9. Vignette
    if (params.vignette > 0) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const vFactor = Math.max(0, 1 - (dist * dist * params.vignette));
      r *= vFactor; g *= vFactor; b *= vFactor;
    }

    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
};
