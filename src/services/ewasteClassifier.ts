import { AiClassificationResult, EwasteCategory, EWASTE_CATEGORIES } from '../types.js';

class EwasteClassifierService {
  /**
   * Resize image to standard resolution for faster upload and vision analysis
   */
  public async preprocessImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calls server-side Gemini Vision to classify e-waste item
   */
  public async classify(imageBase64: string): Promise<AiClassificationResult> {
    try {
      const res = await fetch('/api/ai/classify-ewaste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
      });

      if (!res.ok) {
        return {
          available: false,
          category: null,
          confidenceVerbatim: null,
          explanation: '',
          message: 'AI classification unavailable (server error)',
        };
      }

      const data = await res.json();
      if (!data.available) {
        return {
          available: false,
          category: null,
          confidenceVerbatim: null,
          explanation: '',
          message: data.message || 'AI classification not connected',
        };
      }

      const category = EWASTE_CATEGORIES.includes(data.category) ? (data.category as EwasteCategory) : 'Other';

      return {
        available: true,
        category,
        confidenceVerbatim: data.confidenceVerbatim || 'Reported by model',
        explanation: data.explanation || '',
      };
    } catch {
      return {
        available: false,
        category: null,
        confidenceVerbatim: null,
        explanation: '',
        message: 'AI classification unavailable (connection error)',
      };
    }
  }
}

export const ewasteClassifier = new EwasteClassifierService();
