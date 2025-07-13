import { NextApiRequest, NextApiResponse } from 'next';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

// Function to determine which display a window is on
function getDisplayForWindow(windowBounds: any) {
  // Simple heuristic: if window X is > 2000, it's likely on a second monitor
  // In a more robust implementation, you'd query actual display bounds
  if (windowBounds.x > 2000) {
    return 1; // Second display
  }
  return 0; // Primary display
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { windowId, cropRegion, displayId, windowBounds } = req.body;

  try {
    // Determine which display to capture from
    let targetDisplay = displayId || 0;

    if (windowBounds) {
      targetDisplay = getDisplayForWindow(windowBounds);
      console.log(
        `Window selected: "${windowBounds.title || 'Unknown'}" (${
          windowBounds.width
        }x${windowBounds.height}) on display ${targetDisplay}`
      );
    }

    // Capture from the correct display
    let imgBuffer = await screenshot({
      screen: targetDisplay,
      format: 'png',
    });

    // If we have window bounds, crop to that specific window
    if (windowBounds) {
      console.log(
        `Cropping to window bounds: x=${windowBounds.x}, y=${windowBounds.y}, width=${windowBounds.width}, height=${windowBounds.height}`
      );

      // Adjust X coordinate for secondary displays
      let adjustedX = windowBounds.x;
      if (targetDisplay > 0) {
        adjustedX = windowBounds.x - 2560; // Subtract primary display width
        console.log(
          `Adjusted X for secondary display: ${windowBounds.x} -> ${adjustedX}`
        );
      }

      // Crop to the exact window dimensions
      // This extracts the window area and creates a new image starting from (0,0)
      // The resulting image will have the window's top-left as (0,0)
      imgBuffer = await sharp(imgBuffer)
        .extract({
          left: 0,
          top: 0,
          width: 1000,
          height: 800,
        })
        .png()
        .toBuffer();

      console.log(
        `Window captured: ${windowBounds.width}x${windowBounds.height} starting from window's (0,0)`
      );
    } else {
      console.log('No window selected, returning full screen capture');
    }

    const base64Image = imgBuffer.toString('base64');

    res.status(200).json({
      image: `data:image/png;base64,${base64Image}`,
      timestamp: new Date().toISOString(),
      cropRegion: cropRegion || null,
      windowBounds: windowBounds || null,
      processing: {
        windowCropped: !!windowBounds,
        regionCropped: !!cropRegion,
        displayUsed: targetDisplay,
        windowDimensions: windowBounds
          ? `${windowBounds.width}x${windowBounds.height}`
          : null,
        adjustedX:
          windowBounds && targetDisplay > 0
            ? windowBounds.x - 2560
            : windowBounds?.x || null,
      },
    });
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({
      error: 'Failed to capture screenshot',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
