import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  fetchOnboardingSuggestions, 
  fetchEnvironmentSuggestions, 
  _resetClient 
} from './aiService';

// Mock the Gemini SDK
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));
const mockConstructor = vi.fn();

vi.mock('@google/generative-ai', () => {
  class GoogleGenerativeAI {
    constructor(apiKey) {
      mockConstructor(apiKey);
    }
    getGenerativeModel = mockGetGenerativeModel;
  }
  return { GoogleGenerativeAI };
});

describe('aiService - Gemini Coach Suggestion Engine', () => {
  const originalKey = import.meta.env.VITE_GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    _resetClient();
  });

  afterEach(() => {
    import.meta.env.VITE_GEMINI_API_KEY = originalKey;
    _resetClient();
  });

  test('should fallback to local heuristic suggestions if API key is missing or blank', async () => {
    import.meta.env.VITE_GEMINI_API_KEY = '';

    const res = await fetchOnboardingSuggestions('Athlete', 'Morning Routine');
    expect(mockConstructor).not.toHaveBeenCalled();
    expect(res.stackedHabit).toBe('After I drink my first glass of water in the morning');
  });

  test('should return suggestions from Gemini when API key is present and call is successful', async () => {
    import.meta.env.VITE_GEMINI_API_KEY = 'mock-api-key-xyz';

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          stackedHabit: "After I put my shoes on",
          environmentPrep: "Lay shoes next to bed",
          twoMinRule: "Do 2 squats",
          immediateReward: "Drink water"
        })
      }
    });

    const res = await fetchOnboardingSuggestions('Athlete', 'Morning Routine');
    
    expect(mockConstructor).toHaveBeenCalledWith('mock-api-key-xyz');
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });
    expect(res.stackedHabit).toBe('After I put my shoes on');
    expect(res.environmentPrep).toBe('Lay shoes next to bed');
    expect(res.twoMinRule).toBe('Do 2 squats');
    expect(res.immediateReward).toBe('Drink water');
  });

  test('should return environment suggestions for engine type when API key is present', async () => {
    import.meta.env.VITE_GEMINI_API_KEY = 'mock-api-key-xyz';

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          suggestion: "Set up piano keyboard on desk"
        })
      }
    });

    const res = await fetchEnvironmentSuggestions('engine', 'Play piano');
    expect(res.suggestion).toBe('Set up piano keyboard on desk');
  });

  test('should return environment suggestions for brake type when API key is present', async () => {
    import.meta.env.VITE_GEMINI_API_KEY = 'mock-api-key-xyz';

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          invisibleStrategy: "Hide keyboard in closet",
          difficultStrategy: "Unplug keyboard power cord"
        })
      }
    });

    const res = await fetchEnvironmentSuggestions('brake', 'Play piano');
    expect(res.invisibleStrategy).toBe('Hide keyboard in closet');
    expect(res.difficultStrategy).toBe('Unplug keyboard power cord');
  });

  test('should fallback to local suggestions if Gemini request fails/rejects', async () => {
    import.meta.env.VITE_GEMINI_API_KEY = 'mock-api-key-xyz';
    mockGenerateContent.mockRejectedValue(new Error('API quota limit exceeded'));

    const res = await fetchOnboardingSuggestions('Athlete', 'Morning Routine');
    expect(res.stackedHabit).toBe('After I drink my first glass of water in the morning');
  });
});
