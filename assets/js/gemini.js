/**
 * Google Gemini API integration for Panagioti's Cooking
 * Provides AI-powered recipe parsing and translation
 * 
 * SECURITY WARNING:
 * API keys stored in browser localStorage can be accessed by anyone with 
 * access to your device or browser developer tools. For production use,
 * consider using a serverless backend (Cloudflare Workers, Vercel Functions, etc.)
 */

const GEMINI_CONFIG = {
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    model: 'gemini-pro'
};

// Check if Gemini API is configured
function isGeminiConfigured() {
    const settings = getSettings();
    return settings.geminiApiKey && settings.geminiApiKey.length > 0;
}

// Call Gemini API
async function callGemini(prompt) {
    const settings = getSettings();
    const apiKey = settings.geminiApiKey;

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`${GEMINI_CONFIG.apiEndpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                topK: 1,
                topP: 1,
                maxOutputTokens: 4096
            }
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('No response from Gemini');
    }

    return text;
}

// Parse recipe with Gemini
async function parseRecipeWithGemini(recipeText, sourceLang = 'auto') {
    const prompt = `Parse the following recipe and return a JSON object with this exact structure:
{
  "title": "Recipe title in original language",
  "translatedTitle": "Recipe title translated to ${sourceLang === 'el' ? 'English' : 'Greek'}",
  "servings": 4,
  "originalLanguage": "el or en",
  "translatedLanguage": "en or el",
  "ingredients": [
    {
      "quantity": 500,
      "unit": "g",
      "item": "ground beef",
      "translatedItem": "κιμάς μοσχαρίσιος",
      "notes": "optional notes"
    }
  ],
  "instructions": [
    "Step 1 in original language"
  ],
  "translatedInstructions": [
    "Step 1 translated"
  ]
}

Important rules:
1. Detect the original language (el for Greek, en for English)
2. Translate all text to the other language
3. Use standardized units (g, kg, ml, l, cup, tbsp, tsp, oz)
4. Quantity should be a number, not a string
5. If a quantity is vague (like "a pinch"), use null for quantity
6. Return ONLY the JSON, no markdown or explanation

Recipe text:
${recipeText}`;

    const response = await callGemini(prompt);

    // Extract JSON from response
    let jsonStr = response;

    // Handle markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1];
    }

    try {
        const parsed = JSON.parse(jsonStr.trim());
        parsed.originalText = recipeText;
        parsed.source = '';
        return parsed;
    } catch (e) {
        console.error('Failed to parse Gemini response:', response);
        throw new Error('Failed to parse AI response as JSON');
    }
}

// Translate text with Gemini
async function translateWithGemini(text, fromLang, toLang) {
    const fromName = fromLang === 'el' ? 'Greek' : 'English';
    const toName = toLang === 'el' ? 'Greek' : 'English';

    const prompt = `Translate the following text from ${fromName} to ${toName}. 
Return ONLY the translation, no explanations.

Text: ${text}`;

    return await callGemini(prompt);
}

// Smart parse - uses Gemini if available, falls back to heuristic
async function smartParseRecipe(recipeText, sourceLang = 'auto') {
    if (isGeminiConfigured()) {
        try {
            return await parseRecipeWithGemini(recipeText, sourceLang);
        } catch (error) {
            console.warn('Gemini parsing failed, falling back to heuristic:', error.message);
            showToast('AI parsing failed, using basic parser', 'warning');
        }
    }

    // Fall back to heuristic parser
    return parseRecipe(recipeText, sourceLang);
}
