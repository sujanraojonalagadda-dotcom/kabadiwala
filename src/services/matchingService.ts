import { EwasteCategory, RecyclerRecord } from '../types.js';

class MatchingService {
  /**
   * Fetch recyclers matching criteria.
   * If isTestDataMode is false, only genuinely registered non-test recyclers are returned.
   * If no real recyclers exist, an empty list is returned.
   */
  public async getAvailableRecyclers(options: {
    category?: EwasteCategory;
    isTestDataMode: boolean;
  }): Promise<{
    recyclers: RecyclerRecord[];
    isEmpty: boolean;
    emptyMessage: string;
  }> {
    try {
      const res = await fetch(`/api/recyclers?includeTest=${options.isTestDataMode ? 'true' : 'false'}`);
      if (!res.ok) {
        throw new Error('Failed to fetch recyclers');
      }

      const data = await res.json();
      let list: RecyclerRecord[] = data.recyclers || [];

      // Filter by category if specified
      if (options.category) {
        list = list.filter((r) => r.acceptedMaterials.includes(options.category!));
      }

      if (list.length === 0) {
        return {
          recyclers: [],
          isEmpty: true,
          emptyMessage: 'No verified recyclers available yet.',
        };
      }

      return {
        recyclers: list,
        isEmpty: false,
        emptyMessage: '',
      };
    } catch {
      return {
        recyclers: [],
        isEmpty: true,
        emptyMessage: 'Recycler directory not connected',
      };
    }
  }

  /**
   * Calculate honest matching details based strictly on real provided data.
   * Never invents distances or ratings!
   */
  public getRecyclerRateForCategory(recycler: RecyclerRecord, category: EwasteCategory): number | null {
    if (recycler.rates && typeof recycler.rates[category] === 'number') {
      return recycler.rates[category]!;
    }
    return null;
  }
}

export const matchingService = new MatchingService();
