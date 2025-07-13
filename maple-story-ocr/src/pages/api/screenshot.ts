import { NextApiRequest, NextApiResponse } from 'next';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { windowId, cropRegion, displayId } = req.body;

  try {
    let imgBuffer;

    if (windowId) {
      // Capture specific window (this may need platform-specific implementation)
      imgBuffer = await screenshot({
        screen: displayId || 0,
        format: 'png',
      });
    } else {
      // Default full screen capture
      imgBuffer = await screenshot();
    }

    // Apply cropping if specified
    if (
      cropRegion &&
      cropRegion.x !== undefined &&
      cropRegion.y !== undefined &&
      cropRegion.width > 0 &&
      cropRegion.height > 0
    ) {
      imgBuffer = await sharp(imgBuffer)
        .extract({
          left: Math.max(0, cropRegion.x),
          top: Math.max(0, cropRegion.y),
          width: cropRegion.width,
          height: cropRegion.height,
        })
        .png()
        .toBuffer();
    }

    const base64Image = imgBuffer.toString('base64');

    res.status(200).json({
      image: `data:image/png;base64,${base64Image}`,
      timestamp: new Date().toISOString(),
      cropRegion: cropRegion || null,
    });
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({
      error: 'Failed to capture screenshot',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
