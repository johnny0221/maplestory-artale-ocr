'use client';

import React, { useRef, useState } from 'react';

export default function ScreenCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [cropWidth, setCropWidth] = useState(200);
  const [cropHeight, setCropHeight] = useState(40);

  const startShare = async () => {
    setShareError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      setIsSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setShareError(err.message || 'Failed to start screen sharing');
      setIsSharing(false);
    }
  };

  const stopShare = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
  };

  // Function to send image to backend OCR endpoint
  const sendToOcr = async (imageDataUrl: string) => {
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      if (response.ok) {
        const data = await response.json();
        setOcrResult(data.text || 'No text found');
        setCroppedImage(data.croppedImage || null);
      } else {
        setOcrResult('OCR failed');
        setCroppedImage(null);
      }
    } catch (err) {
      setOcrResult('OCR error');
      setCroppedImage(null);
    }
  };

  // Download cropped image
  const downloadCroppedImage = () => {
    if (!croppedImage) return;
    const link = document.createElement('a');
    link.href = croppedImage;
    link.download = `cropped-ocr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to crop image on frontend with high quality
  const cropImage = (fullImageDataUrl: string, cropX: number, cropY: number, cropW: number, cropH: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Increase canvas resolution for better quality
        const scale = 2; // 2x resolution
        canvas.width = cropW * scale;
        canvas.height = cropH * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the cropped image at higher resolution
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW * scale, cropH * scale);
        
        // Use high quality PNG with maximum quality
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.src = fullImageDataUrl;
    });
  };

  // Function to capture frame and send to OCR (crop on frontend)
  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    if (!video) return;
    const fullW = video.videoWidth;
    const fullH = video.videoHeight;
    const sx = fullW - cropWidth - 900; // Same as manual capture
    const sy = fullH - cropHeight - 50; // Same as manual capture
    const canvas = document.createElement('canvas');
    canvas.width = fullW;
    canvas.height = fullH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Enable high-quality image smoothing for better capture quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(video, 0, 0, fullW, fullH);
    const fullImageDataUrl = canvas.toDataURL('image/png', 1.0);
    setCapturedImage(fullImageDataUrl);
    
    // Crop the image on frontend
    const croppedImageDataUrl = await cropImage(fullImageDataUrl, sx, sy, cropWidth, cropHeight);
    await sendToOcr(croppedImageDataUrl);
  };

  // Manual captureFrame for one-off capture (crop on frontend)
  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video) return;
    const fullW = video.videoWidth;
    const fullH = video.videoHeight;
    const sx = fullW - cropWidth - 900; // Start 300px left from the right edge
    const sy = fullH - cropHeight- 50; // Start from bottom
    const canvas = document.createElement('canvas');
    canvas.width = fullW;
    canvas.height = fullH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Enable high-quality image smoothing for better capture quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(video, 0, 0, fullW, fullH);
    const fullImageDataUrl = canvas.toDataURL('image/png', 1.0);
    setCapturedImage(fullImageDataUrl);
    
    // Crop the image on frontend
    const croppedImageDataUrl = await cropImage(fullImageDataUrl, sx, sy, cropWidth, cropHeight);
    sendToOcr(croppedImageDataUrl);
  };

  // Start/stop monitoring
  const startMonitoring = () => {
    setIsMonitoring(true);
    setOcrResult(null);
    captureAndAnalyze(); // Immediate first capture
    monitoringIntervalRef.current = setInterval(captureAndAnalyze, 5000);
  };
  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  };

  // Stop monitoring if sharing stops
  React.useEffect(() => {
    if (!isSharing) stopMonitoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharing]);

  return (
    <div className='p-4 max-w-7xl mx-auto'>
      {/* New: Screen/Window Sharing Section */}
      <div className='mb-8'>
        <h2 className='text-lg font-semibold mb-2'>
          Share Screen or Window (Browser Native)
        </h2>
        <div className='flex flex-col md:flex-row gap-4 items-start'>
          <div>
            <button
              onClick={isSharing ? stopShare : startShare}
              className={`px-4 py-2 rounded font-medium text-white ${
                isSharing
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}>
              {isSharing ? 'Stop Sharing' : 'Share Screen/Window'}
            </button>
            {shareError && (
              <div className='text-red-500 text-sm mt-2'>{shareError}</div>
            )}
            <video
              ref={videoRef}
              style={{
                width: 400,
                border: '1px solid #ccc',
                marginTop: 16,
                display: isSharing ? 'block' : 'none',
              }}
              autoPlay
              muted
            />
            {isSharing && (
              <>
                <button
                  onClick={captureFrame}
                  className='mt-3 px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white font-medium w-full'
                  disabled={isMonitoring}>
                  Capture Frame
                </button>
                <button
                  onClick={isMonitoring ? stopMonitoring : startMonitoring}
                  className={`mt-2 px-4 py-2 rounded font-medium w-full ${
                    isMonitoring
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}>
                  {isMonitoring ? 'Stop Monitoring' : 'Start 5s Interval OCR'}
                </button>
                <div className='flex gap-2 mt-3 items-center'>
                  <label className='text-xs text-gray-600'>Crop Width:</label>
                  <input
                    type='number'
                    min={1}
                    max={1920}
                    value={cropWidth}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setCropWidth(0); // Allow empty value
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                          setCropWidth(numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === '' || isNaN(parseInt(value)) || parseInt(value) <= 0) {
                        setCropWidth(200); // Reset to default if invalid
                      }
                    }}
                    className='w-20 px-2 py-1 border rounded text-xs'
                  />
                  <label className='text-xs text-gray-600'>Crop Height:</label>
                  <input
                    type='number'
                    min={1}
                    max={1080}
                    value={cropHeight}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setCropHeight(0); // Allow empty value
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                          setCropHeight(numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === '' || isNaN(parseInt(value)) || parseInt(value) <= 0) {
                        setCropHeight(40); // Reset to default if invalid
                      }
                    }}
                    className='w-20 px-2 py-1 border rounded text-xs'
                  />
                  <span className='text-xs text-gray-400'>(bottom right)</span>
                </div>
              </>
            )}
          </div>
          {croppedImage && (
            <div>
              <div className='mb-2 text-sm text-gray-700 dark:text-gray-300'>
                Cropped Image (Analyzed):
              </div>
              <img
                src={croppedImage}
                alt='Cropped'
                style={{
                  width: 400,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                }}
              />
              <button
                onClick={downloadCroppedImage}
                className='mt-2 px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-medium w-full'>
                Download Cropped Image
              </button>
            </div>
          )}
          {ocrResult && (
            <div className='mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 max-w-md'>
              <div className='font-semibold mb-2 text-green-700 dark:text-green-300'>
                OCR Result:
              </div>
              <pre className='whitespace-pre-wrap break-words text-sm'>
                {ocrResult}
              </pre>
            </div>
          )}
        </div>
        <div className='text-xs text-gray-500 mt-2'>
          This uses your browser's built-in screen/window sharing dialog, just
          like Google Meet or Zoom. You can capture any screen, window, or tab
          you have access to.
        </div>
      </div>
      {/* ... existing code ... */}
    </div>
  );
}
