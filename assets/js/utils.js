/**
 * Utility functions for Panagioti's Cooking
 */

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show modal
function showModal(title, body, buttons = []) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = typeof body === 'string' ? body : '';
    if (typeof body !== 'string') modalBody.appendChild(body);
    
    modalFooter.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `btn ${btn.class || 'btn-secondary'}`;
        button.textContent = btn.text;
        button.onclick = () => {
            if (btn.onClick) btn.onClick();
            hideModal();
        };
        modalFooter.appendChild(button);
    });
    
    overlay.style.display = 'flex';
    
    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) hideModal();
    };
    
    // Close button
    document.getElementById('modal-close').onclick = hideModal;
}

function hideModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// Download JSON file
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Smart number rounding for recipe quantities
function smartRound(num) {
    if (num === 0) return 0;
    if (num < 0.125) return Math.round(num * 100) / 100;
    
    // Common fractions
    const fractions = [
        { value: 0.125, display: '⅛' },
        { value: 0.25, display: '¼' },
        { value: 0.333, display: '⅓' },
        { value: 0.5, display: '½' },
        { value: 0.666, display: '⅔' },
        { value: 0.75, display: '¾' }
    ];
    
    const whole = Math.floor(num);
    const decimal = num - whole;
    
    // Find closest fraction
    let closestFraction = null;
    let minDiff = 0.1;
    
    for (const frac of fractions) {
        const diff = Math.abs(decimal - frac.value);
        if (diff < minDiff) {
            minDiff = diff;
            closestFraction = frac;
        }
    }
    
    if (closestFraction && minDiff < 0.05) {
        if (whole === 0) return closestFraction.display;
        return `${whole} ${closestFraction.display}`;
    }
    
    // Round to 2 decimal places
    return Math.round(num * 100) / 100;
}

// Detect language (simple heuristic)
function detectLanguage(text) {
    // Greek character range
    const greekPattern = /[\u0370-\u03FF\u1F00-\u1FFF]/;
    const greekMatches = (text.match(greekPattern) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (totalChars === 0) return 'en';
    return greekMatches / totalChars > 0.3 ? 'el' : 'en';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
