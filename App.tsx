import React, { useState, useRef, useEffect, useMemo } from 'react';
import { saveAs } from 'file-saver';

import { EditParams, DEFAULT_PARAMS, Photo, isPhotoEdited } from './types';
import Sidebar from './components/Sidebar';
import Viewport from './components/Viewport';
import TopBar from './components/TopBar';
import Filmstrip from './components/Filmstrip';
import { applyPipeline } from './engine';
import { useAuthSubscription } from './hooks/useAuthSubscription';
import { usePresets } from './hooks/usePresets';
import { LoginModal, PaywallModal, LoginPromptModal, ExportOptionsModal } from './components/AuthModals';
import AboutModal from './components/AboutModal';
import { isMockMode } from './lib/supabase';
import BetaApp from './BetaApp';
import Privacy from './Privacy';
import Terms from './Terms';

// --- HELPER: ERROR IMAGE ---
const createErrorImage = (text: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 300, 200);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.strokeRect(10, 10, 280, 180);
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('RAW FAIL', 150, 80);
    ctx.fillStyle = '#71717a'; ctx.font = '12px sans-serif';
    ctx.fillText(text.slice(0, 20), 150, 130);
  }
  return canvas.toDataURL('image/jpeg');
};

// --- HELPER: RAW DETECTION ---
const isRawFile = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['arw', 'cr2', 'cr3', 'nef', 'dng', 'orf', 'raf', 'rw2', 'pef', 'srw', 'tif', 'tiff'].includes(ext || '');
};

// --- HELPER: DECODE RAW TO CANVAS ---
const decodeRawToCanvas = async (file: File): Promise<HTMLCanvasElement | null> => {
    if ((window as any).raw) {
        try {
            console.log(`Decoding ${file.name} with raw.js...`);
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = (e) => {
                    try {
                        const buffer = e.target?.result as ArrayBuffer;
                        const raw = new (window as any).raw.Raw();
                        const view = new Uint8Array(buffer);
                        raw.setData(view);
                        const processed = raw.extractThumb() || raw.decode(); 
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = processed.width;
                        canvas.height = processed.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) { resolve(null); return; }
                        
                        const imgData = ctx.createImageData(processed.width, processed.height);
                        imgData.data.set(processed.data);
                        ctx.putImageData(imgData, 0, 0);
                        resolve(canvas);
                    } catch (err) {
                        console.warn("raw.js failed:", err);
                        resolve(null);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        } catch (e) { console.warn("raw.js crash", e); }
    }

    if ((window as any).UTIF) {
        try {
            console.log(`Decoding ${file.name} with UTIF...`);
            const buffer = await file.arrayBuffer();
            const ifds = (window as any).UTIF.decode(buffer);
            let page = ifds[0];
            if (page.subIFD && page.subIFD.length > 0) {
                 page = page.subIFD[0];
            }
            (window as any).UTIF.decodeImage(buffer, page);
            const rgba = (window as any).UTIF.toRGBA8(page);
            const canvas = document.createElement('canvas');
            canvas.width = page.width;
            canvas.height = page.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imgData = ctx.createImageData(page.width, page.height);
                imgData.data.set(rgba);
                ctx.putImageData(imgData, 0, 0);
                return canvas;
            }
        } catch (e) { console.warn("UTIF failed", e); }
    }
    return null;
};

// --- HELPER: CREATE PROXY (Downscale) ---
const createProxyUrl = async (sourceCanvas: HTMLCanvasElement): Promise<string> => {
    const PROXY_SIZE = 2048; 
    const scale = Math.min(1, PROXY_SIZE / Math.max(sourceCanvas.width, sourceCanvas.height));
    if (scale >= 1) return sourceCanvas.toDataURL('image/jpeg', 0.8);
    const proxyCanvas = document.createElement('canvas');
    proxyCanvas.width = sourceCanvas.width * scale;
    proxyCanvas.height = sourceCanvas.height * scale;
    const ctx = proxyCanvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(sourceCanvas, 0, 0, proxyCanvas.width, proxyCanvas.height);
        return proxyCanvas.toDataURL('image/jpeg', 0.8);
    }
    return sourceCanvas.toDataURL('image/jpeg', 0.8);
};

