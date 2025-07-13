import { NextApiRequest, NextApiResponse } from 'next';
import { activeWindow, openWindows } from 'get-windows';

interface WindowInfo {
  id: number;
  title: string;
  owner: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  memoryUsage?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const opens: any = await openWindows();

    console.log('Raw window data:', opens);

    // Process and filter the windows
    const processedWindows: WindowInfo[] = opens
      .filter(
        (window: any) =>
          window.title &&
          window.title.trim() !== '' &&
          !window.title.includes('Window Server') &&
          !window.title.includes('Dock') &&
          window.bounds &&
          window.bounds.width > 100 &&
          window.bounds.height > 100
      )
      .map((window: any) => ({
        id: window.id,
        title: window.title,
        owner: window.owner?.name || window.owner || 'Unknown',
        bounds: {
          x: window.bounds.x,
          y: window.bounds.y,
          width: window.bounds.width,
          height: window.bounds.height,
        },
        memoryUsage: window.memoryUsage,
      }));

    console.log('Processed windows:', processedWindows);

    res.status(200).json({ windows: processedWindows });
  } catch (error) {
    console.error('Error getting windows:', error);
    res.status(500).json({
      error: 'Failed to get windows',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
