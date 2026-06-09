import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface SignatureCanvasRef {
  clear: () => void;
  getTrimmedCanvas: () => HTMLCanvasElement;
  getCanvas: () => HTMLCanvasElement;
  isEmpty: () => boolean;
}

interface SignatureCanvasProps {
  penColor?: string;
  canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(({ penColor = 'black', canvasProps }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const isEmptyRef = useRef(true);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          isEmptyRef.current = true;
        }
      }
    },
    getTrimmedCanvas: () => {
      const canvas = canvasRef.current;
      if (!canvas) return document.createElement('canvas');
      return canvas;
    },
    getCanvas: () => {
      const canvas = canvasRef.current;
      if (!canvas) return document.createElement('canvas');
      return canvas;
    },
    isEmpty: () => isEmptyRef.current
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set actual size in memory (scaled to account for extra pixel density)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = penColor;
    }
  }, [penColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    isEmptyRef.current = false;
    draw(e);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={stopDrawing}
      onMouseOut={stopDrawing}
      onMouseMove={draw}
      onTouchStart={startDrawing}
      onTouchEnd={stopDrawing}
      onTouchMove={draw}
      {...canvasProps}
    />
  );
});

export default SignatureCanvas;
