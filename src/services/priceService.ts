import { EwasteCategory, ItemCondition, PriceCalculationResult } from '../types.js';

export const CONDITION_FACTORS: Record<ItemCondition, number> = {
  Working: 1.0,
  'Partially Working': 0.7,
  'Not Working': 0.4,
};

class PriceService {
  /**
   * Calculate price strictly according to the honesty rules.
   * If real recycler rate is available: weight * rate * conditionFactor
   * If in test mode with manual test rate: weight * testRate * conditionFactor (clearly labelled)
   * If neither: returns isAvailable: false, "Price rate unavailable", "Live rates not connected"
   */
  public calculatePrice(params: {
    weightKg: number;
    category: EwasteCategory;
    condition: ItemCondition;
    recyclerRatePerKg?: number | null;
    isTestDataMode: boolean;
    manualTestRatePerKg?: number | null;
  }): PriceCalculationResult {
    const { weightKg, condition, recyclerRatePerKg, isTestDataMode, manualTestRatePerKg } = params;
    const conditionFactor = CONDITION_FACTORS[condition] || 1.0;

    // Case 1: Genuine verified recycler rate provided
    if (typeof recyclerRatePerKg === 'number' && recyclerRatePerKg > 0) {
      const calculated = Math.round(weightKg * recyclerRatePerKg * conditionFactor);
      return {
        isAvailable: true,
        ratePerKg: recyclerRatePerKg,
        conditionFactor,
        totalCalculatedPrice: calculated,
        statusLabel: 'Recycler Quoted Rate',
        isTestCalculation: false,
        details: `${weightKg} kg × ₹${recyclerRatePerKg}/kg × ${conditionFactor} condition factor`,
      };
    }

    // Case 2: In TEST DATA MODE with a test rate entered
    if (isTestDataMode && typeof manualTestRatePerKg === 'number' && manualTestRatePerKg > 0) {
      const calculated = Math.round(weightKg * manualTestRatePerKg * conditionFactor);
      return {
        isAvailable: true,
        ratePerKg: manualTestRatePerKg,
        conditionFactor,
        totalCalculatedPrice: calculated,
        statusLabel: 'TEST CALCULATION — NOT A MARKET PRICE',
        isTestCalculation: true,
        details: `TEST: ${weightKg} kg × ₹${manualTestRatePerKg}/kg (Test Rate) × ${conditionFactor} (${condition})`,
      };
    }

    // Case 3: Live rates not connected
    return {
      isAvailable: false,
      ratePerKg: null,
      conditionFactor,
      totalCalculatedPrice: null,
      statusLabel: 'Live rates not connected',
      isTestCalculation: false,
      details: 'Price rate unavailable',
    };
  }
}

export const priceService = new PriceService();
