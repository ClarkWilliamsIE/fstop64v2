export type HSLChannel = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta';

export interface HSLParams {
  hue: number;
  saturation: number;
  luminance: number;
}

export interface ColorGradePair {
  hue: number;
  saturation: number;
}

export interface ColorGrading {
  shadows: ColorGradePair;
  midtones: ColorGradePair;
  highlights: ColorGradePair;
  blending: number;
  balance: number;
}

export interface CropParams {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// --- NEW TYPE FOR CURVE POINTS ---
export interface Point {
  x: number;
  y: number;
}

export interface EditParams {
  profile: 'adobe-color' | 'vivid' | 'portrait' | 'landscape';
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  texture: number;
  clarity: number;
  dehaze: number;
  vibrance: number;
  saturation: number;
  
  // Parametric Curve (Keep these for backward compatibility or dual mode)
  curveHighlights: number;
  curveLights: number;
  curveDarks: number;
  curveShadows: number;

  // --- NEW FIELD: Point Curve ---
  // Default is a straight line: [[0,0], [255,255]]
  curvePoints: Point[]; 
  
  hsl: Record<HSLChannel, HSLParams>;
  colorGrading: ColorGrading;
  vignette: number;
  crop: CropParams;
}

// ... (Keep UserProfile, Preset, Photo interfaces same as before) ...
export interface UserProfile {
  id: string;
  email: string;
  is_pro: boolean;
  export_count: number;
}

export interface Preset {
  id: string;
  name: string;
  params: EditParams;
}

export interface Photo {
  id: string;
  name: string;
  src: string;
  thumbnailSrc?: string;
  params: EditParams;
  lastEdited?: number;
  hiddenFromEdited?: boolean;
}

const defaultHSL = (): HSLParams => ({ hue: 0, saturation: 0, luminance: 0 });

export const DEFAULT_PARAMS: EditParams = {
  profile: 'adobe-color',
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  vibrance: 0,
  saturation: 1,
  
  curveHighlights: 0,
  curveLights: 0,
  curveDarks: 0,
  curveShadows: 0,

  // Default Linear Curve (0 to 1 scale for ease of UI)
  curvePoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],

  hsl: {
    red: defaultHSL(),
    orange: defaultHSL(),
    yellow: defaultHSL(),
    green: defaultHSL(),
    aqua: defaultHSL(),
    blue: defaultHSL(),
    purple: defaultHSL(),
    magenta: defaultHSL(),
  },
  colorGrading: {
    shadows: { hue: 0, saturation: 0 },
    midtones: { hue: 0, saturation: 0 },
    highlights: { hue: 0, saturation: 0 },
    blending: 50,
    balance: 0
  },
  vignette: 0,
  crop: { top: 0, bottom: 0, left: 0, right: 0 },
};

export const isPhotoEdited = (params: EditParams): boolean => {
  // ... (Keep existing checks) ...
  if (params.exposure !== 0) return true;
  if (params.contrast !== 0) return true;
  // ... check other params ...
  
  // Check Curve Points (if it has more than 2 points or isn't linear)
  if (params.curvePoints.length > 2) return true;
  if (params.curvePoints[0].y !== 0 || params.curvePoints[1].y !== 1) return true;

  return false;
};
