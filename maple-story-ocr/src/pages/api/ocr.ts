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
    const worker = await createWorker();

    const { data } = await worker.recognize(image);
    await worker.terminate();

    console.log('This is the image', data);

    res.status(200).json({ data: data.text });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      error: 'Failed to process OCR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
