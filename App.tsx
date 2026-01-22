import React, { useState, useRef, useEffect, useMemo } from 'react';
import { saveAs } from 'file-saver';
import exifr from 'exifr';
import { EditParams, DEFAULT_PARAMS, Photo, isPhotoEdited } from './types';
import Sidebar from './components/Sidebar';
import Viewport from './components/Viewport';
import TopBar from './components/TopBar';
import Filmstrip from './components/Filmstrip';
import { applyPipeline } from './engine';
import { useAuthSubscription } from './hooks/useAuthSubscription';
import { usePresets } from './hooks/usePresets';
import { LoginModal, PaywallModal, LoginPromptModal } from './components/AuthModals';
import AboutModal from './components/AboutModal';
import { isMockMode } from './lib/supabase';
import BetaApp from './BetaApp';
import Privacy from './Privacy';
import Terms from './Terms';

// --- HELPER: RAW DETECTION ---
const isRawFile = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['arw', 'cr2', 'cr3', 'nef', 'dng', 'orf', 'raf', 'rw2', 'pef', 'srw'].includes(ext || '');
};

// --- HELPER: ROBUST RAW LOADER ---
const loadRawImage = async (file: File): Promise<string | null> => {
  try {
    // 1. Try extracting the largest embedded JPEG preview
    let blob = await exifr.preview(file);
    
    // 2. If no large preview, try the smaller thumbnail
    if (!blob) {
      console.warn("No large preview found, trying thumbnail...");
      blob = await exifr.thumbnail(file);
    }

    if (blob) {
      return URL.createObjectURL(blob);
    }
    
    return null;
  } catch (e) {
    console.error("Failed to parse RAW:", e);
    return null;
  }
};

// --- HELPER: AUTO CROP MATH ---
const calculateAutoCrop = (imgW: number, imgH: number, rotationDeg: number) => {
  if (rotationDeg === 0) return { top: 0, bottom: 0, left: 0, right: 0 };

  const rad = Math.abs((rotationDeg * Math.PI) / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const bbW = imgW * cos + imgH * sin;
  const bbH = imgW * sin + imgH * cos;

  const aspect = imgW / imgH;
  let scale = 1;

  if (aspect >= 1) {
      scale = imgH / (imgW * sin + imgH * cos);
  } else {
      scale = imgW / (imgW * cos + imgH * sin);
  }

  const safeW = imgW * scale;
  const safeH = imgH * scale;
  
  const emptyX = bbW - safeW;
  const emptyY = bbH - safeH;

  const insetX = (emptyX / 2) / bbW * 100;
  const insetY = (emptyY / 2) / bbH * 100;

  return {
    top: insetY,
    bottom: insetY,
    left: insetX,
    right: insetX
  };
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
const generateThumbnail = async (file: File, existingUrl?: string): Promise<string> => {
  // If we already extracted a URL for the main view (from RAW), reuse it to make a small thumb
  const sourceUrl = existingUrl || (isRawFile(file) ? await loadRawImage(file) : URL.createObjectURL(file));

  // If RAW extraction completely failed, return a placeholder or empty
  if (!sourceUrl) return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Force consistent thumbnail size
      const scale = Math.min(150 / img.width, 150 / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : sourceUrl), 'image/jpeg', 0.6);
      } else {
          resolve(sourceUrl);
      }
    };
    img.onerror = () => {
        // If image fails to load, resolve with transparent pixel or error placeholder
        resolve(''); 
    };
    img.src = sourceUrl;
  });
};

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(() => typeof window !== 'undefined' ? window.location.pathname : '/');

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

  const [modalType, setModalType] = useState<'login' | 'paywall' | 'login_prompt' | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
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
    // Important: Handle error if the blob URL is invalid
    img.onerror = () => {
        console.error("Could not load image source for:", photo.name);
    };
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
    if (imageElements[photo.id]) return imageElements[photo.id];
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = photo.src;
    });
  };

  const processImageToBlob = async (img: HTMLImageElement, params: EditParams): Promise<Blob | null> => {
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

    return new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.95));
  };

  const processExportWithGate = async (photo: Photo) => {
    if (!user) {
      setModalType('login_prompt');
      return;
    }

    const check = canExport();
    if (!check.allowed) {
      if (check.reason === 'quota') setModalType('paywall');
      return;
    }

    try {
      setExportStatus({ current: 1, total: 1 });
      const img = await getFullResImage(photo);
      const blob = await processImageToBlob(img, photo.params);
      
      if (blob) {
        saveAs(blob, `f64_${photo.name.split('.')[0]}.jpg`);
        await incrementExport();
      }
    } catch (e) {
      console.error(e);
      alert("Export failed.");
    } finally {
      setExportStatus(null);
    }
  };

  const handleBatchExport = async () => {
    if (!user) {
        setModalType('login_prompt');
        return;
    }

    if (!profile?.is_pro) {
      setModalType('paywall');
      return;
    }

    if (editedPhotos.length === 0) return;

    setBatchProgress({ current: 0, total: editedPhotos.length });

    try {
      for (let i = 0; i < editedPhotos.length; i++) {
        const photo = editedPhotos[i];
        
        const img = await getFullResImage(photo);
        const blob = await processImageToBlob(img, photo.params);
        
        if (blob) {
          saveAs(blob, `f64_${photo.name.split('.')[0]}.jpg`);
          await incrementExport();
        }

        setBatchProgress({ current: i + 1, total: editedPhotos.length });
        await new Promise(r => setTimeout(r, 800)); 
      }

    } catch (e) {
      console.error("Batch failed", e);
      alert("Batch export failed. See console.");
    } finally {
      setBatchProgress(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setImportProgress({ current: 0, total: fileList.length });
    const newPhotos: Photo[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      let fullResUrl = '';
      
      // 1. Try to extract RAW
      if (isRawFile(file)) {
          const rawUrl = await loadRawImage(file);
          if (rawUrl) {
              fullResUrl = rawUrl;
          } else {
              // Failed to extract raw, skip this file or alert user
              console.warn(`Could not extract preview for ${file.name}`);
              setImportProgress({ current: i + 1, total: fileList.length });
              continue; 
          }
      } else {
          // Standard Image
          fullResUrl = URL.createObjectURL(file);
      }
      
      // 2. Generate Thumb from the URL we just made (reusing it saves memory/time)
      const thumbUrl = await generateThumbnail(file, fullResUrl);
      
      const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      
      newPhotos.push({ 
        id, 
        name: file.name, 
        src: fullResUrl, 
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
      {importProgress && <LoadingOverlay current={importProgress.current} total={importProgress.total} label="Importing" />}
      {batchProgress && <LoadingOverlay current={batchProgress.current} total={batchProgress.total} label="Processing Export" />}

      <TopBar 
        onOpen={() => fileInputRef.current?.click()} 
        onExport={() => activePhoto && processExportWithGate(activePhoto)}
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
      
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,.arw,.cr2,.cr3,.nef,.dng,.orf,.raf,.rw2,.pef,.srw" 
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
            onExportSpecific={(photo) => processExportWithGate(photo)}
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
            onBatchExportEdited={handleBatchExport} 
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
