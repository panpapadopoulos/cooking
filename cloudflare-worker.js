/**
 * Cloudflare Worker - Password Protection + API for Panagioti's Cooking
 * 
 * Features:
 * 1. Password authentication
 * 2. URL fetch proxy (for parsing recipes from websites)
 * 3. Gemini API proxy (keeps API key secret)
 */

const COOKIE_NAME = 'cooking_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Login page HTML
const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panagioti's Cooking - Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #faf8f5 0%, #f0ebe3 100%); padding: 20px; }
        .login-card { background: white; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); padding: 48px; max-width: 400px; width: 100%; text-align: center; }
        .logo { font-size: 3.5rem; margin-bottom: 16px; }
        h1 { font-size: 1.5rem; margin-bottom: 8px; color: #2d2a26; }
        .tagline { color: #6b6560; font-size: 0.9rem; margin-bottom: 24px; }
        form { display: flex; flex-direction: column; gap: 16px; }
        input { padding: 14px 16px; border: 2px solid #e5ddd3; border-radius: 8px; font-size: 1rem; }
        input:focus { outline: none; border-color: #c45d35; }
        button { padding: 14px 24px; background: #c45d35; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        button:hover { background: #a04a2a; }
        .error { color: #c45d35; font-size: 0.875rem; min-height: 1.5em; }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="logo">🍳</div>
        <h1>Panagioti's Cooking</h1>
        <p class="tagline">Personal Recipe Repository</p>
        <form method="POST">
            <input type="password" name="password" placeholder="Enter password" required autofocus>
            <div class="error">{{ERROR}}</div>
            <button type="submit">Enter Kitchen →</button>
        </form>
    </div>
</body>
</html>`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const cookie = request.headers.get('Cookie') || '';
        const isAuthenticated = cookie.includes(COOKIE_NAME + '=authenticated');

        // API endpoints (require authentication)
        if (path.startsWith('/api/')) {
            // Check auth for API calls
            if (!isAuthenticated) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Handle API routes
            if (path === '/api/fetch-url' && request.method === 'POST') {
                return handleFetchUrl(request, env);
            }

            if (path === '/api/parse-recipe' && request.method === 'POST') {
                return handleParseRecipe(request, env);
            }

            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if already authenticated
        if (isAuthenticated) {
            return fetch(request);
        }

        // Handle login form submission
        if (request.method === 'POST') {
            try {
                const formData = await request.formData();
                const password = formData.get('password');

                if (password === env.SITE_PASSWORD) {
                    return new Response(null, {
                        status: 302,
                        headers: {
                            'Location': url.pathname,
                            'Set-Cookie': COOKIE_NAME + '=authenticated; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + COOKIE_MAX_AGE
                        }
                    });
                }
                return new Response(LOGIN_HTML.replace('{{ERROR}}', 'Incorrect password.'), {
                    headers: { 'Content-Type': 'text/html' }
                });
            } catch (e) {
                return new Response(LOGIN_HTML.replace('{{ERROR}}', 'Error processing request.'), {
                    headers: { 'Content-Type': 'text/html' }
                });
            }
        }

        // Show login page
        return new Response(LOGIN_HTML.replace('{{ERROR}}', ''), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
};

// Fetch URL content (proxy to avoid CORS)
async function handleFetchUrl(request, env) {
    try {
        const { url } = await request.json();

        if (!url || !url.startsWith('http')) {
            return new Response(JSON.stringify({ error: 'Invalid URL' }), {
                status: 400,
                headers: corsHeaders()
            });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RecipeParser/1.0)'
            }
        });

        const html = await response.text();

        return new Response(JSON.stringify({ html, url }), {
            headers: corsHeaders()
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders()
        });
    }
}

// Parse recipe using Gemini API
async function handleParseRecipe(request, env) {
    try {
        const { content, type } = await request.json(); // type: 'html' or 'text'

        if (!env.GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
                status: 500,
                headers: corsHeaders()
            });
        }

        const prompt = type === 'html'
            ? buildHtmlParsePrompt(content)
            : buildTextParsePrompt(content);

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4096
                    }
                })
            }
        );

        const data = await geminiResponse.json();

        if (data.error) {
            return new Response(JSON.stringify({ error: data.error.message }), {
                status: 500,
                headers: corsHeaders()
            });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return new Response(JSON.stringify({ error: 'No response from Gemini' }), {
                status: 500,
                headers: corsHeaders()
            });
        }

        // Extract JSON from response
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const recipe = JSON.parse(jsonStr.trim());

        return new Response(JSON.stringify({ recipe }), {
            headers: corsHeaders()
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders()
        });
    }
}

function buildHtmlParsePrompt(html) {
    return `Extract the recipe from this HTML page and return a JSON object.

HTML content:
${html.substring(0, 15000)}

Return this exact JSON structure:
{
  "title": "Recipe title",
  "translatedTitle": "Title in other language (Greek if English, English if Greek)",
  "servings": 4,
  "originalLanguage": "en or el",
  "translatedLanguage": "el or en", 
  "ingredients": [
    { "quantity": 500, "unit": "g", "item": "flour", "translatedItem": "αλεύρι" }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "translatedInstructions": ["Βήμα 1...", "Βήμα 2..."],
  "source": "URL or source name"
}

Rules:
- Detect language and translate to the other (Greek ↔ English)
- Use standard units (g, kg, ml, l, cup, tbsp, tsp)
- Quantity should be a number or null
- Return ONLY JSON, no markdown or explanation`;
}

function buildTextParsePrompt(text) {
    return `Parse this recipe text and return a JSON object.

Recipe text:
${text}

Return this exact JSON structure:
{
  "title": "Recipe title",
  "translatedTitle": "Title in other language (Greek if English, English if Greek)",
  "servings": 4,
  "originalLanguage": "en or el",
  "translatedLanguage": "el or en",
  "ingredients": [
    { "quantity": 500, "unit": "g", "item": "flour", "translatedItem": "αλεύρι" }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "translatedInstructions": ["Βήμα 1...", "Βήμα 2..."]
}

Rules:
- Detect language and translate to the other (Greek ↔ English)
- Use standard units (g, kg, ml, l, cup, tbsp, tsp)
- Quantity should be a number or null
- Return ONLY JSON, no markdown or explanation`;
}

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}
