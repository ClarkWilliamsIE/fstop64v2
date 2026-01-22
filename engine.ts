import { EditParams, HSLChannel } from './types';

// Fast HSL conversion helpers
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

// --- NEW: Color Grading Helper ---
const applyColorGrade = (r: number, g: number, b: number, hue: number, sat: number, weight: number): [number, number, number] => {
  if (sat === 0 || weight <= 0.001) return [r, g, b];
  
  // Convert current pixel to luminance
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  
  // Create a target color with that luminance
  // We use a simplified overlay-like blend here for performance
  let [h, s, l] = rgbToHsl(r, g, b);
  
  // Shift hue towards target
  const targetHue = hue / 360;
  
  // Blend logic: 
  // We want to tint the color without changing its luminance too much
  const tintStrength = (sat / 100) * weight;
  
  // Simple RGB tinting approach for speed (Lightroom-ish)
  // Convert target hue/sat to RGB
  const [tr, tg, tb] = hslToRgb(targetHue, 1, 0.5); // Target is pure color at 50% light
  
  // Overlay blend
  r = r * (1 - tintStrength) + (tr * 255) * tintStrength * (lum / 128);
  g = g * (1 - tintStrength) + (tg * 255) * tintStrength * (lum / 128);
  b = b * (1 - tintStrength) + (tb * 255) * tintStrength * (lum / 128);

  return [r, g, b];
};

export const applyPipeline = (imgData: ImageData, params: EditParams, width: number, height: number, forceFull: boolean = false) => {
  const data = imgData.data;
  const length = data.length;

  const exposureMul = Math.pow(2, params.exposure);
  const contrastFactor = (259 * (params.contrast + 255)) / (255 * (259 - params.contrast));
  const vibranceAmt = params.vibrance / 100;
  
  let profileSat = 1.0;
  if (params.profile === 'vivid') profileSat = 1.25;
  if (params.profile === 'portrait') profileSat = 0.95;
  if (params.profile === 'landscape') profileSat = 1.1;

  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  // Pre-calculate Color Grading RGBs to avoid doing hslToRgb per pixel
  // (Optimization)
  const cg = params.colorGrading;
  const hasCG = cg.shadows.saturation > 0 || cg.midtones.saturation > 0 || cg.highlights.saturation > 0;
  
  let sR = 0, sG = 0, sB = 0;
  let mR = 0, mG = 0, mB = 0;
  let hR = 0, hG = 0, hB = 0;

  if (hasCG) {
    [sR, sG, sB] = hslToRgb(cg.shadows.hue / 360, 1, 0.5);
    [mR, mG, mB] = hslToRgb(cg.midtones.hue / 360, 1, 0.5);
    [hR, hG, hB] = hslToRgb(cg.highlights.hue / 360, 1, 0.5);
    // Scale up to 255 once
    sR*=255; sG*=255; sB*=255;
    mR*=255; mG*=255; mB*=255;
    hR*=255; hG*=255; hB*=255;
  }

  for (let i = 0; i < length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure & Profiles
    r *= (exposureMul * profileSat);
    g *= (exposureMul * profileSat);
    b *= (exposureMul * profileSat);

    // 2. White Balance
    r += params.temperature;
    b -= params.temperature;
    g += params.tint;
    r -= params.tint * 0.5; b -= params.tint * 0.5;

    // 3. Tones (Luminance Masked)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const normLum = Math.max(0, Math.min(1, lum / 255));
    
    // ... (Existing Tone logic) ...
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

    // 4. Clarity / Dehaze (Existing)
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

    // 5. Tone Curve (PARAMETRIC)
    // We already had this logic, it was just hidden!
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

    // 6. Contrast (Existing)
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // --- NEW: COLOR GRADING ---
    if (hasCG) {
      // Recalculate lum after contrast/tone changes
      const finalLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      
      // Calculate Masks based on Balance
      // Balance shifts the midpoint (-1 to +1)
      const balance = cg.balance / 100; 
      
      // Smooth falloff masks
      const sMask = Math.max(0, (1 - finalLum) - balance); // Shadows
      const hMask = Math.max(0, finalLum + balance);      // Highlights
      
      // Midtones are whatever is left
      // We square/smoothstep to make it look like separate wheels
      const sWeight = Math.min(1, Math.pow(sMask, 2) * 2);
      const hWeight = Math.min(1, Math.pow(hMask, 2) * 2);
      const mWeight = Math.max(0, 1 - sWeight - hWeight);

      // Apply Tints
      if (cg.shadows.saturation > 0) {
        const str = (cg.shadows.saturation / 100) * sWeight;
        r += (sR - r) * str * 0.3; // 0.3 factor to keep it subtle/photographic
        g += (sG - g) * str * 0.3;
        b += (sB - b) * str * 0.3;
      }
      if (cg.highlights.saturation > 0) {
        const str = (cg.highlights.saturation / 100) * hWeight;
        r += (hR - r) * str * 0.3;
        g += (hG - g) * str * 0.3;
        b += (hB - b) * str * 0.3;
      }
      if (cg.midtones.saturation > 0) {
        const str = (cg.midtones.saturation / 100) * mWeight;
        r += (mR - r) * str * 0.3;
        g += (mG - g) * str * 0.3;
        b += (mB - b) * str * 0.3;
      }
    }

    // 7. HSL / Color Mixer (Existing)
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

    // 8. Vignette (Existing)
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
