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
  // Fixed crop for bottom left 500x300
  const cropWidth = 500;
  const cropHeight = 300;

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
  const sendToOcr = async (
    imageDataUrl: string,
    crop: { x: number; y: number; width: number; height: number }
  ) => {
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, crop }),
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

  // Function to capture frame and send to OCR (send full frame, crop in backend)
  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    if (!video) return;
    const fullW = video.videoWidth;
    const fullH = video.videoHeight;
    const sx = 0;
    const sy = fullH - cropHeight;
    const canvas = document.createElement('canvas');
    canvas.width = fullW;
    canvas.height = fullH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, fullW, fullH);
    const imageDataUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageDataUrl);
    await sendToOcr(imageDataUrl, {
      x: sx,
      y: sy,
      width: cropWidth,
      height: cropHeight,
    });
  };

  // Manual captureFrame for one-off capture (send full frame, crop in backend)
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const fullW = video.videoWidth;
    const fullH = video.videoHeight;
    const sx = 0;
    const sy = fullH - cropHeight;
    const canvas = document.createElement('canvas');
    canvas.width = fullW;
    canvas.height = fullH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, fullW, fullH);
    const imageDataUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageDataUrl);
    sendToOcr(imageDataUrl, {
      x: sx,
      y: sy,
      width: cropWidth,
      height: cropHeight,
    });
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
                    disabled
                    className='w-20 px-2 py-1 border rounded text-xs bg-gray-100 cursor-not-allowed'
                  />
                  <label className='text-xs text-gray-600'>Crop Height:</label>
                  <input
                    type='number'
                    min={1}
                    max={1080}
                    value={cropHeight}
                    disabled
                    className='w-20 px-2 py-1 border rounded text-xs bg-gray-100 cursor-not-allowed'
                  />
                  <span className='text-xs text-gray-400'>(bottom left)</span>
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
