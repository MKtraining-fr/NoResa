import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react';

/**
 * Capture photo via webcam (getUserMedia). Renvoie un File JPEG via onCapture.
 * Nécessite un contexte sécurisé (HTTPS) — OK sur NoResa. Tombe en erreur claire
 * si la caméra est refusée/absente (l'import fichier reste disponible à côté).
 */
const WebcamCapture: React.FC<{ onCapture: (file: File) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [err, setErr] = useState('');
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      } catch (e: any) {
        setErr(e?.name === 'NotAllowedError'
          ? "Accès caméra refusé. Autorise la caméra pour ce site dans le navigateur."
          : "Aucune caméra détectée ou inaccessible.");
      }
    })();
    return () => { active = false; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob((blob) => { if (blob) { blobRef.current = blob; setSnapshot(URL.createObjectURL(blob)); } }, 'image/jpeg', 0.9);
  };
  const retake = () => { setSnapshot(null); blobRef.current = null; };
  const confirm = () => {
    if (!blobRef.current) return;
    const file = new File([blobRef.current], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-ink/50" onClick={onClose}>
      <div className="bg-surface w-full max-w-lg shadow-modal overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Camera size={18} /> Prendre une photo</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-line-soft text-muted"><X size={18} /></button>
        </div>
        <div className="p-5">
          {err ? (
            <div className="py-10 text-center">
              <AlertCircle size={30} className="mx-auto text-danger-text" />
              <p className="mt-3 text-sm font-semibold text-ink-2">{err}</p>
            </div>
          ) : (
            <div className="relative overflow-hidden bg-black aspect-video">
              {!snapshot
                ? <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                : <img src={snapshot} alt="" className="w-full h-full object-cover" />}
            </div>
          )}
          {!err && (
            <div className="flex justify-center gap-3 mt-4">
              {!snapshot ? (
                <button onClick={capture} className="flex items-center gap-2 bg-primary text-white px-6 py-3 font-semibold hover:bg-primary-dark"><Camera size={18} /> Capturer</button>
              ) : (
                <>
                  <button onClick={retake} className="flex items-center gap-2 bg-line-soft text-ink-2 px-5 py-3 font-semibold hover:bg-line"><RefreshCw size={16} /> Reprendre</button>
                  <button onClick={confirm} className="flex items-center gap-2 bg-success text-white px-6 py-3 font-semibold hover:bg-success-text"><Check size={18} /> Utiliser cette photo</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;