// --- HELPER: AUTO CROP ---
const calculateAutoCrop = (imgW: number, imgH: number, rotationDeg: number) => {
  if (rotationDeg === 0) return { top: 0, bottom: 0, left: 0, right: 0 };
  const rad = Math.abs((rotationDeg * Math.PI) / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const bbW = imgW * cos + imgH * sin;
  const bbH = imgW * sin + imgH * cos;
  const aspect = imgW / imgH;
  let scale = aspect >= 1 ? imgH / (imgW * sin + imgH * cos) : imgW / (imgW * cos + imgH * sin);
  const safeW = imgW * scale;
  const safeH = imgH * scale;
  const emptyX = bbW - safeW;
  const emptyY = bbH - safeH;
  const insetX = (emptyX / 2) / bbW * 100;
  const insetY = (emptyY / 2) / bbH * 100;
  return { top: insetY, bottom: insetY, left: insetX, right: insetX };
};

// --- Loading Overlay ---
const LoadingOverlay: React.FC<{ current: number; total: number; label?: string }> = ({ current, total, label }) => {
  const percentage = Math.round((current / total) * 100);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center select-none">
      <div className="w-64 space-y-4">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
          <span>{label || 'Processing'}</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-100 ease-out" style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-center text-[10px] text-zinc-600 font-mono">Item {current} of {total}</p>
      </div>
    </div>
  );
};

