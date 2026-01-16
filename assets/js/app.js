/**
 * Main application controller for Panagioti's Cooking
 */

// App state
const appState = {
    currentView: 'recipes',
    currentRecipe: null,
    recipes: [],
    unitSystem: 'metric',
    desiredServings: null
};

// Initialize app
async function initApp() {
    // Check authentication
    if (!requireAuth()) return;

    // Initialize storage
    await initDB();
    await loadSampleRecipes();

    // Load settings
    const settings = getSettings();
    appState.unitSystem = settings.unitSystem || 'metric';

    // Load recipes
    appState.recipes = await getAllRecipes();

    // Setup navigation
    setupNavigation();
    setupSidebar();
    setupEventListeners();

    // Initial route
    handleRoute();
}

// Navigation setup
function setupNavigation() {
    // Handle hash changes
    window.addEventListener('hashchange', handleRoute);

    // Nav item clicks
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = item.getAttribute('data-view');
        });
    });
}

// Handle route
function handleRoute() {
    const hash = window.location.hash.slice(1) || 'recipes';
    const [view, id] = hash.split('/');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });

    // Show appropriate view
    appState.currentView = view;

    switch (view) {
        case 'recipes':
            showRecipesView();
            break;
        case 'recipe':
            showRecipeDetail(id);
            break;
        case 'parse':
            showParseView();
            break;
        case 'settings':
            showSettingsView();
            break;
        default:
            showRecipesView();
    }

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
}

// Sidebar mobile toggle
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    const logoutBtn = document.getElementById('logout-btn');

    menuBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
    });

    logoutBtn?.addEventListener('click', logout);

    // Close sidebar on outside click
    document.addEventListener('click', (e) => {
        if (sidebar?.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== menuBtn) {
            sidebar.classList.remove('open');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // File import
    const fileInput = document.getElementById('file-import-input');
    fileInput?.addEventListener('change', handleFileImport);

    document.getElementById('import-btn')?.addEventListener('click', () => fileInput?.click());
    document.getElementById('export-btn')?.addEventListener('click', handleExport);
}

// Show recipes grid view
async function showRecipesView() {
    const main = document.getElementById('main-content');
    appState.recipes = await getAllRecipes();

    main.innerHTML = `
        <div class="view" id="view-recipes">
            <div class="view-header">
                <h1>My Recipes</h1>
                <div class="view-actions">
                    <button class="btn btn-secondary" id="import-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg><span>Import</span>
                    </button>
                    <button class="btn btn-secondary" id="export-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg><span>Export</span>
                    </button>
                </div>
            </div>
            ${appState.recipes.length ? `
                <div class="recipes-grid" id="recipes-grid">
                    ${appState.recipes.map(renderRecipeCard).join('')}
                </div>
            ` : `
                <div class="empty-state">
                    <div class="empty-icon">📖</div>
                    <h2>No recipes yet</h2>
                    <p>Start by parsing your first recipe!</p>
                    <a href="#parse" class="btn btn-primary">Parse Recipe</a>
                </div>
            `}
        </div>
    `;

    // Add event listeners
    document.getElementById('import-btn')?.addEventListener('click', () => {
        document.getElementById('file-import-input')?.click();
    });
    document.getElementById('export-btn')?.addEventListener('click', handleExport);

    document.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.hash = `recipe/${card.dataset.id}`;
        });
    });
}

// Render recipe card
function renderRecipeCard(recipe) {
    const icon = recipe.originalLanguage === 'el' ? '🥘' : '🍳';
    return `
        <article class="recipe-card" data-id="${recipe.id}">
            <div class="recipe-card-image">${icon}</div>
            <div class="recipe-card-content">
                <h3 class="recipe-card-title">${escapeHtml(recipe.title)}</h3>
                ${recipe.translatedTitle ? `
                    <p class="recipe-card-title-translation">${escapeHtml(recipe.translatedTitle)}</p>
                ` : ''}
                <div class="recipe-card-meta">
                    <span>🍽️ ${recipe.servings} servings</span>
                    <span>🌍 ${getLanguageName(recipe.originalLanguage)}</span>
                </div>
            </div>
        </article>
    `;
}

// Show recipe detail
async function showRecipeDetail(id) {
    const recipe = await getRecipe(id);
    if (!recipe) {
        window.location.hash = 'recipes';
        return;
    }

    appState.currentRecipe = recipe;
    appState.desiredServings = recipe.servings;

    const main = document.getElementById('main-content');
    main.innerHTML = renderRecipeDetail(recipe);

    setupRecipeDetailListeners();
}

