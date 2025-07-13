'use client';

import { useState, useRef, useEffect } from 'react';

interface WindowInfo {
  id: number;
  title: string;
  owner: {
    name: string;
  };
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnalysisResult {
  text: string;
  parsedData: {
    total: number | null;
    percentage: number | null;
  };
  timestamp?: string;
}

export default function ScreenCapture() {
  const [image, setImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(5000);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [monitoringHistory, setMonitoringHistory] = useState<AnalysisResult[]>(
    []
  );
  const [availableWindows, setAvailableWindows] = useState<WindowInfo[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<WindowInfo | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion>({
    x: 0,
    y: 0,
    width: 400,
    height: 300,
  });
  const [showCropSettings, setShowCropSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load available windows on component mount
    loadAvailableWindows();

    // Cleanup on unmount
    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isMonitoring]);

  const loadAvailableWindows = async () => {
    try {
      const response = await fetch('/api/windows');
      if (response.ok) {
        const { windows } = await response.json();
        setAvailableWindows(windows);
      }
    } catch (error) {
      console.error('Failed to load windows:', error);
    }
  };

  const compressImage = async (base64String: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        let width = img.width;
        let height = img.height;
        const maxDimension = 800;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = base64String;
    });
  };

  const parseNumbers = (text: string) => {
    const regex = /(\d+)\s*\[\s*(\d+\.?\d*)\s*%/;
    const match = text.match(regex);

    if (match) {
      return {
        total: parseInt(match[1], 10),
        percentage: parseFloat(match[2]),
      };
    }

    return {
      total: null,
      percentage: null,
    };
  };

  const startMonitoring = async () => {
    try {
      const response = await fetch('/api/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          sessionId,
          interval: monitoringInterval,
          windowId: selectedWindow?.id,
          cropRegion: showCropSettings ? cropRegion : null,
        }),
      });

