import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RetroCamera } from './components/RetroCamera';
import { Polaroid } from './components/Polaroid';
import { PhotoData, Coordinates } from './types';
import { RotateCcw, Trash2, Info, Download } from 'lucide-react';

export default function App() {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Coordinates>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Load photos from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('retro-snap-photos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Ensure loaded photos aren't "developing" anymore
          setPhotos(parsed.map(p => ({ ...p, isDeveloping: false })));
        }
      }
    } catch (e) {
      console.error("Failed to load photos", e);
    }
  }, []);

  // Auto-save whenever photos change
  useEffect(() => {
    if (photos.length > 0) {
      try {
        localStorage.setItem('retro-snap-photos', JSON.stringify(photos));
      } catch (e) {
        console.error("Storage full", e);
      }
    }
  }, [photos]);

  const handleDownload = async () => {
    if (!containerRef.current) return;

    // Notify user processing has started
    showNotification("Developing full wall scan...", 'success');

    try {
      // Dynamic check for the library
      // @ts-ignore
      if (!window.html2canvas) {
        showNotification("Export tool not loaded yet", 'error');
        return;
      }

      // @ts-ignore
      const canvas = await window.html2canvas(containerRef.current, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#e0d8c8', // Ensure background color is captured
        scale: 2, // Higher quality
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight
      });

      const link = document.createElement('a');
      link.download = `retro-snap-wall-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification("Wall photo downloaded!", 'success');
    } catch (err) {
      console.error(err);
      showNotification("Failed to generate image", 'error');
    }
  };

  const handleClear = () => {
    if (confirm("Clear all photos from your wall? This cannot be undone.")) {
      setPhotos([]);
      localStorage.removeItem('retro-snap-photos');
      showNotification("Wall cleared.", 'success');
    }
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle dragging from camera logic
  const handleTakePaper = (photo: PhotoData, rect: DOMRect) => {
    // Calculate position relative to container
    const newPhoto = {
      ...photo,
      x: rect.left,
      y: rect.top,
    };

    setPhotos((prev) => [...prev, newPhoto]);
    
    // Automatically start dragging this new photo
    setDraggingPhotoId(newPhoto.id);
    setDragOffset({ x: rect.width / 2, y: rect.height / 4 });
    
    if (showInstructions) setShowInstructions(false);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDraggingPhotoId(id);
    setDragOffset({
      x: clientX - photo.x,
      y: clientY - photo.y
    });
    
    // Move to top of stack
    setPhotos(prev => {
      const others = prev.filter(p => p.id !== id);
      return [...others, photo];
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingPhotoId) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setPhotos(prev => prev.map(photo => {
      if (photo.id === draggingPhotoId) {
        return {
          ...photo,
          x: clientX - dragOffset.x,
          y: clientY - dragOffset.y
        };
      }
      return photo;
    }));
  }, [draggingPhotoId, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggingPhotoId(null);
  }, []);

  useEffect(() => {
    if (draggingPhotoId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingPhotoId, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#e0d8c8]"
      style={{
        backgroundImage: `
          radial-gradient(#c2bba8 1px, transparent 1px),
          radial-gradient(#c2bba8 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 10px 10px'
      }}
    >
      {/* Header / Tooltip - Ignore for screenshot */}
      <div className="absolute top-0 left-0 w-full p-2 md:p-4 flex justify-between items-start pointer-events-none z-10" data-html2canvas-ignore="true">
        <div className={`
          bg-white/90 backdrop-blur-sm p-3 md:p-4 rounded-xl shadow-lg border border-stone-200 
          max-w-[70%] md:max-w-md transition-opacity duration-500 pointer-events-auto
          text-xs md:text-sm
          ${showInstructions ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
        `}>
          <h2 className="font-bold text-stone-800 flex items-center gap-2">
            <Info className="w-4 h-4" /> How to use
          </h2>
          <p className="text-stone-600 mt-1 leading-tight">
            1. Snap a photo.<br/>
            2. Wait for it to eject.<br/>
            3. <strong>Drag</strong> photo to wall!<br/>
            4. Watch it develop.
          </p>
        </div>
        
        <div className="flex gap-2 pointer-events-auto">
          {photos.length > 0 && (
            <>
                <button 
                    onClick={handleDownload}
                    className="bg-blue-50 text-blue-500 p-2 rounded-full hover:bg-blue-100 transition-colors shadow-sm border border-blue-100"
                    title="Download Wall Image"
                >
                    <Download className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleClear}
                    className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors shadow-sm border border-red-100"
                    title="Clear All Photos (Reset Wall)"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification - Ignore for screenshot */}
      {notification && (
        <div className={`
            absolute top-20 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded-full shadow-xl z-50 font-medium text-sm transition-all pointer-events-none text-center w-max max-w-[90%]
            ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}
        `} data-html2canvas-ignore="true">
            {notification.msg}
        </div>
      )}

      {/* Photo Wall Layer */}
      {photos.map((photo) => (
        <div
          key={photo.id}
          style={{
            position: 'absolute',
            left: photo.x,
            top: photo.y,
            zIndex: draggingPhotoId === photo.id ? 50 : 1,
            // Remove touch action to allow our custom JS drag handling
            touchAction: 'none' 
          }}
        >
          <Polaroid
            url={photo.url}
            timestamp={photo.timestamp}
            rotation={photo.rotation}
            isDeveloping={photo.isDeveloping}
            filterType={photo.filterType}
            isDraggable={true}
            onMouseDown={(e) => handleMouseDown(e, photo.id)}
            onDelete={() => handleDeletePhoto(photo.id)}
            className="hover:scale-105 transition-transform duration-200"
          />
        </div>
      ))}

      {/* Camera UI Layer - RetroCamera component has internal ignore tag */}
      <RetroCamera onTakePaper={handleTakePaper} />
      
      {/* Dragging Overlay hint */}
      {draggingPhotoId && (
        <div className="fixed inset-0 cursor-grabbing z-[60] pointer-events-none" data-html2canvas-ignore="true"></div>
      )}
    </div>
  );
}