import { NextApiRequest, NextApiResponse } from 'next';
import screenshot from 'screenshot-desktop';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const displays = await screenshot.listDisplays();

    console.log('Available displays:', displays);

    res.status(200).json({ displays });
  } catch (error) {
    console.error('Error getting displays:', error);
    res.status(500).json({
      error: 'Failed to get displays',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
