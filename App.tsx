import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EditParams, DEFAULT_PARAMS, Photo, Preset, isPhotoEdited } from './types';
import Sidebar from './components/Sidebar';
import Viewport from './components/Viewport';
import TopBar from './components/TopBar';
import Filmstrip from './components/Filmstrip';
import { applyPipeline } from './engine';
import { useAuthSubscription } from './hooks/useAuthSubscription';
import { LoginModal, PaywallModal } from './components/AuthModals';
import { isMockMode } from './lib/supabase';

const LoadingOverlay: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const percentage = Math.round((current / total) * 100);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center select-none">
      <div className="w-64 space-y-4">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
          <span>Generating Thumbnails</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-100 ease-out" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-center text-[10px] text-zinc-600 font-mono">
          Processing {current} of {total}
        </p>
      </div>
    </div>
  );
};

// --- Helper: Generate tiny thumbnail ---
const generateThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // Max thumbnail size 150px
        const scale = Math.min(150 / img.width, 150 / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (blob) resolve(URL.createObjectURL(blob));
                else resolve(e.target?.result as string); // Fallback
            }, 'image/jpeg', 0.7);
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
  const { user, profile, signIn, signOut, upgradeToPro, canExport, incrementExport } = useAuthSubscription();
  const [modalType, setModalType] = useState<'login' | 'paywall' | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [clipboard, setClipboard] = useState<EditParams | null>(null);
  
  const [imageElements, setImageElements] = useState<Record<string, HTMLImageElement>>({});
  
  const [exportStatus, setExportStatus] = useState<{ current: number, total: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  const [isCropMode, setIsCropMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial Demo Photos - We just reuse src as thumbnail for these since they are web URLs
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
    
    img.onload = () => {
      setImageElements(prev => ({ ...prev, [activePhotoId]: img }));
    };
    img.src = photo.src;

  }, [activePhotoId, photos, imageElements]);

  const activePhoto = useMemo(() => photos.find(p => p.id === activePhotoId) || null, [photos, activePhotoId]);
  const activeImage = useMemo(() => activePhotoId ? imageElements[activePhotoId] : null, [imageElements, activePhotoId]);
  const editedPhotos = useMemo(() => photos.filter(p => isPhotoEdited(p.params) && !p.hiddenFromEdited), [photos]);

  const handleUpdateParams = (newParams: EditParams) => {
    if (!activePhotoId) return;
    setPhotos(prev => prev.map(p => p.id === activePhotoId ? { ...p, params: newParams, hiddenFromEdited: false } : p));
  };

  const processExportWithGate = async (photo: Photo, img: HTMLImageElement) => {
    const check = canExport();
    if (!check.allowed) {
      if (check.reason === 'auth') setModalType('login');
      else if (check.reason === 'quota') setModalType('paywall');
      return;
    }

    const canvas = document.createElement('canvas');
    const { crop } = photo.params;
    const sx = (crop.left / 100) * img.width;
    const sy = (crop.top / 100) * img.height;
    const sw = img.width * (1 - (crop.left + crop.right) / 100);
    const sh = img.height * (1 - (crop.top + crop.bottom) / 100);

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const imgData = ctx.getImageData(0, 0, sw, sh);
      applyPipeline(imgData, photo.params, sw, sh);
      ctx.putImageData(imgData, 0, 0);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.95));
      if (blob) {
        const link = document.createElement('a');
        link.download = `f64_${photo.name}`;
        link.href = URL.createObjectURL(blob);
        link.click();
        await incrementExport();
      }
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
      
      // 1. Create heavy full-res URL (instant)
      const fullResUrl = URL.createObjectURL(file);
      
      // 2. Generate light-weight thumbnail (async)
      // This ensures the filmstrip doesn't choke the browser
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
      
      // Yield to main thread to keep UI responsive
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    
    if (!activePhotoId && newPhotos.length > 0) {
      setActivePhotoId(newPhotos[0].id);
    }

    await new Promise(r => setTimeout(r, 300));
    setImportProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-[#d4d4d4] overflow-hidden">
      {importProgress && <LoadingOverlay current={importProgress.current} total={importProgress.total} />}

      <TopBar 
        onOpen={() => fileInputRef.current?.click()} 
        onExport={() => activePhoto && activeImage && processExportWithGate(activePhoto, activeImage)}
        onReset={() => handleUpdateParams(DEFAULT_PARAMS)}
        onCopy={() => activePhoto && setClipboard({ ...activePhoto.params })}
        onPaste={() => clipboard && handleUpdateParams({ ...clipboard })}
        canPaste={!!clipboard}
        isExporting={!!exportStatus}
        user={user}
        profile={profile}
        onSignIn={signIn}
        onSignOut={signOut}
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
            onExportSpecific={(photo) => {
              const img = imageElements[photo.id];
              if (img) processExportWithGate(photo, img);
            }}
          />
        </div>

        <aside className="w-80 bg-[#1e1e1e] border-l border-zinc-800 flex flex-col h-full z-10 shadow-2xl flex-shrink-0">
          <Sidebar 
            params={activePhoto?.params || DEFAULT_PARAMS} 
            onChange={handleUpdateParams}
            presets={presets}
            onSavePreset={(name) => activePhoto && setPresets(prev => [...prev, { id: Date.now().toString(), name: name || `New Preset`, params: { ...activePhoto.params } }])}
            onApplyPreset={(p) => handleUpdateParams({ ...p.params })}
            editedPhotos={editedPhotos}
            onBatchExportEdited={() => alert("Batch export available for PRO members.")}
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
