'use client';

import React, { useRef, useState } from 'react';

export default function ScreenCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/png'));
    // You can now send this image to your OCR backend or use Tesseract.js
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
      } else {
        setOcrResult('OCR failed');
      }
    } catch (err) {
      setOcrResult('OCR error');
    }
  };

  // Function to capture frame and send to OCR
  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageDataUrl);
    await sendToOcr(imageDataUrl);
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
              </>
            )}
          </div>
          {capturedImage && (
            <div>
              <div className='mb-2 text-sm text-gray-700 dark:text-gray-300'>
                Captured Image:
              </div>
              <img
                src={capturedImage}
                alt='Captured'
                style={{
                  width: 400,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                }}
              />
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
