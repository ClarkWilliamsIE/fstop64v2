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
import { LoginModal, PaywallModal } from './components/AuthModals';
import { isMockMode } from './lib/supabase';

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

// !!! THIS IS THE BETA APP COMPONENT !!!
// Edit this component freely. It will not affect the main App.tsx.
interface BetaAppProps {
  onToggleBeta: () => void; // Prop to switch back to stable
}

const BetaApp: React.FC<BetaAppProps> = ({ onToggleBeta }) => {
  const { user, profile, signIn, signOut, upgradeToPro, canExport, incrementExport } = useAuthSubscription();
  const [modalType, setModalType] = useState<'login' | 'paywall' | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [clipboard, setClipboard] = useState<EditParams | null>(null);
  const [imageElements, setImageElements] = useState<Record<string, HTMLImageElement>>({});
  
  const [exportStatus, setExportStatus] = useState<{ current: number, total: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number } | null>(null);
  
  const [isCropMode, setIsCropMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial Demo Data
    const demoPhotos = [
      { id: '1', name: 'Coastline.jpg', src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80', thumbnailSrc: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=60', params: { ...DEFAULT_PARAMS } },
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

  // ... (Lazy Loading & Helpers omitted for brevity, logic assumes they are same as App.tsx)
  // You can copy the full helper functions from App.tsx here if you need to modify them.
  // For now, I'll include the critical ones inline or you can import them if you move them to a 'utils.ts' file later.
  
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
     // ... (Same as App.tsx logic) ...
     const canvas = document.createElement('canvas');
     const { crop } = params;
     const sx = (crop.left / 100) * img.width;
     const sy = (crop.top / 100) * img.height;
     const sw = img.width * (1 - (crop.left + crop.right) / 100);
     const sh = img.height * (1 - (crop.top + crop.bottom) / 100);
     canvas.width = sw; canvas.height = sh;
     const ctx = canvas.getContext('2d');
     if (!ctx) return null;
     ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
     const imgData = ctx.getImageData(0, 0, sw, sh);
     applyPipeline(imgData, params, sw, sh);
     ctx.putImageData(imgData, 0, 0);
     return new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.95));
  };

  const processExportWithGate = async (photo: Photo) => {
    /* Copy logic from App.tsx */
    const check = canExport();
    if (!check.allowed) {
        if (check.reason === 'auth') setModalType('login');
        else if (check.reason === 'quota') setModalType('paywall');
        return;
    }
    setExportStatus({ current: 1, total: 1 });
    const img = await getFullResImage(photo);
    const blob = await processImageToBlob(img, photo.params);
    if(blob) { saveAs(blob, `f64_${photo.name}`); await incrementExport(); }
    setExportStatus(null);
  };

  const handleBatchExport = async () => {
    /* Copy logic from App.tsx */
    if (!profile?.is_pro) { setModalType('paywall'); return; }
    const zip = new JSZip();
    setBatchProgress({ current: 0, total: photos.length }); // logic simplified
    // ... insert loop ...
    setBatchProgress(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    /* Copy logic from App.tsx */
  };

  const handleUpdateParams = (newParams: EditParams) => {
    if (!activePhotoId) return;
    setPhotos(prev => prev.map(p => p.id === activePhotoId ? { ...p, params: newParams, hiddenFromEdited: false } : p));
  };

  // --- RENDER ---
  const activePhoto = useMemo(() => photos.find(p => p.id === activePhotoId) || null, [photos, activePhotoId]);
  const activeImage = useMemo(() => activePhotoId ? imageElements[activePhotoId] : null, [imageElements, activePhotoId]);
  const editedPhotos = useMemo(() => photos.filter(p => isPhotoEdited(p.params) && !p.hiddenFromEdited), [photos]);

  return (
    // RED BORDER INDICATOR
    <div className="flex flex-col h-screen bg-[#121212] text-[#d4d4d4] overflow-hidden border-4 border-red-900/50">
      
      {/* BETA BADGE */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-4 py-1 rounded-b-lg z-[100] shadow-lg shadow-red-500/20 pointer-events-none">
        BETA MODE - EXPERIMENTAL
      </div>

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
        // BETA TOGGLE
        isBeta={true}
        onToggleBeta={onToggleBeta}
      />
      
      {/* ... Rest of your render logic (Viewport, Filmstrip, Sidebar) ... */}
      {/* Just copy the JSX from App.tsx here */}
      <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 flex flex-col bg-[#1a1a1a] min-w-0 overflow-hidden">
             <Viewport image={activeImage!} params={activePhoto?.params || DEFAULT_PARAMS} isCropMode={isCropMode} onUpdateCrop={() => {}} />
             <Filmstrip photos={photos} activePhotoId={activePhotoId} onSelect={setActivePhotoId} onAdd={()=>{}} onExportSpecific={()=>{}} />
          </div>
          <div className="w-80 bg-[#1e1e1e]">
             {/* Beta Sidebar? */}
             <Sidebar 
                params={activePhoto?.params || DEFAULT_PARAMS} 
                onChange={handleUpdateParams} 
                presets={presets} 
                onSavePreset={()=>{}} 
                onApplyPreset={()=>{}} 
                editedPhotos={editedPhotos} 
                onBatchExportEdited={()=>{}} 
                onSelectPhoto={()=>{}} 
                onDismissPhoto={()=>{}} 
                onUndoDismiss={()=>{}} 
                hasLastDismissed={false} 
                isCropMode={isCropMode} 
                onToggleCropMode={() => setIsCropMode(!isCropMode)} 
             />
          </div>
      </div>

    </div>
  );
};

export default BetaApp;
