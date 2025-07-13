import { NextApiRequest, NextApiResponse } from 'next';
import { createWorker } from 'tesseract.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  try {
    // Convert base64 image to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    const worker = await createWorker();
    const { data } = await worker.recognize(imgBuffer);
    await worker.terminate();

    res.status(200).json({ text: data.text, croppedImage: image });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      error: 'Failed to process OCR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
