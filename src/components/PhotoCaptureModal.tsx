import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface PhotoCaptureModalProps {
  currentPhotoUrl: string;
  onPhotoSelected: (url: string) => void;
  onClose: () => void;
}

const PRESET_PHOTOS = [
  { name: 'Medicamento / Antiparasitario', url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=400' },
  { name: 'Alimento concentrado perro', url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=400' },
  { name: 'Alimento concentrado gato', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400' },
  { name: 'Cachorro / Vacuna', url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=400' },
  { name: 'Shampoo / Higiene', url: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?auto=format&fit=crop&q=80&w=400' },
  { name: 'Jeringas / Insumos', url: 'https://images.unsplash.com/photo-1583912267670-6575ad472688?auto=format&fit=crop&q=80&w=400' },
  { name: 'Vitaminas / Suplemento', url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=400' },
  { name: 'Collar / Accesorio', url: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?auto=format&fit=crop&q=80&w=400' },
];

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  currentPhotoUrl,
  onPhotoSelected,
  onClose,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'presets'>('camera');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string>(currentPhotoUrl);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setCameraStream(stream);
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('La cámara no está disponible en este navegador.');
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos o sube una imagen.');
      setIsCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (activeMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeMode]);

  // Take photo from video stream
  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setTempPhotoUrl(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTempPhotoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    stopCamera();
    onPhotoSelected(tempPhotoUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div 
        id="photo-modal-card"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div>
            <h3 className="font-semibold text-stone-900 text-lg">Fotografía del Producto</h3>
            <p className="text-xs text-stone-500">Toma una foto con tu cámara o selecciona un archivo</p>
          </div>
          <button
            id="close-photo-modal-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-stone-100 bg-stone-50/40 p-2 gap-2 text-sm font-medium">
          <button
            id="tab-camera-btn"
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeMode === 'camera'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Camera className="w-4 h-4" />
            Tomar foto
          </button>
          <button
            id="tab-upload-btn"
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeMode === 'upload'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            Subir archivo
          </button>
          <button
            id="tab-presets-btn"
            type="button"
            onClick={() => setActiveMode('presets')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeMode === 'presets'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Galería
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* CAMERA MODE */}
          {activeMode === 'camera' && (
            <div className="flex flex-col items-center">
              {cameraError ? (
                <div className="w-full p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-sm flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Cámara no accesible</p>
                    <p className="text-xs text-amber-800 mt-1">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setActiveMode('upload')}
                      className="mt-2 text-xs font-semibold text-emerald-800 underline"
                    >
                      Usar opción de subir fotografía desde el equipo
                    </button>
                  </div>
                </div>
              ) : isCameraActive ? (
                <div className="relative w-full aspect-4/3 bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 inset-x-0 flex justify-center">
                    <button
                      id="capture-snapshot-btn"
                      type="button"
                      onClick={captureSnapshot}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-full font-medium shadow-lg flex items-center gap-2 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      Capturar fotografía
                    </button>
                  </div>
                </div>
              ) : tempPhotoUrl ? (
                <div className="flex flex-col items-center w-full">
                  <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden border-2 border-emerald-600 shadow-md">
                    <img
                      src={tempPhotoUrl}
                      alt="Foto capturada"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-3 text-xs text-stone-600 hover:text-emerald-800 flex items-center gap-1.5 font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tomar otra fotografía
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* UPLOAD MODE */}
          {activeMode === 'upload' && (
            <div className="flex flex-col items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-semibold text-stone-800 text-sm text-center">
                  Haz clic para cargar o arrastra una imagen aquí
                </p>
                <p className="text-xs text-stone-400 mt-1">PNG, JPG, WEBP hasta 5MB</p>
              </div>

              {tempPhotoUrl && (
                <div className="mt-4 w-full">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Vista previa:</p>
                  <div className="h-40 w-full rounded-xl overflow-hidden border border-stone-200">
                    <img src={tempPhotoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRESETS MODE */}
          {activeMode === 'presets' && (
            <div>
              <p className="text-xs text-stone-500 mb-3">
                Selecciona una imagen de muestra para tu producto veterinario:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {PRESET_PHOTOS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTempPhotoUrl(preset.url)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      tempPhotoUrl === preset.url
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <span className="text-xs font-medium text-stone-700 leading-tight">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hidden canvas for taking snapshot */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50">
          <button
            id="clear-photo-btn"
            type="button"
            onClick={() => setTempPhotoUrl('')}
            className="text-xs text-stone-500 hover:text-rose-600 font-medium"
          >
            Quitar foto
          </button>
          <div className="flex gap-2">
            <button
              id="cancel-photo-btn"
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              id="save-photo-btn"
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              Usar esta fotografía
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
