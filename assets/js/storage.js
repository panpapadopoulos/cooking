/**
 * Storage module for Panagioti's Cooking
 * Uses IndexedDB for recipe storage with JSON import/export
 */

const DB_CONFIG = {
    name: 'PanagiotisRecipes',
    version: 1,
    storeName: 'recipes'
};

let db = null;

// Initialize IndexedDB
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(DB_CONFIG.storeName)) {
                const store = database.createObjectStore(DB_CONFIG.storeName, { keyPath: 'id' });
                store.createIndex('title', 'title', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

// Get all recipes
async function getAllRecipes() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            const recipes = request.result.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            resolve(recipes);
        };
        request.onerror = () => reject(request.error);
    });
}

// Get single recipe by ID
async function getRecipe(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Save recipe (create or update)
async function saveRecipe(recipe) {
    if (!db) await initDB();

    const now = new Date().toISOString();

    if (!recipe.id) {
        recipe.id = generateId();
        recipe.createdAt = now;
    }
    recipe.updatedAt = now;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.put(recipe);

        request.onsuccess = () => resolve(recipe);
        request.onerror = () => reject(request.error);
    });
}

// Delete recipe
async function deleteRecipe(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Clear all recipes
async function clearAllRecipes() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Export all recipes to JSON
async function exportRecipes() {
    const recipes = await getAllRecipes();
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        recipes: recipes
    };
}

// Import recipes from JSON
async function importRecipes(data, merge = true) {
    if (!data.recipes || !Array.isArray(data.recipes)) {
        throw new Error('Invalid import data format');
    }

    if (!merge) {
        await clearAllRecipes();
    }

    const imported = [];
    for (const recipe of data.recipes) {
        // Generate new ID if merging to avoid conflicts
        if (merge) {
            recipe.id = generateId();
        }
        await saveRecipe(recipe);
        imported.push(recipe);
    }

    return imported;
}

// Load sample recipes on first run
async function loadSampleRecipes() {
    try {
        const existing = await getAllRecipes();
        if (existing.length > 0) return; // Already has recipes

        const response = await fetch('data/recipes.json');
        if (!response.ok) return;

        const data = await response.json();
        await importRecipes(data, false);
        console.log('Sample recipes loaded');
    } catch (error) {
        console.log('Could not load sample recipes:', error.message);
    }
}

// Settings storage (uses localStorage)
const SETTINGS_KEY = 'panagiotis_cooking_settings';

function getSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? JSON.parse(stored) : getDefaultSettings();
    } catch {
        return getDefaultSettings();
    }
}

function getDefaultSettings() {
    return {
        unitSystem: 'metric',
        geminiApiKey: ''
    };
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
