# Panagioti's Cooking 🍳

A personal recipe repository with parsing, translation, unit conversion, and serving scaling features. Built as a static site for GitHub Pages.

## Features

- 🔐 **Password-protected** - Client-side login gate
- 🌍 **Bilingual support** - Greek ↔ English recipes with translations
- ⚖️ **Unit conversion** - Metric, US Customary, and Cooking units
- 🔢 **Serving scaler** - Automatically adjust ingredient quantities
- 🤖 **AI parsing** - Optional Gemini integration for smart recipe parsing
- 📱 **Responsive** - Works on desktop and mobile
- 💾 **Local storage** - Recipes stored in browser (IndexedDB)
- 📤 **Import/Export** - Backup and restore recipes as JSON

## Quick Start

### Local Development

```bash
# Navigate to the project directory
cd cooking

# Serve with any static server
npx serve .
# Or use Python
python -m http.server 8000
# Or use PHP
php -S localhost:8000
```

Open http://localhost:3000 (or 8000) and login with password: `1969cooking`

### Deploy to GitHub Pages

1. **Create a new GitHub repository**
   - Go to https://github.com/new
   - Name it (e.g., `cooking` or `recipes`)
   - Make it public or private

2. **Push the code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main`, folder: `/ (root)`
   - Click Save

4. **Access your site**
   - URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Security Disclaimer

> ⚠️ **Important**: This site uses **client-side password protection only**.

GitHub Pages is a static hosting service and cannot provide true secure authentication without a backend. The password is visible in the source code (`assets/js/auth.js`).

**This is suitable for:**
- Personal use where convenience > security
- Keeping casual visitors out
- Demo/prototype purposes

**For actual security, consider:**
- Using a backend server with proper authentication
- Cloudflare Access or similar services
- A Cloudflare Worker as a proxy with authentication
- GitHub private repos with GitHub Actions for building

## Using the AI Parser

The recipe parser works in two modes:

### 1. Heuristic Parser (Default)
- Works offline
- Uses regex patterns to extract ingredients and steps
- Good for well-formatted recipes

### 2. Gemini AI Parser (Optional)
- More accurate parsing
- Automatic translation between Greek and English
- Requires a Google Gemini API key

**To enable Gemini:**

1. Get an API key from https://makersuite.google.com/app/apikey
2. Go to Settings in the app
3. Paste your API key
4. The parser will automatically use AI when available

> ⚠️ **API Key Security**: Keys stored in browser LocalStorage can be viewed in developer tools. For production use, consider a serverless backend.

### Secure API Key Alternative

Create a Cloudflare Worker as a proxy:

```javascript
// worker.js
export default {
  async fetch(request, env) {
    const { prompt } = await request.json();
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    
    return response;
  }
};
```

## Recipe Data Format

Recipes are stored as JSON with this structure:

```json
{
  "id": "unique-id",
  "title": "Recipe Title",
  "translatedTitle": "Τίτλος Συνταγής",
  "servings": 4,
  "originalLanguage": "en",
  "translatedLanguage": "el",
  "source": "Optional source URL or book",
  "ingredients": [
    {
      "quantity": 500,
      "unit": "g",
      "item": "flour",
      "translatedItem": "αλεύρι",
      "notes": "sifted"
    }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "translatedInstructions": ["Βήμα 1...", "Βήμα 2..."],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

## Unit Conversions

| Metric | US Customary | Cooking |
|--------|--------------|---------|
| 1 g | 0.035 oz | - |
| 28.35 g | 1 oz | - |
| 1 ml | 0.034 fl oz | - |
| 236 ml | 8 fl oz | 1 cup |
| 15 ml | 0.5 fl oz | 1 tbsp |
| 5 ml | 0.17 fl oz | 1 tsp |
| 180°C | 356°F | 356°F |

## Project Structure

```
cooking/
├── index.html          # Login page
├── app.html            # Main application
├── README.md           # This file
├── assets/
│   ├── css/
│   │   └── style.css   # All styles
│   └── js/
│       ├── utils.js    # Utility functions
│       ├── auth.js     # Authentication
│       ├── storage.js  # IndexedDB wrapper
│       ├── converter.js # Unit conversions
│       ├── parser.js   # Heuristic parser
│       ├── translator.js # Translation helpers
│       ├── gemini.js   # AI integration
│       └── app.js      # Main controller
└── data/
    └── recipes.json    # Sample recipes
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires IndexedDB support for recipe storage.

## License

Personal use. Feel free to adapt for your own recipe collection!

---

Made with ❤️ for home cooking
