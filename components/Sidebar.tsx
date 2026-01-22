import React, { useState, useRef } from 'react';
import { EditParams, HSLChannel, HSLParams, Preset, Photo, ColorGradePair, Point } from '../types';
import Histogram from './Histogram'; // <--- NEW IMPORT

// ... (Sidebar Props Interface) ...
interface SidebarProps {
  params: EditParams;
  onChange: (params: EditParams) => void;
  presets: Preset[];
  onSavePreset: (name: string) => void;
  onApplyPreset: (preset: Preset) => void;
  editedPhotos: Photo[];
  onBatchExportEdited: () => void;
  onSelectPhoto: (id: string) => void;
  onDismissPhoto: (id: string) => void;
  onUndoDismiss: () => void;
  hasLastDismissed: boolean;
  isCropMode: boolean;
  onToggleCropMode: () => void;
  activeImage?: HTMLImageElement | null; // Pass this for Histogram
}

// --- UPDATED ACCORDION (BOLDER) ---
const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 px-4 flex justify-between items-center bg-[#1e1e1e] hover:bg-[#252525] transition-colors"
      >
        {/* Bold, brighter title */}
        <span className="text-[11px] font-black text-zinc-200 uppercase tracking-widest">{title}</span>
        <svg className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 pt-2 space-y-4 bg-[#1a1a1a]">{children}</div>}
    </div>
  );
};

