import { NextApiRequest, NextApiResponse } from 'next';
import { activeWindow, openWindows } from 'get-windows';

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
  memoryUsage: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const windows: any = await activeWindow();

    const opens: any = await openWindows();

    console.log('This is the open windows', opens);

    console.log('This is the windows', windows);

    // Filter out system windows and format the response

    res.status(200).json({ windows: [windows] });
  } catch (error) {
    console.error('Error getting windows:', error);
    res.status(500).json({
      error: 'Failed to get windows',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
