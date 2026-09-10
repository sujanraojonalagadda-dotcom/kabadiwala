import { EwasteCategory, EWASTE_CATEGORIES } from '../types.js';

class NotificationService {
  /**
   * Speaks back calculation result or status.
   * If real calculated price exists: speaks amount.
   * Otherwise: "Price information is currently unavailable."
   */
  public speakPriceFeedback(params: {
    calculatedPrice: number | null;
    category?: string;
    language?: 'hi' | 'en';
  }) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    let text = '';
    const isHindi = params.language === 'hi' || true; // Default support

    if (params.calculatedPrice !== null && params.calculatedPrice > 0) {
      if (isHindi) {
        text = `Aapka estimated price ₹${params.calculatedPrice} hai.`;
      } else {
        text = `Your estimated price is ₹${params.calculatedPrice}.`;
      }
    } else {
      if (isHindi) {
        text = 'Price information is currently unavailable.';
      } else {
        text = 'Price information is currently unavailable.';
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick Hindi or Indian English voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('en-IN'));
    if (matchVoice) {
      utterance.voice = matchVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Parse voice input such as "Laptop 3 kilo hai" or "Mobile 2 kg" or "Television 15 kg"
   */
  public parseVoiceInput(transcript: string): {
    category: EwasteCategory | null;
    weightKg: number | null;
  } {
    const text = transcript.toLowerCase();
    let detectedCategory: EwasteCategory | null = null;

    for (const cat of EWASTE_CATEGORIES) {
      const catLower = cat.toLowerCase();
      if (text.includes(catLower)) {
        detectedCategory = cat;
        break;
      }
    }

    // Category synonyms in Hindi / colloquial
    if (!detectedCategory) {
      if (text.includes('phone') || text.includes('mobile') || text.includes('mobail')) {
        detectedCategory = 'Mobile';
      } else if (text.includes('tv') || text.includes('television')) {
        detectedCategory = 'Television';
      } else if (text.includes('screen') || text.includes('monitor')) {
        detectedCategory = 'Monitor';
      } else if (text.includes('taar') || text.includes('wire') || text.includes('cable')) {
        detectedCategory = 'Cable';
      } else if (text.includes('battery') || text.includes('batri')) {
        detectedCategory = 'Battery';
      }
    }

    // Extract weight number: looks for "3 kilo", "3 kg", "3.5 kilo", "3", etc.
    let detectedWeight: number | null = null;
    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kilo|kg|kilos|kilogram|gram)?/);
    if (weightMatch && weightMatch[1]) {
      const parsedNum = parseFloat(weightMatch[1]);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        detectedWeight = parsedNum;
      }
    }

    return {
      category: detectedCategory,
      weightKg: detectedWeight,
    };
  }
}

export const notificationService = new NotificationService();