      if (response.ok) {
        setIsMonitoring(true);
        setMonitoringHistory([]);
        startPolling();
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      alert('Failed to start monitoring');
    }
  };

  const stopMonitoring = async () => {
    try {
      await fetch('/api/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          sessionId,
        }),
      });

      setIsMonitoring(false);
      stopPolling();
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch('/api/screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            windowId: selectedWindow?.id,
            cropRegion: showCropSettings ? cropRegion : null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setImage(data.image);

          const ocrResponse = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: data.image }),
          });

          if (ocrResponse.ok) {
            const { data: text } = await ocrResponse.json();
            const parsedData = parseNumbers(text);

            const result = {
              text,
              parsedData,
              timestamp: new Date().toISOString(),
            };

            setAnalysisResult(result);
            setMonitoringHistory((prev) => [...prev.slice(-9), result]);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, monitoringInterval);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          setImage(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  };

  const captureScreen = async () => {
    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          windowId: selectedWindow?.id,
          cropRegion: showCropSettings ? cropRegion : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to capture screenshot');
      }

      const data = await response.json();
      setImage(data.image);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot');
    }
  };

  const analyzeImage = async () => {
    if (!image) {
      alert('Please provide an image first');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) {
        throw new Error('Failed to process OCR');
      }

      const { data } = await response.json();
      const parsedData = parseNumbers(data);

      setAnalysisResult({
        text: data,
        parsedData: {
          total: parsedData.total,
          percentage: parsedData.percentage,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze image');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='p-4 max-w-7xl mx-auto'>
      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        {/* Left Column - Window Selection & Crop Settings */}
        <div className='space-y-6'>
          {/* Window Selection */}
          <div>
            <h3 className='font-semibold text-gray-700 dark:text-gray-300 mb-3'>
              Window Selection
            </h3>
            <div className='space-y-2'>
              <button
                onClick={loadAvailableWindows}
                className='w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition-colors text-sm'
                disabled={isMonitoring}>
                Refresh Windows
              </button>

              <select
                value={selectedWindow?.id || ''}
                onChange={(e) => {
                  const windowId = parseInt(e.target.value);
                  const window = availableWindows.find(
                    (w) => w.id === windowId
                  );
                  setSelectedWindow(window || null);
                }}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                disabled={isMonitoring}>
                <option value=''>Select a window...</option>
                {availableWindows.map((window) => (
                  <option key={window.id} value={window.id}>
                    {window.title} ({window.owner.name})
                  </option>
                ))}
              </select>

              {selectedWindow && (
                <div className='bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm'>
                  <p>
                    <strong>Window:</strong> {selectedWindow.title}
                  </p>
                  <p>
                    <strong>Size:</strong> {selectedWindow.bounds.width}x
                    {selectedWindow.bounds.height}
                  </p>
                  <p>
                    <strong>Position:</strong> ({selectedWindow.bounds.x},{' '}
                    {selectedWindow.bounds.y})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Crop Settings */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-semibold text-gray-700 dark:text-gray-300'>
                Crop Region
              </h3>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={showCropSettings}
                  onChange={(e) => setShowCropSettings(e.target.checked)}
                  className='mr-2'
                  disabled={isMonitoring}
                />
                <span className='text-sm'>Enable</span>
              </label>
            </div>

            {showCropSettings && (
              <div className='space-y-3'>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      X
                    </label>
                    <input
                      type='number'
                      value={cropRegion.x}
                      onChange={(e) =>
                        setCropRegion((prev) => ({
                          ...prev,
                          x: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full px-2 py-1 border border-gray-300 rounded text-sm'
                      disabled={isMonitoring}
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Y
                    </label>
                    <input
                      type='number'
                      value={cropRegion.y}
                      onChange={(e) =>
                        setCropRegion((prev) => ({
                          ...prev,
                          y: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full px-2 py-1 border border-gray-300 rounded text-sm'
                      disabled={isMonitoring}
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Width
                    </label>
                    <input
                      type='number'
                      value={cropRegion.width}
                      onChange={(e) =>
                        setCropRegion((prev) => ({
                          ...prev,
                          width: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full px-2 py-1 border border-gray-300 rounded text-sm'
                      disabled={isMonitoring}
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Height
                    </label>
                    <input
                      type='number'
                      value={cropRegion.height}
                      onChange={(e) =>
                        setCropRegion((prev) => ({
                          ...prev,
                          height: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-full px-2 py-1 border border-gray-300 rounded text-sm'
                      disabled={isMonitoring}
                    />
                  </div>
                </div>
                <div className='bg-blue-50 dark:bg-blue-900 p-2 rounded text-xs'>
                  <p className='text-blue-800 dark:text-blue-200'>
                    Crop region: {cropRegion.width}x{cropRegion.height} at (
                    {cropRegion.x}, {cropRegion.y})
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Manual Controls */}
        <div>
          <div className='mb-6'>
            <div className='flex flex-col gap-2'>
              <h3 className='font-semibold text-gray-700 dark:text-gray-300'>
                Manual Image Analysis
              </h3>
              <div className='flex gap-2'>
                <button
                  onClick={captureScreen}
                  className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex-1'
                  disabled={isProcessing || isMonitoring}>
                  Capture
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className='bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors flex-1'
                  disabled={isProcessing || isMonitoring}>
                  Upload
                </button>
                {image && (
                  <button
                    onClick={clearImage}
                    className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors'
                    disabled={isProcessing || isMonitoring}>
                    Clear
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>

          {image && (
            <div className='space-y-4'>
              <div className='border rounded-lg p-2 bg-white dark:bg-gray-800'>
                <img
                  src={image}
                  alt='Captured or uploaded image'
                  className='max-w-full rounded'
                />
              </div>

              <button
                onClick={analyzeImage}
                className='bg-green-500 text-white px-4 py-3 rounded w-full hover:bg-green-600 transition-colors font-medium'
                disabled={isProcessing || isMonitoring}>
                {isProcessing ? 'Processing...' : 'Analyze Text'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Monitoring Controls */}
        <div>
          <div className='mb-6'>
            <h3 className='font-semibold text-gray-700 dark:text-gray-300 mb-4'>
              Automatic Monitoring
            </h3>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Interval (ms)
                </label>
                <input
                  type='number'
                  value={monitoringInterval}
                  onChange={(e) =>
                    setMonitoringInterval(Number(e.target.value))
                  }
                  min='1000'
                  max='60000'
                  step='1000'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  disabled={isMonitoring}
                />
              </div>

              <div className='flex gap-2'>
                <button
                  onClick={startMonitoring}
                  className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors flex-1'
                  disabled={isMonitoring}>
                  Start
                </button>
                <button
                  onClick={stopMonitoring}
                  className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex-1'
                  disabled={!isMonitoring}>
                  Stop
                </button>
              </div>

              {isMonitoring && (
                <div className='bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg'>
                  <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                    🔄 Monitoring{' '}
                    {selectedWindow ? selectedWindow.title : 'screen'}
                    {showCropSettings &&
                      ` (${cropRegion.width}x${cropRegion.height})`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Monitoring History */}
          {monitoringHistory.length > 0 && (
            <div className='space-y-2'>
              <h4 className='font-semibold text-gray-700 dark:text-gray-300'>
                Recent Results
              </h4>
              <div className='max-h-40 overflow-y-auto space-y-1'>
                {monitoringHistory
                  .slice(-5)
                  .reverse()
                  .map((result, index) => (
                    <div
                      key={index}
                      className='bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs'>
                      <div className='flex justify-between'>
                        <span>
                          Total:{' '}
                          {result.parsedData.total?.toLocaleString() || 'N/A'}
                        </span>
                        <span>%: {result.parsedData.percentage || 'N/A'}</span>
                      </div>
                      <div className='text-gray-500 text-xs'>
                        {result.timestamp &&
                          new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className='mt-6 border p-6 rounded-lg bg-white dark:bg-gray-800 shadow-sm'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-semibold'>Analysis Results</h2>
            {analysisResult.timestamp && (
              <span className='text-sm text-gray-500'>
                {new Date(analysisResult.timestamp).toLocaleString()}
              </span>
            )}
          </div>

          <div className='grid grid-cols-2 gap-4 mb-6'>
            <div className='bg-gray-50 dark:bg-gray-900 p-4 rounded-lg'>
              <div className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                Total Value
              </div>
              <div className='text-2xl font-bold text-blue-500'>
                {analysisResult.parsedData.total?.toLocaleString() ??
                  'Not found'}
              </div>
            </div>
            <div className='bg-gray-50 dark:bg-gray-900 p-4 rounded-lg'>
              <div className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                Percentage
              </div>
              <div className='text-2xl font-bold text-green-500'>
                {analysisResult.parsedData.percentage
                  ? `${analysisResult.parsedData.percentage}%`
                  : 'Not found'}
              </div>
            </div>
          </div>

          <div>
            <h3 className='font-semibold mb-2 text-gray-700 dark:text-gray-300'>
              Raw OCR Text:
            </h3>
            <pre className='bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-auto max-h-60 whitespace-pre-wrap'>
              {analysisResult.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