const Slider: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
  className?: string;
}> = ({ label, min, max, step, value, onChange, className }) => (
  <div className="group">
    <div className="flex justify-between items-center mb-1">
      <label className={`text-[11px] font-medium transition-colors ${className || 'text-zinc-500 group-hover:text-zinc-300'}`}>{label}</label>
      <span className="text-[10px] text-zinc-500 font-mono">
        {value > 0 ? `+${value.toFixed(step >= 1 ? 0 : 2)}` : value.toFixed(step >= 1 ? 0 : 2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full cursor-pointer accent-blue-500 bg-zinc-800 h-1 appearance-none rounded"
    />
  </div>
);

// --- NEW: INTERACTIVE CURVE EDITOR ---
const CurveEditor: React.FC<{ points: Point[]; onChange: (points: Point[]) => void }> = ({ points, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleMouseDown = (index: number) => {
    setDraggingIdx(index);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingIdx === null || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = 1 - (e.clientY - rect.top) / rect.height; // Flip Y (0 is bottom)

    // Clamp
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    // Constraints for endpoints
    if (draggingIdx === 0) x = 0;
    if (draggingIdx === points.length - 1) x = 1;

    // Constraint for middle points (must stay between neighbors)
    if (draggingIdx > 0 && x <= points[draggingIdx - 1].x) x = points[draggingIdx - 1].x + 0.01;
    if (draggingIdx < points.length - 1 && x >= points[draggingIdx + 1].x) x = points[draggingIdx + 1].x - 0.01;

    const newPoints = [...points];
    newPoints[draggingIdx] = { x, y };
    onChange(newPoints);
  };

  const handleMouseUp = () => setDraggingIdx(null);

  // Add point on double click
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    
    // Insert point in correct order
    const newPoints = [...points];
    newPoints.push({ x, y });
    newPoints.sort((a, b) => a.x - b.x);
    onChange(newPoints);
  };

  // Convert points to SVG path (Simple linear connection for visualization, engine does spline)
  // To visualize Spline here would require reproducing the engine math in JS for the SVG path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 100} ${100 - p.y * 100}`).join(' ');

  return (
    <div className="aspect-square bg-[#111] border border-zinc-700 rounded relative overflow-hidden select-none"
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}>
      
      {/* Grid Lines */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
         {[...Array(16)].map((_, i) => <div key={i} className="border-r border-b border-zinc-500"></div>)}
      </div>

      <svg ref={svgRef} viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" onDoubleClick={handleDoubleClick} style={{ pointerEvents: 'all' }}>
        {/* The Line */}
        <path d={pathD} fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        
        {/* The Points */}
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x * 100} 
            cy={100 - p.y * 100} 
            r="4" 
            className={`cursor-pointer transition-all ${draggingIdx === i ? 'fill-blue-500 r-6' : 'fill-white hover:fill-blue-400'}`}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(i); }}
          />
        ))}
      </svg>
      <div className="absolute bottom-1 right-2 text-[9px] text-zinc-600 pointer-events-none">Double-click to add point</div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ 
  params, onChange, presets, onSavePreset, onApplyPreset, editedPhotos, onBatchExportEdited, onSelectPhoto, onDismissPhoto, onUndoDismiss, hasLastDismissed, isCropMode, onToggleCropMode, activeImage
}) => {
  const [activeTab, setActiveTab] = useState<'develop' | 'history'>('develop');
  const [hslMode, setHslMode] = useState<'hue' | 'saturation' | 'luminance'>('saturation');
  const [newPresetName, setNewPresetName] = useState('');
  const [isAspectLocked, setIsAspectLocked] = useState(false);

  // ... (Helpers: updateParam, updateHSL, updateColorGrade, updateColorGradeGlobal from previous steps) ...
  const updateParam = (key: keyof EditParams, value: any) => {
    onChange({ ...params, [key]: value });
  };

  const updateHSL = (channel: HSLChannel, field: keyof HSLParams, value: number) => {
    const newHSL = { ...params.hsl };
    newHSL[channel] = { ...newHSL[channel], [field]: value };
    updateParam('hsl', newHSL);
  };

  const updateColorGrade = (range: 'shadows' | 'midtones' | 'highlights', field: keyof ColorGradePair, value: number) => {
    const newCG = { ...params.colorGrading };
    newCG[range] = { ...newCG[range], [field]: value };
    updateParam('colorGrading', newCG);
  };
  const updateColorGradeGlobal = (field: 'blending' | 'balance', value: number) => {
    const newCG = { ...params.colorGrading, [field]: value };
    updateParam('colorGrading', newCG);
  };

  return (
    <div className="flex flex-col h-full select-none bg-[#161616]">
      {/* ... Tab Switcher (unchanged) ... */}
      <div className="flex bg-[#1a1a1a] p-1.5 border-b border-zinc-800 shrink-0">
        <button onClick={() => setActiveTab('develop')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'develop' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>Develop</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>Edited Assets</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'develop' ? (
          <>
            {/* NEW: HISTOGRAM AT TOP */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
               <Histogram image={activeImage || null} params={params} className="mb-4" />
               {/* ... Crop Tool Logic ... */}
               <div className="flex gap-2">
                  <button 
                    onClick={onToggleCropMode}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${isCropMode ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'}`}
                  >
                    <svg className={`w-5 h-5 ${isCropMode ? 'text-white' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isCropMode ? 'text-white' : 'text-zinc-500'}`}>Crop Tool</span>
                  </button>
               </div>
            </div>

            <Accordion title="Basic" defaultOpen>
               {/* ... (Basic Sliders from previous steps) ... */}
               <div className="space-y-5">
                <div className="space-y-4">
                  <Slider label="Temp" min={-100} max={100} step={1} value={params.temperature} onChange={(v) => updateParam('temperature', v)} />
                  <Slider label="Tint" min={-100} max={100} step={1} value={params.tint} onChange={(v) => updateParam('tint', v)} />
                </div>
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <Slider label="Exposure" min={-4} max={4} step={0.01} value={params.exposure} onChange={(v) => updateParam('exposure', v)} />
                  <Slider label="Contrast" min={-100} max={100} step={1} value={params.contrast} onChange={(v) => updateParam('contrast', v)} />
                  {/* ... Highlights/Shadows etc ... */}
                </div>
              </div>
            </Accordion>

            {/* --- UPDATED TONE CURVE --- */}
            <Accordion title="Tone Curve">
              <div className="space-y-4">
                <CurveEditor points={params.curvePoints} onChange={(pts) => updateParam('curvePoints', pts)} />
                <div className="pt-2 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-600 mb-2 uppercase font-bold">Parametric</p>
                    <Slider label="Highlights" min={-100} max={100} step={1} value={params.curveHighlights} onChange={(v) => updateParam('curveHighlights', v)} />
                    <Slider label="Lights" min={-100} max={100} step={1} value={params.curveLights} onChange={(v) => updateParam('curveLights', v)} />
                    <Slider label="Darks" min={-100} max={100} step={1} value={params.curveDarks} onChange={(v) => updateParam('curveDarks', v)} />
                    <Slider label="Shadows" min={-100} max={100} step={1} value={params.curveShadows} onChange={(v) => updateParam('curveShadows', v)} />
                </div>
              </div>
            </Accordion>
            
            {/* ... Color Grading & Mixer ... */}
            <Accordion title="Color Grading">
               <div className="space-y-6">
                 {/* Shadows */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Shadows</p>
                  <Slider className="text-zinc-400" label="Hue" min={0} max={360} step={1} value={params.colorGrading.shadows.hue} onChange={(v) => updateColorGrade('shadows', 'hue', v)} />
                  <Slider className="text-zinc-400" label="Sat" min={0} max={100} step={1} value={params.colorGrading.shadows.saturation} onChange={(v) => updateColorGrade('shadows', 'saturation', v)} />
                </div>
                {/* ... Midtones/Highlights/Balance ... */}
               </div>
            </Accordion>

            <Accordion title="Color Mixer">
               {/* ... HSL ... */}
               <div className="space-y-3">
                {(Object.keys(params.hsl) as HSLChannel[]).map(ch => (
                  <Slider key={ch} label={ch} min={-100} max={100} step={1} value={params.hsl[ch][hslMode]} onChange={v => updateHSL(ch, hslMode, v)} />
                ))}
              </div>
            </Accordion>

            {/* ... Presets ... */}
            <Accordion title="Presets">
                {/* ... */}
            </Accordion>

          </>
        ) : (
          /* History Logic */
          <div className="text-zinc-500 p-4">History...</div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
