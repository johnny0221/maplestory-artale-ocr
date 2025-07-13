import { NextApiRequest, NextApiResponse } from 'next';
import screenshot from 'screenshot-desktop';
import { createWorker } from 'tesseract.js';

// Store active monitoring sessions
const monitoringSessions = new Map<string, NodeJS.Timeout>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const {
      action,
      sessionId,
      interval = 5000,
      windowName,
      displayId,
    } = req.body;

    if (action === 'start') {
      // Stop existing session if any
      if (monitoringSessions.has(sessionId)) {
        clearInterval(monitoringSessions.get(sessionId));
      }

      // Start new monitoring session
      const intervalId = setInterval(async () => {
        try {
          await captureAndAnalyze(sessionId, windowName, displayId);
        } catch (error) {
          console.error('Monitoring error:', error);
        }
      }, interval);

      monitoringSessions.set(sessionId, intervalId);

      res.status(200).json({
        message: 'Monitoring started',
        sessionId,
        interval,
      });
    } else if (action === 'stop') {
      if (monitoringSessions.has(sessionId)) {
        clearInterval(monitoringSessions.get(sessionId));
        monitoringSessions.delete(sessionId);
      }

      res.status(200).json({
        message: 'Monitoring stopped',
        sessionId,
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } else if (req.method === 'GET') {
    // Get active sessions
    const activeSessions = Array.from(monitoringSessions.keys());
    res.status(200).json({ activeSessions });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function captureAndAnalyze(
  sessionId: string,
  windowName?: string,
  displayId?: number
) {
  try {
    // Capture screenshot
    let imgBuffer;
    if (windowName) {
      imgBuffer = await screenshot({
        screen: displayId || 0,
        format: 'png',
      });
    } else {
      imgBuffer = await screenshot();
    }

    const base64Image = `data:image/png;base64,${imgBuffer.toString('base64')}`;

    // Perform OCR
    const worker = await createWorker('eng');
    const {
      data: { text },
    } = await worker.recognize(base64Image);
    await worker.terminate();

    // Parse the data
    const parsedData = parseNumbers(text);

    // Here you would typically send this data to connected clients
    // For now, we'll just log it
    console.log(`Session ${sessionId} - Parsed data:`, {
      timestamp: new Date().toISOString(),
      total: parsedData.total,
      percentage: parsedData.percentage,
      rawText: text,
    });

    // You could implement WebSocket or Server-Sent Events here
    // to push data to connected clients in real-time
  } catch (error) {
    console.error(`Error in session ${sessionId}:`, error);
  }
}

function parseNumbers(text: string) {
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
}
