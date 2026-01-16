/**
 * Cloudflare Worker - Password Protection for Panagioti's Cooking
 * 
 * This Worker sits in front of your GitHub Pages site and requires
 * a password before allowing access.
 * 
 * Deploy to Cloudflare Workers, then route your domain through it.
 */

// Configuration - password is stored as an environment variable
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
        body {
            font-family: 'Outfit', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #faf8f5 0%, #f0ebe3 100%);
            padding: 20px;
        }
        .login-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            padding: 48px;
            max-width: 400px;
            width: 100%;
            text-align: center;
        }
        .logo { font-size: 3.5rem; margin-bottom: 16px; }
        h1 { font-size: 1.5rem; margin-bottom: 8px; color: #2d2a26; }
        .tagline { color: #6b6560; font-size: 0.9rem; margin-bottom: 24px; }
        form { display: flex; flex-direction: column; gap: 16px; }
        input {
            padding: 14px 16px;
            border: 2px solid #e5ddd3;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        input:focus { outline: none; border-color: #c45d35; }
        button {
            padding: 14px 24px;
            background: #c45d35;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
        }
        button:hover { background: #a04a2a; transform: translateY(-1px); }
        .error { color: #c45d35; font-size: 0.875rem; min-height: 1.5em; }
        .footer { margin-top: 24px; color: #9a948d; font-size: 0.75rem; }
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
        <p class="footer">🔒 Secure server-side authentication</p>
    </div>
</body>
</html>`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const cookie = request.headers.get('Cookie') || '';

        // Check if already authenticated
        if (cookie.includes(`${COOKIE_NAME}=authenticated`)) {
            // Forward request to origin (GitHub Pages)
            return fetch(request);
        }

        // Handle login form submission
        if (request.method === 'POST') {
            try {
                const formData = await request.formData();
                const password = formData.get('password');

                // Check password against environment variable
                if (password === env.SITE_PASSWORD) {
                    // Set auth cookie and redirect
                    return new Response(null, {
                        status: 302,
                        headers: {
                            'Location': url.pathname,
                            'Set-Cookie': `${COOKIE_NAME}=authenticated; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`
                        }
                    });
                } else {
                    // Wrong password
                    return new Response(
                        LOGIN_HTML.replace('{{ERROR}}', 'Incorrect password. Please try again.'),
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                }
            } catch (e) {
                return new Response(
                    LOGIN_HTML.replace('{{ERROR}}', 'Error processing request.'),
                    { headers: { 'Content-Type': 'text/html' } }
                );
            }
        }

        // Show login page
        return new Response(
            LOGIN_HTML.replace('{{ERROR}}', ''),
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
};
