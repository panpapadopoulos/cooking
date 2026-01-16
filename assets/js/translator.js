/**
 * Translation helper module for Panagioti's Cooking
 * Handles display of original and translated text
 */

// Language names
const LANGUAGE_NAMES = {
    'el': 'Greek',
    'en': 'English',
    'gr': 'Greek' // alias
};

// Get language display name
function getLanguageName(code) {
    return LANGUAGE_NAMES[code] || code;
}

// Check if translation exists
function hasTranslation(recipe) {
    return recipe.translatedTitle || recipe.translatedText ||
        (recipe.ingredients && recipe.ingredients.some(i => i.translatedItem));
}

// Render text with translation below
function renderWithTranslation(original, translation, options = {}) {
    const {
        originalTag = 'div',
        translationTag = 'div',
        originalClass = 'text-original',
        translationClass = 'text-translation'
    } = options;

    let html = `<${originalTag} class="${originalClass}">${escapeHtml(original)}</${originalTag}>`;

    if (translation && translation !== original) {
        html += `<${translationTag} class="${translationClass}">${escapeHtml(translation)}</${translationTag}>`;
    }

    return html;
}

// Render ingredient with translation
function renderIngredientWithTranslation(ingredient) {
    const original = formatIngredientText(ingredient);
    const translation = ingredient.translatedItem ?
        formatIngredientText({
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            item: ingredient.translatedItem,
            notes: ingredient.translatedNotes || ingredient.notes
        }) : null;

    return {
        original,
        translation
    };
}

// Format ingredient as text
function formatIngredientText(ingredient) {
    let text = '';

    if (ingredient.quantity) {
        text += smartRound(ingredient.quantity) + ' ';
    }
    if (ingredient.unit) {
        text += ingredient.unit + ' ';
    }
    text += ingredient.item || '';

    if (ingredient.notes) {
        text += ` (${ingredient.notes})`;
    }

    return text.trim();
}

// Get translation label
function getTranslationLabel(fromLang, toLang) {
    const from = getLanguageName(fromLang);
    const to = getLanguageName(toLang);
    return `${from} → ${to}`;
}

// Create translation badge HTML
function createLanguageBadge(lang, isOriginal = true) {
    const name = getLanguageName(lang);
    const label = isOriginal ? `Original (${name})` : `Translation (${name})`;
    return `<span class="lang-badge ${isOriginal ? 'original' : 'translation'}">${label}</span>`;
}
