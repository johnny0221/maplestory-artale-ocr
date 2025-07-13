import { NextApiRequest, NextApiResponse } from 'next';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, crop } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  try {
    // Convert base64 image to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    let imgBuffer = Buffer.from(base64Data, 'base64');
    let croppedBase64 = null;

    // If crop parameters are provided, crop the image using sharp
    if (crop && crop.width > 0 && crop.height > 0) {
      imgBuffer = await sharp(imgBuffer)
        .extract({
          left: crop.x || 0,
          top: crop.y || 0,
          width: crop.width,
          height: crop.height,
        })
        .png()
        .toBuffer();
      croppedBase64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
    }

    const worker = await createWorker();
    const { data } = await worker.recognize(imgBuffer);
    await worker.terminate();

    res.status(200).json({ text: data.text, croppedImage: croppedBase64 });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      error: 'Failed to process OCR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
