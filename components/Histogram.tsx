import React, { useEffect, useRef } from 'react';
import { EditParams } from '../types';

interface HistogramProps {
  image: HTMLImageElement | null;
  params: EditParams; // Used to trigger redraws when edits change
  className?: string;
}

const Histogram: React.FC<HistogramProps> = ({ image, params, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a small offscreen canvas to process data (Performance Optimization)
    // We only need statistics, so resizing to 200px wide is enough for accuracy
    const sampleSize = 256;
    const offscreen = document.createElement('canvas');
    offscreen.width = sampleSize;
    offscreen.height = (sampleSize / image.width) * image.height;
    const oCtx = offscreen.getContext('2d');
    if (!oCtx) return;

    oCtx.drawImage(image, 0, 0, offscreen.width, offscreen.height);
    const imgData = oCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
    
    // Calculate Frequencies
    const rHist = new Array(256).fill(0);
    const gHist = new Array(256).fill(0);
    const bHist = new Array(256).fill(0);
    const lHist = new Array(256).fill(0); // Luminance (White)

    let maxCount = 0;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i+1];
      const b = imgData[i+2];
      
      // Rough Luminance
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      rHist[r]++;
      gHist[g]++;
      bHist[b]++;
      lHist[lum]++;
    }

    maxCount = Math.max(
        ...rHist, ...gHist, ...bHist, ...lHist
    );

    // Draw Histogram
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen'; // Blend colors like light

    const drawChannel = (hist: number[], color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < 256; i++) {
            const x = (i / 255) * w;
            const barHeight = (hist[i] / maxCount) * h * 0.9; // Scale to fit
            ctx.lineTo(x, h - barHeight);
        }
        ctx.lineTo(w, h);
        ctx.fill();
    };

    drawChannel(rHist, 'rgba(255, 50, 50, 0.5)');
    drawChannel(gHist, 'rgba(50, 255, 50, 0.5)');
    drawChannel(bHist, 'rgba(50, 50, 255, 0.5)');
    drawChannel(lHist, 'rgba(200, 200, 200, 0.3)');

  }, [image, params]); // Redraw when params change (image usually changes too if it's the processed result)

  return (
    <div className={`bg-black border border-zinc-800 rounded-lg p-2 ${className}`}>
      <canvas ref={canvasRef} width={256} height={100} className="w-full h-24 block" />
      <div className="flex justify-between text-[9px] text-zinc-600 font-mono mt-1 px-1">
        <span>Shadows</span>
        <span>Highlights</span>
      </div>
    </div>
  );
};

export default Histogram;
