import React, { useRef, useEffect, useCallback, useState } from 'react';
import { EditParams, CropParams } from '../types';
import { applyPipeline } from '../engine';

interface ViewportProps {
  image: HTMLImageElement;
  params: EditParams;
  isCropMode: boolean;
  onUpdateCrop: (crop: CropParams) => void;
}

const MAX_PREVIEW_DIMENSION = 1400;

// Helper to get a canvas with the image rotated
const getRotatedCanvas = (image: HTMLImageElement, rotation: number): HTMLCanvasElement => {
  if (rotation === 0) {
    // Quick pass if no rotation
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    c.getContext('2d')?.drawImage(image, 0, 0);
    return c;
  }

  const rad = (rotation * Math.PI) / 180;
  const cw = Math.abs(image.width * Math.cos(rad)) + Math.abs(image.height * Math.sin(rad));
  const ch = Math.abs(image.width * Math.sin(rad)) + Math.abs(image.height * Math.cos(rad));

  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  // Center and Rotate
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(rad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  
  return c;
};

const Viewport: React.FC<ViewportProps> = ({ image, params, isCropMode, onUpdateCrop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // We store the *Rotated* source here
  const previewSourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(null);

  // Dragging State
  const [dragInfo, setDragInfo] = useState<{ 
    type: string; 
    startX: number; 
    startY: number; 
    startCrop: CropParams;
    aspectRatio: number;
  } | null>(null);

  // 1. Prepare Source (Rotate if needed)
  useEffect(() => {
    if (!image) return;
    
    // Create rotated full-res buffer
    const fullRotated = getRotatedCanvas(image, params.crop.rotation || 0);

    // Downscale for preview performance
    const scale = Math.min(1, MAX_PREVIEW_DIMENSION / Math.max(fullRotated.width, fullRotated.height));
    const pw = Math.floor(fullRotated.width * scale);
    const ph = Math.floor(fullRotated.height * scale);

    const offscreen = document.createElement('canvas');
    offscreen.width = pw;
    offscreen.height = ph;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    
    if (ctx) {
      ctx.drawImage(fullRotated, 0, 0, pw, ph);
      previewSourceCanvasRef.current = offscreen;
    }
    
    render();
  }, [image, params.crop.rotation]); // Re-run only when rotation changes

  // 2. Render Pipeline (Crop -> Edit)
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const source = previewSourceCanvasRef.current;
    if (!canvas || !source) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { crop } = params;
    
    const renderSx = isCropMode ? 0 : (crop.left / 100) * source.width;
    const renderSy = isCropMode ? 0 : (crop.top / 100) * source.height;
    const renderSw = isCropMode ? source.width : source.width * (1 - (crop.left + crop.right) / 100);
    const renderSh = isCropMode ? source.height : source.height * (1 - (crop.top + crop.bottom) / 100);

    canvas.width = renderSw;
    canvas.height = renderSh;
    
    const sourceCtx = source.getContext('2d');
    if (!sourceCtx) return;

    const imgData = sourceCtx.getImageData(renderSx, renderSy, renderSw, renderSh);
    
    // Apply Colors
    applyPipeline(imgData, params, renderSw, renderSh);

    // Scaling for display
    const sidebarWidth = 320;
    const filmstripHeight = 128;
    const topBarHeight = 56;
    const displayWidth = window.innerWidth - sidebarWidth - 128;
    const displayHeight = window.innerHeight - topBarHeight - filmstripHeight - 128; 
    
    const scale = Math.min(displayWidth / renderSw, displayHeight / renderSh);
    
    canvas.style.width = `${renderSw * scale}px`;
    canvas.style.height = `${renderSh * scale}px`;

    ctx.putImageData(imgData, 0, 0);
  }, [params, image, isCropMode]); // We don't need to depend on params.crop.rotation here because useEffect handles the source update

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(render);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [render]);

  // --- Drag Handling Logic (Unchanged, operates on percentages of the rotated view) ---
  const handleMouseDown = (e: React.MouseEvent, type: string) => {
    if (!isCropMode) return;
    e.preventDefault();

    const cropW = 100 - (params.crop.left + params.crop.right);
    const cropH = 100 - (params.crop.top + params.crop.bottom);
    const ratio = cropW / cropH;

    setDragInfo({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...params.crop },
      aspectRatio: ratio
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      let dx = ((e.clientX - dragInfo.startX) / rect.width) * 100;
      let dy = ((e.clientY - dragInfo.startY) / rect.height) * 100;

      const isAspectLocked = (window as any).__cropAspectLocked || e.shiftKey;
      const { type, aspectRatio } = dragInfo;
      const newCrop = { ...dragInfo.startCrop };

      if (type === 'move') {
        newCrop.left = Math.max(0, Math.min(100 - (newCrop.right + 1), dragInfo.startCrop.left + dx));
        newCrop.right = Math.max(0, Math.min(100 - (newCrop.left + 1), dragInfo.startCrop.right - dx));
        newCrop.top = Math.max(0, Math.min(100 - (newCrop.bottom + 1), dragInfo.startCrop.top + dy));
        newCrop.bottom = Math.max(0, Math.min(100 - (newCrop.top + 1), dragInfo.startCrop.bottom - dy));
      } else {
        if (isAspectLocked && (type.includes('-'))) {
            if (Math.abs(dx) > Math.abs(dy)) dy = dx / aspectRatio;
            else dx = dy * aspectRatio;
        }

        if (type.includes('left')) newCrop.left = Math.max(0, Math.min(100 - newCrop.right - 1, dragInfo.startCrop.left + dx));
        if (type.includes('right')) newCrop.right = Math.max(0, Math.min(100 - newCrop.left - 1, dragInfo.startCrop.right - dx));
        if (type.includes('top')) newCrop.top = Math.max(0, Math.min(100 - newCrop.bottom - 1, dragInfo.startCrop.top + dy));
        if (type.includes('bottom')) newCrop.bottom = Math.max(0, Math.min(100 - newCrop.top - 1, dragInfo.startCrop.bottom - dy));
      }

      onUpdateCrop(newCrop);
    };

    const handleMouseUp = () => setDragInfo(null);

    if (dragInfo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, onUpdateCrop]);

  return (
    <div ref={containerRef} className="relative shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/5 bg-[#0a0a0a] group">
      <canvas ref={canvasRef} className="block transition-all duration-300" style={{ filter: isCropMode ? 'brightness(0.5)' : 'none' }} />
      {isCropMode && (
        <div 
          className="absolute border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] cursor-move"
          style={{
            left: `${params.crop.left}%`,
            top: `${params.crop.top}%`,
            right: `${params.crop.right}%`,
            bottom: `${params.crop.bottom}%`,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
            <div className="border-r border-b border-white"></div>
            <div className="border-r border-b border-white"></div>
            <div className="border-b border-white"></div>
            <div className="border-r border-b border-white"></div>
            <div className="border-r border-b border-white"></div>
            <div className="border-b border-white"></div>
            <div className="border-r border-white"></div>
            <div className="border-r border-white"></div>
            <div></div>
          </div>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-black cursor-nw-resize z-10" onMouseDown={(e) => handleMouseDown(e, 'top-left')} />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-black cursor-ne-resize z-10" onMouseDown={(e) => handleMouseDown(e, 'top-right')} />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-black cursor-sw-resize z-10" onMouseDown={(e) => handleMouseDown(e, 'bottom-left')} />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-black cursor-se-resize z-10" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} />
          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-1.5 h-6 bg-white border border-black cursor-w-resize" onMouseDown={(e) => handleMouseDown(e, 'left')} />
          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-1.5 h-6 bg-white border border-black cursor-e-resize" onMouseDown={(e) => handleMouseDown(e, 'right')} />
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-6 h-1.5 bg-white border border-black cursor-n-resize" onMouseDown={(e) => handleMouseDown(e, 'top')} />
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-6 h-1.5 bg-white border border-black cursor-s-resize" onMouseDown={(e) => handleMouseDown(e, 'bottom')} />
        </div>
      )}
    </div>
  );
};

export default Viewport;
