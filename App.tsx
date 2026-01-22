import React, { useState, useRef, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { EditParams, DEFAULT_PARAMS, Photo, Preset, isPhotoEdited } from './types';
import Sidebar from './components/Sidebar';
import Viewport from './components/Viewport';
import TopBar from './components/TopBar';
import Filmstrip from './components/Filmstrip';
import { applyPipeline } from './engine';
import { useAuthSubscription } from './hooks/useAuthSubscription';
import { usePresets } from './hooks/usePresets'; // <--- Ensure this file exists
import { LoginModal, PaywallModal } from './components/AuthModals';
import { isMockMode } from './lib/supabase';
import BetaApp from './BetaApp';

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

const generateThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = Math.min(150 / img.width, 150 / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : e.target?.result as string), 'image/jpeg', 0.7);
        } else {
            resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  // 1. --- BETA MODE LOGIC ---
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

  // 2. --- STABLE APP LOGIC ---
  const { user, profile, signIn, signOut, upgradeToPro, manageSubscription, canExport, incrementExport } = useAuthSubscription();
  const { presets, savePreset, deletePreset } = usePresets(user?.id || null);

  const [modalType, setModalType] = useState<'login' | 'paywall' | null>(null);
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
    const demoPhotos = [
      { id: '1', name: 'Coastline.jpg', src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80', thumbnailSrc: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=60', params: { ...DEFAULT_PARAMS } },
      { id: '2', name: 'Urban.jpg', src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=2000&q=80', thumbnailSrc: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=60', params: { ...DEFAULT_PARAMS } },
    ];
    setPhotos(demoPhotos);
    setActivePhotoId('1');
    demoPhotos.forEach(p => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = p.src;
      img.onload = () => setImageElements(prev => ({ ...prev, [p.id]: img }));
    });
  }, []);

  useEffect(() => {
    if (!activePhotoId) return;
    if (imageElements[activePhotoId]) return;
    const photo = photos.find(p => p.id === activePhotoId);
    if (!photo) return;
    const img = new Image();
    if (photo.src.startsWith('http')) img.crossOrigin = "anonymous";
    img.onload = () => setImageElements(prev => ({ ...prev, [activePhotoId]: img }));
    img.src = photo.src;
  }, [activePhotoId, photos, imageElements]);

  const activePhoto = useMemo(() => photos.find(p => p.id === activePhotoId) || null, [photos, activePhotoId]);
  const activeImage = useMemo(() => activePhotoId ? imageElements[activePhotoId] : null, [imageElements, activePhotoId]);
  const editedPhotos = useMemo(() => photos.filter(p => isPhotoEdited(p.params) && !p.hiddenFromEdited), [photos]);

  const handleUpdateParams = (newParams: EditParams) => {
    if (!activePhotoId) return;
    setPhotos(prev => prev.map(p => p.id === activePhotoId ? { ...p, params: newParams, hiddenFromEdited: false } : p));
  };

  const getFullResImage = async (photo: Photo): Promise<HTMLImageElement> => {
    if (imageElements[photo.id]) return imageElements[photo.id];
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (photo.src.startsWith('http')) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = photo.src;
    });
  };

  const processImageToBlob = async (img: HTMLImageElement, params: EditParams): Promise<Blob | null> => {
    // 1. ROTATION STEP
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

    // 2. CROP & PIPELINE STEP
    const canvas = document.createElement('canvas');
    const { crop } = params;
    const sx = (crop.left / 100) * sourceCanvas.width;
    const sy = (crop.top / 100) * sourceCanvas.height;
    const sw = sourceCanvas.width * (1 - (crop.left + crop.right) / 100);
    const sh = sourceCanvas.height * (1 - (crop.top + crop.bottom) / 100);

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
    const check = canExport();
    if (!check.allowed) {
      if (check.reason === 'auth') setModalType('login');
      else if (check.reason === 'quota') setModalType('paywall');
      return;
    }

    try {
      setExportStatus({ current: 1, total: 1 });
      const img = await getFullResImage(photo);
      const blob = await processImageToBlob(img, photo.params);
      
      if (blob) {
        saveAs(blob, `f64_${photo.name}`);
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
    if (!profile?.is_pro) {
      setModalType('paywall');
      return;
    }

    if (editedPhotos.length === 0) return;

    const zip = new JSZip();
    setBatchProgress({ current: 0, total: editedPhotos.length });

    try {
      for (let i = 0; i < editedPhotos.length; i++) {
        const photo = editedPhotos[i];
        const img = await getFullResImage(photo);
        const blob = await processImageToBlob(img, photo.params);
        if (blob) zip.file(`f64_${photo.name}`, blob);

        setBatchProgress({ current: i + 1, total: editedPhotos.length });
        if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `fstop64_batch_${new Date().toISOString().slice(0,10)}.zip`);

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
      const fullResUrl = URL.createObjectURL(file);
      const thumbUrl = await generateThumbnail(file);
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
      {batchProgress && <LoadingOverlay current={batchProgress.current} total={batchProgress.total} label="Zipping Batch" />}

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
      />
      
      {modalType === 'login' && <LoginModal onClose={() => setModalType(null)} onAction={() => { signIn(); setModalType(null); }} />}
      {modalType === 'paywall' && <PaywallModal isMock={isMockMode} onClose={() => setModalType(null)} onAction={() => { upgradeToPro(); setModalType(null); }} />}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col bg-[#1a1a1a] min-w-0 overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
            {activeImage ? (
              <Viewport image={activeImage} params={activePhoto!.params} isCropMode={isCropMode} onUpdateCrop={(crop) => handleUpdateParams({ ...activePhoto!.params, crop })} />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-700 animate-pulse">
                {activePhotoId ? (
                  <>
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-xs font-bold uppercase tracking-widest">Loading High-Res Asset...</span>
                  </>
                ) : (
                  <span className="font-medium text-sm">Select an asset to begin developing</span>
                )}
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

        <aside className="w-80 bg-[#1e1e1e] border-l border-zinc-800 flex flex-col h-full z-10 shadow-2xl flex-shrink-0">
          <Sidebar 
            params={activePhoto?.params || DEFAULT_PARAMS} 
            onChange={handleUpdateParams}
            
            // PRESET PROPS
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
