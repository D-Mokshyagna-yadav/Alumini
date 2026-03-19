import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';

type Props = {
  file: File;
  size?: number; // output size in px (square)
  shape?: 'rounded' | 'square' | 'circle';
  onCancel: () => void;
  onCrop: (file: File) => void;
};

export default function SimpleImageCropper({ file, size = 600, shape = 'rounded', onCancel, onCrop }: Props) {
  const url = URL.createObjectURL(file);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const natural = useRef({ w: 0, h: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => () => { URL.revokeObjectURL(url); }, [url]);

  // mark loaded when the DOM <img> finishes loading (we set src immediately)
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => {
      natural.current = { w: img.naturalWidth, h: img.naturalHeight };
      setLoaded(true);
    };
    const onError = () => setLoaded(true);
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    // if already complete
    if (img.complete && img.naturalWidth) onLoad();
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [url]);

  // compute initial scale to cover the crop box and center the image
  useLayoutEffect(() => {
    if (!loaded) return;
    const c = containerRef.current;
    if (!c) return;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const iw = natural.current.w || 1;
    const ih = natural.current.h || 1;
    const fitScale = Math.max(cw / iw, ch / ih);
    setScale(prev => {
      // if user already zoomed, don't overwrite large custom zoom
      if (prev && prev !== 1) return prev;
      return +(fitScale).toFixed(3);
    });
    // center
    setPos({ x: 0, y: 0 });
  }, [loaded]);

  // draw preview canvas to match crop box
  useEffect(() => {
    const cv = previewRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!cv || !img || !container || !loaded) return;
    let ctx = cv.getContext('2d');
    if (!ctx) return;
    // handle high-DPI displays: resize backing store
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const cssW = cv.clientWidth || 140;
    const cssH = cv.clientHeight || 140;
    if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      ctx = cv.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const rect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const scaleFactor = img.naturalWidth / imgRect.width;

    const sx = Math.max(0, (rect.left - imgRect.left) * scaleFactor * -1);
    const sy = Math.max(0, (rect.top - imgRect.top) * scaleFactor * -1);
    const sWidth = Math.min(img.naturalWidth, rect.width * scaleFactor);
    const sHeight = Math.min(img.naturalHeight, rect.height * scaleFactor);

    // clear & draw
    ctx.clearRect(0, 0, cv.width, cv.height);
      // fill white background first to avoid black canvas
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
    // draw the same area we would crop, scaled to preview size
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cv.width, cv.height);

    // apply mask for rounded/circle preview
    if (shape === 'rounded' || shape === 'circle') {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      if (shape === 'circle') ctx.arc(cv.width / 2, cv.height / 2, cv.width / 2, 0, Math.PI * 2);
      else {
        const r = Math.min(12, cv.width / 12);
        const w = cv.width, h = cv.height;
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
      }
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [pos.x, pos.y, scale, loaded, shape]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015; // smoother zoom
    setScale(s => Math.min(4, Math.max(0.5, +(s + delta).toFixed(3))));
  };
  // Pointer event based dragging (works for touch + mouse)
  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as Element;
    (el as Element).setPointerCapture?.(e.pointerId);
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    // update via rAF for smoother motion
    requestAnimationFrame(() => setPos(p => ({ x: p.x + dx, y: p.y + dy })));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const el = e.currentTarget as Element;
    (el as Element).releasePointerCapture?.(e.pointerId);
    dragging.current = false;
  };

  const doCrop = async () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // white background for formats without alpha
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const scaleFactor = img.naturalWidth / imgRect.width || 1;

    let sx = Math.max(0, (rect.left - imgRect.left) * scaleFactor * -1);
    let sy = Math.max(0, (rect.top - imgRect.top) * scaleFactor * -1);
    let sWidth = Math.min(img.naturalWidth, rect.width * scaleFactor);
    let sHeight = Math.min(img.naturalHeight, rect.height * scaleFactor);

    if (!isFinite(sx) || !isFinite(sy) || !isFinite(sWidth) || !isFinite(sHeight)) {
      sx = 0; sy = 0; sWidth = img.naturalWidth; sHeight = img.naturalHeight;
    }

    // draw the selected area into the output canvas (scaled to `size`)
    try {
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      // fallback: draw entire image scaled to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.width, canvas.height);
    }

    // apply mask for rounded/circle shapes
    if (shape === 'rounded' || shape === 'circle') {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const mctx = maskCanvas.getContext('2d');
      if (mctx) {
        mctx.fillStyle = '#000';
        mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        mctx.globalCompositeOperation = 'destination-out';
        mctx.beginPath();
        if (shape === 'circle') {
          mctx.arc(maskCanvas.width / 2, maskCanvas.height / 2, maskCanvas.width / 2, 0, Math.PI * 2);
        } else {
          const r = Math.min(28, maskCanvas.width / 12);
          const w = maskCanvas.width, h = maskCanvas.height;
          mctx.moveTo(r, 0);
          mctx.lineTo(w - r, 0);
          mctx.quadraticCurveTo(w, 0, w, r);
          mctx.lineTo(w, h - r);
          mctx.quadraticCurveTo(w, h, w - r, h);
          mctx.lineTo(r, h);
          mctx.quadraticCurveTo(0, h, 0, h - r);
          mctx.lineTo(0, r);
          mctx.quadraticCurveTo(0, 0, r, 0);
        }
        mctx.fill();
        // apply mask to main canvas
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    return new Promise<void>((resolve) => {
      const preferWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
      const outType = preferWebp ? 'image/webp' : 'image/jpeg';
      const outName = file.name.replace(/\.[^/.]+$/, '') + (preferWebp ? '-cropped.webp' : '-cropped.jpg');
      canvas.toBlob((blob) => {
        if (!blob) { resolve(); return; }
        const outFile = new File([blob], outName, { type: outType });
        onCrop(outFile);
        resolve();
      }, outType, 0.9);
    });
  };

  // styles extracted to reduce JSX complexity
  const containerStyle: React.CSSProperties = { width: 360, height: 360, position: 'relative', overflow: 'hidden', borderRadius: shape === 'circle' ? '50%' : '12px', background: '#f3f4f6', touchAction: 'none' };
  const imgStyle: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`, cursor: dragging.current ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none', maxWidth: 'none', maxHeight: 'none', opacity: loaded ? 1 : 0, transition: 'opacity 180ms ease' };
  const overlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.35)', pointerEvents: 'none', borderRadius: shape === 'circle' ? '50%' : '12px' };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden" style={{ width: 740, maxWidth: '100%' }}>
        <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="font-semibold">Crop Image</div>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-3 py-1 rounded">Cancel</button>
            <button onClick={() => doCrop()} className="px-3 py-1 bg-[var(--accent)] text-[var(--bg-primary)] rounded">Use Image</button>
          </div>
        </div>
        <div className="p-4 flex gap-4">
          <div
            style={containerStyle}
            ref={containerRef as any}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onPointerUp}
          >
            <img ref={imgRef} src={url} alt="to crop" style={imgStyle} />
            <div style={overlayStyle} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-muted)] mb-2">Drag to reposition, scroll to zoom. Final image will be cropped to the widget shape.</p>
            <div className="mb-3">
              <label className="text-xs text-[var(--text-muted)]">Zoom</label>
              <input type="range" min={0.5} max={4} step={0.01} value={scale} onChange={e => setScale(Number(e.target.value))} className="w-full" />
            </div>
            <div className="mb-3">
              <label className="text-xs text-[var(--text-muted)]">Preview</label>
                <div style={{ width: 140, height: 140, borderRadius: shape === 'circle' ? '50%' : '12px', overflow: 'hidden', background: '#fff' }}>
                  <canvas ref={previewRef} width={140} height={140} style={{ width: '100%', height: '100%', display: loaded ? 'block' : 'none' }} />
                  {!loaded && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Loading…</div>}
                </div>
            </div>
            <div className="text-xs text-[var(--text-muted)]">Tip: hold and drag the image to reposition within the crop box.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