// --- Thumbnail Helper ---
const generateThumbnail = async (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scale = Math.min(150 / img.width, 150 / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : url), 'image/jpeg', 0.6);
      } else { resolve(url); }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
};

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(() => typeof window !== 'undefined' ? window.location.pathname : '/');

  // --- CDN INJECTION ---
  useEffect(() => {
    if (!(window as any).raw) {
        const s1 = document.createElement('script');
        s1.src = "https://cdn.jsdelivr.net/npm/raw.js@0.0.4/dist/raw.min.js";
        s1.async = true;
        document.body.appendChild(s1);
    }
    if (!(window as any).UTIF) {
        const s2 = document.createElement('script');
        s2.src = "https://unpkg.com/utif@3.1.0/UTIF.js";
        s2.async = true;
        document.body.appendChild(s2);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (currentPath === '/privacy') return <Privacy />;
  if (currentPath === '/terms') return <Terms />;

  const [isBeta, setIsBeta] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fstop64_beta_mode') === 'true';
    }
    return false;
  });

  const toggleBeta = () => {
    const newState = !isBeta;
    setIsBeta(newState);
    localStorage.setItem('fstop64_beta_mode', String(newState));
    window.location.reload();
  };

  if (isBeta) {
    return <BetaApp onToggleBeta={toggleBeta} />;
  }

  const { user, profile, signIn, signOut, upgradeToPro, manageSubscription, canExport, incrementExport } = useAuthSubscription();
  const { presets, savePreset, deletePreset } = usePresets(user?.id || null);

  const [modalType, setModalType] = useState<'login' | 'paywall' | 'login_prompt' | 'export_options' | null>(null);
  const [exportTarget, setExportTarget] = useState<'single' | 'batch' | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  // --- DATA STATE ---
  const [photos, setPhotos] = useState<Photo[]>([]);
  const fileRegistry = useRef<Record<string, File>>({});
  
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<EditParams | null>(null);
  const [imageElements, setImageElements] = useState<Record<string, HTMLImageElement>>({});
  
  const [exportStatus, setExportStatus] = useState<{ current: number, total: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null);
  
  const [isCropMode, setIsCropMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activePhotoId) return;
    if (imageElements[activePhotoId]) return;
    const photo = photos.find(p => p.id === activePhotoId);
    if (!photo) return;
    const img = new Image();
    img.onload = () => setImageElements(prev => ({ ...prev, [activePhotoId]: img }));
    img.src = photo.src;
  }, [activePhotoId, photos, imageElements]);

  const activePhoto = useMemo(() => photos.find(p => p.id === activePhotoId) || null, [photos, activePhotoId]);
  const activeImage = useMemo(() => activePhotoId ? imageElements[activePhotoId] : null, [imageElements, activePhotoId]);
  const editedPhotos = useMemo(() => photos.filter(p => isPhotoEdited(p.params) && !p.hiddenFromEdited), [photos]);

  const handleUpdateParams = (newParams: EditParams) => {
    if (!activePhotoId) return;

    if (activePhoto && activeImage && newParams.crop.rotation !== activePhoto.params.crop.rotation) {
        const safeCrop = calculateAutoCrop(activeImage.width, activeImage.height, newParams.crop.rotation || 0);
        newParams.crop.top = safeCrop.top;
        newParams.crop.bottom = safeCrop.bottom;
        newParams.crop.left = safeCrop.left;
        newParams.crop.right = safeCrop.right;
    }

    setPhotos(prev => prev.map(p => p.id === activePhotoId ? { ...p, params: newParams, hiddenFromEdited: false } : p));
  };

  const getFullResImage = async (photo: Photo): Promise<HTMLImageElement> => {
    const rawFile = fileRegistry.current[photo.id];
    if (rawFile && isRawFile(rawFile)) {
        console.log(`Re-decoding ${rawFile.name} for full-res export...`);
        const canvas = await decodeRawToCanvas(rawFile);
        if (canvas) {
            const img = new Image();
            img.src = canvas.toDataURL('image/jpeg', 1.0);
            await new Promise(r => img.onload = r);
            return img;
        }
    }

    if (imageElements[photo.id]) return imageElements[photo.id];
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = photo.src;
    });
  };

  const processImageToBlob = async (img: HTMLImageElement, params: EditParams, quality: number): Promise<Blob | null> => {
    let sourceCanvas = document.createElement('canvas');
    const rot = params.crop.rotation || 0;
    
    if (rot === 0) {
      sourceCanvas.width = img.width;
      sourceCanvas.height = img.height;
      sourceCanvas.getContext('2d')?.drawImage(img, 0, 0);
    } else {
      const rad = (rot * Math.PI) / 180;
      const cw = Math.abs(img.width * Math.cos(rad)) + Math.abs(img.height * Math.sin(rad));
      const ch = Math.abs(img.width * Math.sin(rad)) + Math.abs(img.height * Math.cos(rad));
      sourceCanvas.width = cw;
      sourceCanvas.height = ch;
      const ctx = sourceCanvas.getContext('2d');
      if (ctx) {
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      }
    }

    const canvas = document.createElement('canvas');
    const { crop } = params;
    const sx = (crop.left / 100) * sourceCanvas.width;
    const sy = (crop.top / 100) * sourceCanvas.height;
    const sw = sourceCanvas.width * (1 - (crop.left + crop.right) / 100);
    const sh = sourceCanvas.height * (1 - (crop.top + crop.bottom) / 100);

    if (sw <= 0 || sh <= 0) return null;

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    applyPipeline(imgData, params, sw, sh);
    ctx.putImageData(imgData, 0, 0);

    return new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
  };

  // --- TRIGGER THE MODAL ---
  const triggerExportFlow = (type: 'single' | 'batch') => {
      if (!user) { setModalType('login_prompt'); return; }
      
      const check = canExport();
      if (!check.allowed) { if (check.reason === 'quota') setModalType('paywall'); return; }

      if (type === 'batch' && !profile?.is_pro) { setModalType('paywall'); return; }
      
      setExportTarget(type);
      setModalType('export_options');
  };

  // --- EXECUTE EXPORT (Called after modal selection) ---
  const runExport = async (quality: number) => {
    setModalType(null); // Close modal

    if (exportTarget === 'single' && activePhoto) {
        try {
            setExportStatus({ current: 1, total: 1 });
            const img = await getFullResImage(activePhoto);
            const blob = await processImageToBlob(img, activePhoto.params, quality);
            if (blob) {
                saveAs(blob, `f64_${activePhoto.name.split('.')[0]}.jpg`);
                await incrementExport();
            }
        } catch(e) { console.error(e); alert("Export failed."); }
        finally { setExportStatus(null); }
    } 
    else if (exportTarget === 'batch') {
        if (editedPhotos.length === 0) return;
        setBatchProgress({ current: 0, total: editedPhotos.length });
        try {
            for (let i = 0; i < editedPhotos.length; i++) {
                const photo = editedPhotos[i];
                const img = await getFullResImage(photo);
                const blob = await processImageToBlob(img, photo.params, quality);
                if (blob) {
                    saveAs(blob, `f64_${photo.name.split('.')[0]}.jpg`);
                    await incrementExport();
                }
                setBatchProgress({ current: i + 1, total: editedPhotos.length });
                await new Promise(r => setTimeout(r, 800)); 
            }
        } catch(e) { console.error(e); alert("Batch failed."); }
        finally { setBatchProgress(null); }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setImportProgress({ current: 0, total: fileList.length });
    const newPhotos: Photo[] = [];

    if (!(window as any).raw && !(window as any).UTIF) {
        console.log("Waiting for decoders...");
        await new Promise(r => setTimeout(r, 1000));
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      let proxyUrl = '';
      
      const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

      if (isRawFile(file)) {
          fileRegistry.current[id] = file;
          const canvas = await decodeRawToCanvas(file);
          if (canvas) {
              proxyUrl = await createProxyUrl(canvas);
          } else {
              proxyUrl = createErrorImage(file.name);
          }
      } else {
          proxyUrl = URL.createObjectURL(file);
      }
      
      const thumbUrl = await generateThumbnail(proxyUrl);
      
      newPhotos.push({ 
        id, 
        name: file.name, 
        src: proxyUrl, 
        thumbnailSrc: thumbUrl,
        params: { ...DEFAULT_PARAMS } 
      });
      setImportProgress({ current: i + 1, total: fileList.length });
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
    }
    
    setPhotos(prev => [...prev, ...newPhotos]);
    if (!activePhotoId && newPhotos.length > 0) setActivePhotoId(newPhotos[0].id);
    
    await new Promise(r => setTimeout(r, 300));
    setImportProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-[#d4d4d4] overflow-hidden">
      {/* --- ADDED EXPORT STATUS LOADING BAR HERE --- */}
      {importProgress && <LoadingOverlay current={importProgress.current} total={importProgress.total} label="Importing" />}
      {batchProgress && <LoadingOverlay current={batchProgress.current} total={batchProgress.total} label="Processing Export" />}
      {exportStatus && <LoadingOverlay current={exportStatus.current} total={exportStatus.total} label="Exporting" />}

      <TopBar 
        onOpen={() => fileInputRef.current?.click()} 
        onExport={() => triggerExportFlow('single')}
        onReset={() => handleUpdateParams(DEFAULT_PARAMS)}
        onCopy={() => activePhoto && setClipboard({ ...activePhoto.params })}
        onPaste={() => clipboard && handleUpdateParams({ ...clipboard })}
        canPaste={!!clipboard}
        isExporting={!!exportStatus}
        user={user}
        profile={profile}
        onSignIn={signIn}
        onSignOut={signOut}
        onUpgrade={upgradeToPro}
        onManage={manageSubscription}
        isBeta={false} 
        onToggleBeta={toggleBeta}
        onAbout={() => setShowAbout(true)} 
      />
      
      {modalType === 'login' && <LoginModal onClose={() => setModalType(null)} onAction={() => { signIn(); setModalType(null); }} />}
      {modalType === 'paywall' && <PaywallModal isMock={isMockMode} onClose={() => setModalType(null)} onAction={() => { upgradeToPro(); setModalType(null); }} />}
      {modalType === 'login_prompt' && <LoginPromptModal onClose={() => setModalType(null)} onSignIn={() => { signIn(); setModalType(null); }} />}
      {modalType === 'export_options' && <ExportOptionsModal onClose={() => setModalType(null)} onConfirm={runExport} />}
      
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,.arw,.cr2,.cr3,.nef,.dng,.orf,.raf,.rw2,.pef,.srw,.tif,.tiff" 
        multiple 
        onChange={handleFileChange} 
      />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col bg-[#1a1a1a] min-w-0 overflow-hidden h-1/2 md:h-auto">
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
            {activeImage ? (
              <Viewport image={activeImage} params={activePhoto!.params} isCropMode={isCropMode} onUpdateCrop={(crop) => handleUpdateParams({ ...activePhoto!.params, crop })} />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-700 text-center animate-pulse">
                 <div className="w-16 h-16 mb-4 text-zinc-800">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-all border border-zinc-700 hover:border-zinc-500"
                >
                    Import Photos
                </button>
                <div className="mt-4 flex flex-col items-center gap-1">
                   <span className="text-xs text-zinc-600">JPG, PNG, RAW (ARW, CR2, NEF, DNG...)</span>
                   <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                      Free login required to export
                   </span>
                </div>
              </div>
            )}
          </div>
          
          <Filmstrip 
            photos={photos} 
            activePhotoId={activePhotoId} 
            onSelect={setActivePhotoId} 
            onAdd={() => fileInputRef.current?.click()}
            onExportSpecific={() => triggerExportFlow('single')} 
          />
        </div>

        <aside className="w-full md:w-80 h-1/2 md:h-full bg-[#1e1e1e] border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col z-10 shadow-2xl flex-shrink-0">
          <Sidebar 
            params={activePhoto?.params || DEFAULT_PARAMS} 
            onChange={handleUpdateParams}
            presets={presets}
            onSavePreset={(name) => activePhoto && savePreset(name || `Preset ${presets.length + 1}`, activePhoto.params)}
            onApplyPreset={(p) => handleUpdateParams({ ...p.params })}
            onDeletePreset={deletePreset}
            editedPhotos={editedPhotos}
            onBatchExportEdited={() => triggerExportFlow('batch')} 
            onSelectPhoto={setActivePhotoId}
            onDismissPhoto={(id) => setPhotos(prev => prev.map(p => p.id === id ? { ...p, hiddenFromEdited: true } : p))}
            onUndoDismiss={() => {}}
            hasLastDismissed={false}
            isCropMode={isCropMode}
            onToggleCropMode={() => setIsCropMode(!isCropMode)}
          />
        </aside>
      </div>
    </div>
  );
};

export default App;