// Render recipe detail
function renderRecipeDetail(recipe, desiredServings = null) {
    const servings = desiredServings || recipe.servings;
    const scale = servings / recipe.servings;

    return `
        <div class="view" id="view-recipe-detail">
            <div class="view-header">
                <button class="btn btn-ghost back-btn" onclick="window.location.hash='recipes'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg><span>Back</span>
                </button>
                <div class="view-actions">
                    <button class="btn btn-secondary" id="edit-recipe-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg><span>Edit</span>
                    </button>
                    <button class="btn btn-danger" id="delete-recipe-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg><span>Delete</span>
                    </button>
                </div>
            </div>
            
            <article class="recipe-detail">
                <header class="recipe-detail-header">
                    <h1>${escapeHtml(recipe.title)}</h1>
                    ${recipe.translatedTitle ? `<p class="translation">${escapeHtml(recipe.translatedTitle)}</p>` : ''}
                    <div class="recipe-detail-meta">
                        <span>🍽️ ${recipe.servings} servings</span>
                        <span>🌍 ${getLanguageName(recipe.originalLanguage)}</span>
                        ${recipe.source ? `<span>📖 ${escapeHtml(recipe.source)}</span>` : ''}
                    </div>
                </header>
                
                <div class="recipe-detail-body">
                    <div class="recipe-controls">
                        <div class="control-group">
                            <label for="unit-toggle">Units</label>
                            <select id="unit-toggle">
                                <option value="metric" ${appState.unitSystem === 'metric' ? 'selected' : ''}>Metric</option>
                                <option value="us" ${appState.unitSystem === 'us' ? 'selected' : ''}>US Customary</option>
                                <option value="cooking" ${appState.unitSystem === 'cooking' ? 'selected' : ''}>Cooking</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label for="servings-input">Servings</label>
                            <input type="number" id="servings-input" min="1" max="100" value="${servings}">
                        </div>
                    </div>
                    
                    <section class="recipe-section">
                        <h2>Ingredients</h2>
                        <table class="ingredients-table">
                            <thead>
                                <tr>
                                    <th>Quantity</th>
                                    <th>Ingredient</th>
                                    <th>Converted</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recipe.ingredients.map(ing => renderIngredientRow(ing, scale)).join('')}
                            </tbody>
                        </table>
                    </section>
                    
                    <section class="recipe-section">
                        <h2>Instructions</h2>
                        <div class="instructions-list">
                            ${recipe.instructions.map((step, i) => `
                                <div class="instruction-step">
                                    <span class="step-number">${i + 1}</span>
                                    <div class="step-content">
                                        <p class="step-original">${escapeHtml(step)}</p>
                                        ${recipe.translatedInstructions?.[i] ? `
                                            <p class="step-translation">${escapeHtml(recipe.translatedInstructions[i])}</p>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>
            </article>
        </div>
    `;
}

// Render ingredient row
function renderIngredientRow(ingredient, scale = 1) {
    const scaledQty = ingredient.quantity ? scaleQuantity(ingredient.quantity, 1, scale) : null;
    const converted = convertIngredient({ ...ingredient, quantity: scaledQty }, appState.unitSystem);

    const original = formatQuantityUnit(scaledQty, ingredient.unit);
    const convertedDisplay = converted.converted ? formatQuantityUnit(converted.quantity, converted.unit) : '—';

    return `
        <tr>
            <td>${original || '—'}</td>
            <td>
                <span class="ingredient-original">${escapeHtml(ingredient.item)}</span>
                ${ingredient.translatedItem ? `<br><span class="ingredient-translation">${escapeHtml(ingredient.translatedItem)}</span>` : ''}
                ${ingredient.notes ? `<br><small>(${escapeHtml(ingredient.notes)})</small>` : ''}
            </td>
            <td><span class="ingredient-converted">${convertedDisplay}</span></td>
        </tr>
    `;
}

// Setup recipe detail listeners
function setupRecipeDetailListeners() {
    document.getElementById('unit-toggle')?.addEventListener('change', (e) => {
        appState.unitSystem = e.target.value;
        const settings = getSettings();
        settings.unitSystem = appState.unitSystem;
        saveSettings(settings);
        showRecipeDetail(appState.currentRecipe.id);
    });

    document.getElementById('servings-input')?.addEventListener('change', (e) => {
        appState.desiredServings = parseInt(e.target.value) || appState.currentRecipe.servings;
        const main = document.getElementById('main-content');
        main.innerHTML = renderRecipeDetail(appState.currentRecipe, appState.desiredServings);
        setupRecipeDetailListeners();
    });

    document.getElementById('edit-recipe-btn')?.addEventListener('click', () => {
        showParseView(appState.currentRecipe);
    });

    document.getElementById('delete-recipe-btn')?.addEventListener('click', async () => {
        showModal('Delete Recipe', `<p>Are you sure you want to delete "${appState.currentRecipe.title}"?</p>`, [
            { text: 'Cancel', class: 'btn-secondary' },
            {
                text: 'Delete', class: 'btn-danger', onClick: async () => {
                    await deleteRecipe(appState.currentRecipe.id);
                    showToast('Recipe deleted', 'success');
                    window.location.hash = 'recipes';
                }
            }
        ]);
    });
}

// Show parse view
function showParseView(editRecipe = null) {
    const main = document.getElementById('main-content');

    main.innerHTML = `
        <div class="view" id="view-parse">
            <div class="view-header">
                <h1>${editRecipe ? 'Edit Recipe' : 'Parse New Recipe'}</h1>
            </div>
            
            <div class="parse-container">
                <div class="parse-input-section" ${editRecipe ? 'style="display:none"' : ''}>
                    <div class="form-group">
                        <label for="recipe-text">Paste your recipe here</label>
                        <textarea id="recipe-text" class="recipe-textarea" placeholder="Paste a recipe..." rows="12"></textarea>
                    </div>
                    <div class="parse-options">
                        <div class="form-group">
                            <label for="source-lang">Source Language</label>
                            <select id="source-lang">
                                <option value="auto">Auto-detect</option>
                                <option value="el">Greek</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        <div class="parse-mode-indicator" id="parse-mode-indicator">
                            <span class="mode-badge ${isGeminiConfigured() ? 'gemini' : 'heuristic'}">
                                Using: ${isGeminiConfigured() ? 'AI Parser' : 'Heuristic Parser'}
                            </span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-block" id="parse-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg><span>Parse Recipe</span>
                    </button>
                </div>
                
                <div class="parse-preview-section" id="parse-preview" ${editRecipe ? '' : 'style="display:none"'}>
                    <h2>Preview & Edit</h2>
                    <form id="recipe-form" class="recipe-form">
                        <input type="hidden" id="recipe-id" value="${editRecipe?.id || ''}">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="recipe-title">Title</label>
                                <input type="text" id="recipe-title" required value="${editRecipe ? escapeHtml(editRecipe.title) : ''}">
                            </div>
                            <div class="form-group form-group-small">
                                <label for="recipe-servings">Servings</label>
                                <input type="number" id="recipe-servings" min="1" value="${editRecipe?.servings || 4}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="recipe-source">Source (optional)</label>
                            <input type="text" id="recipe-source" placeholder="URL or book" value="${editRecipe?.source || ''}">
                        </div>
                        <div class="form-section">
                            <div class="form-section-header">
                                <h3>Ingredients</h3>
                                <button type="button" class="btn btn-ghost btn-sm" id="add-ingredient-btn">+ Add</button>
                            </div>
                            <div class="ingredients-list" id="ingredients-list">
                                ${editRecipe ? editRecipe.ingredients.map((ing, i) => renderIngredientInput(ing, i)).join('') : ''}
                            </div>
                        </div>
                        <div class="form-section">
                            <div class="form-section-header">
                                <h3>Instructions</h3>
                                <button type="button" class="btn btn-ghost btn-sm" id="add-step-btn">+ Add Step</button>
                            </div>
                            <div class="steps-list" id="steps-list">
                                ${editRecipe ? editRecipe.instructions.map((step, i) => renderStepInput(step, i)).join('') : ''}
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancel-parse-btn">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                </svg><span>Save Recipe</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    setupParseListeners();
}

// Render ingredient input row
function renderIngredientInput(ingredient = {}, index = 0) {
    return `
        <div class="ingredient-row" data-index="${index}">
            <input type="number" step="any" placeholder="Qty" value="${ingredient.quantity || ''}">
            <input type="text" placeholder="Unit" value="${ingredient.unit || ''}">
            <input type="text" placeholder="Ingredient" value="${escapeHtml(ingredient.item || '')}" required>
            <button type="button" class="remove-btn" onclick="this.parentElement.remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
}

// Render step input row
function renderStepInput(step = '', index = 0) {
    return `
        <div class="step-row" data-index="${index}">
            <textarea placeholder="Instruction step..." required>${escapeHtml(step)}</textarea>
            <button type="button" class="remove-btn" onclick="this.parentElement.remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
}

// Setup parse view listeners
function setupParseListeners() {
    document.getElementById('parse-btn')?.addEventListener('click', handleParse);

    document.getElementById('add-ingredient-btn')?.addEventListener('click', () => {
        const list = document.getElementById('ingredients-list');
        const index = list.children.length;
        list.insertAdjacentHTML('beforeend', renderIngredientInput({}, index));
    });

    document.getElementById('add-step-btn')?.addEventListener('click', () => {
        const list = document.getElementById('steps-list');
        const index = list.children.length;
        list.insertAdjacentHTML('beforeend', renderStepInput('', index));
    });

    document.getElementById('cancel-parse-btn')?.addEventListener('click', () => {
        window.location.hash = 'recipes';
    });

    document.getElementById('recipe-form')?.addEventListener('submit', handleSaveRecipe);
}

// Handle parse
async function handleParse() {
    const text = document.getElementById('recipe-text').value.trim();
    if (!text) {
        showToast('Please paste a recipe first', 'warning');
        return;
    }

    const btn = document.getElementById('parse-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>Parsing...</span>';

    try {
        const sourceLang = document.getElementById('source-lang').value;
        const parsed = await smartParseRecipe(text, sourceLang);

        // Show preview
        document.querySelector('.parse-input-section').style.display = 'none';
        document.getElementById('parse-preview').style.display = 'block';

        // Fill form
        document.getElementById('recipe-title').value = parsed.title;
        document.getElementById('recipe-servings').value = parsed.servings;

        const ingredientsList = document.getElementById('ingredients-list');
        ingredientsList.innerHTML = parsed.ingredients.map((ing, i) => renderIngredientInput(ing, i)).join('');

        const stepsList = document.getElementById('steps-list');
        stepsList.innerHTML = parsed.instructions.map((step, i) => renderStepInput(step, i)).join('');

        // Store parsed data for saving
        appState.parsedRecipe = parsed;

        showToast('Recipe parsed successfully!', 'success');
    } catch (error) {
        console.error('Parse error:', error);
        showToast('Failed to parse recipe: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Parse Recipe</span>';
    }
}

// Handle save recipe
async function handleSaveRecipe(e) {
    e.preventDefault();

    const id = document.getElementById('recipe-id').value;
    const title = document.getElementById('recipe-title').value.trim();
    const servings = parseInt(document.getElementById('recipe-servings').value) || 4;
    const source = document.getElementById('recipe-source').value.trim();

    // Collect ingredients
    const ingredients = [];
    document.querySelectorAll('.ingredient-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const quantity = parseFloat(inputs[0].value) || null;
        const unit = inputs[1].value.trim() || null;
        const item = inputs[2].value.trim();
        if (item) {
            ingredients.push({ quantity, unit, item });
        }
    });

    // Collect instructions
    const instructions = [];
    document.querySelectorAll('.step-row textarea').forEach(textarea => {
        const step = textarea.value.trim();
        if (step) instructions.push(step);
    });

    if (!title || ingredients.length === 0) {
        showToast('Please add a title and at least one ingredient', 'warning');
        return;
    }

    const recipe = {
        id: id || null,
        title,
        servings,
        source,
        ingredients,
        instructions,
        originalLanguage: appState.parsedRecipe?.originalLanguage || detectLanguage(title),
        translatedTitle: appState.parsedRecipe?.translatedTitle,
        translatedInstructions: appState.parsedRecipe?.translatedInstructions,
        originalText: appState.parsedRecipe?.originalText
    };

    // Copy translations if editing
    if (id && appState.currentRecipe) {
        recipe.translatedTitle = recipe.translatedTitle || appState.currentRecipe.translatedTitle;
        recipe.translatedInstructions = recipe.translatedInstructions || appState.currentRecipe.translatedInstructions;
    }

    try {
        await saveRecipe(recipe);
        showToast('Recipe saved!', 'success');
        appState.parsedRecipe = null;
        window.location.hash = 'recipes';
    } catch (error) {
        console.error('Save error:', error);
        showToast('Failed to save recipe', 'error');
    }
}

// Show settings view
function showSettingsView() {
    const settings = getSettings();
    const main = document.getElementById('main-content');

    main.innerHTML = `
        <div class="view" id="view-settings">
            <div class="view-header"><h1>Settings</h1></div>
            <div class="settings-container">
                <section class="settings-section">
                    <h2>Display Preferences</h2>
                    <div class="setting-item">
                        <div class="setting-info">
                            <label for="unit-system">Default Unit System</label>
                            <p class="setting-description">Choose how ingredient quantities are displayed</p>
                        </div>
                        <select id="unit-system">
                            <option value="metric" ${settings.unitSystem === 'metric' ? 'selected' : ''}>Metric</option>
                            <option value="us" ${settings.unitSystem === 'us' ? 'selected' : ''}>US Customary</option>
                            <option value="cooking" ${settings.unitSystem === 'cooking' ? 'selected' : ''}>Cooking</option>
                        </select>
                    </div>
                </section>
                <section class="settings-section">
                    <h2>AI Integration</h2>
                    <div class="setting-item">
                        <div class="setting-info">
                            <label>Google Gemini API Key</label>
                            <p class="setting-description">Enable AI-powered parsing. <a href="https://makersuite.google.com/app/apikey" target="_blank">Get API key</a></p>
                        </div>
                        <div class="api-key-input">
                            <input type="password" id="gemini-api-key" placeholder="Enter API key" value="${settings.geminiApiKey || ''}">
                            <button type="button" class="btn btn-ghost" id="toggle-key-visibility">👁️</button>
                        </div>
                    </div>
                    <div class="warning-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <div><strong>Security Notice:</strong> API keys stored in browser can be accessed via developer tools.</div>
                    </div>
                    <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
                </section>
                <section class="settings-section">
                    <h2>Data Management</h2>
                    <div class="setting-item">
                        <div class="setting-info"><label>Export All Data</label><p class="setting-description">Download all recipes as JSON</p></div>
                        <button class="btn btn-secondary" id="export-all-btn">Export</button>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info"><label>Import Data</label><p class="setting-description">Import recipes from JSON</p></div>
                        <button class="btn btn-secondary" id="import-data-btn">Import</button>
                    </div>
                    <div class="setting-item danger">
                        <div class="setting-info"><label>Clear All Data</label><p class="setting-description">Remove all recipes</p></div>
                        <button class="btn btn-danger" id="clear-data-btn">Clear Data</button>
                    </div>
                </section>
            </div>
        </div>
    `;

    setupSettingsListeners();
}

// Setup settings listeners
function setupSettingsListeners() {
    document.getElementById('toggle-key-visibility')?.addEventListener('click', () => {
        const input = document.getElementById('gemini-api-key');
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        const settings = {
            unitSystem: document.getElementById('unit-system').value,
            geminiApiKey: document.getElementById('gemini-api-key').value.trim()
        };
        saveSettings(settings);
        appState.unitSystem = settings.unitSystem;
        showToast('Settings saved!', 'success');
    });

    document.getElementById('export-all-btn')?.addEventListener('click', handleExport);
    document.getElementById('import-data-btn')?.addEventListener('click', () => {
        document.getElementById('file-import-input')?.click();
    });
    document.getElementById('clear-data-btn')?.addEventListener('click', () => {
        showModal('Clear All Data', '<p>Are you sure? This cannot be undone.</p>', [
            { text: 'Cancel', class: 'btn-secondary' },
            {
                text: 'Clear', class: 'btn-danger', onClick: async () => {
                    await clearAllRecipes();
                    appState.recipes = [];
                    showToast('All data cleared', 'success');
                    showRecipesView();
                }
            }
        ]);
    });
}

// Handle export
async function handleExport() {
    try {
        const data = await exportRecipes();
        downloadJSON(data, `panagiotis-recipes-${new Date().toISOString().slice(0, 10)}.json`);
        showToast('Recipes exported!', 'success');
    } catch (error) {
        showToast('Export failed', 'error');
    }
}

// Handle file import
async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await readFileAsText(file);
        const data = JSON.parse(text);

        showModal('Import Recipes', `<p>Found ${data.recipes?.length || 0} recipes. How would you like to import?</p>`, [
            { text: 'Cancel', class: 'btn-secondary' },
            {
                text: 'Replace All', class: 'btn-danger', onClick: async () => {
                    await importRecipes(data, false);
                    showToast('Recipes imported!', 'success');
                    showRecipesView();
                }
            },
            {
                text: 'Merge', class: 'btn-primary', onClick: async () => {
                    await importRecipes(data, true);
                    showToast('Recipes merged!', 'success');
                    showRecipesView();
                }
            }
        ]);
    } catch (error) {
        showToast('Invalid JSON file', 'error');
    }

    e.target.value = '';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initApp);
