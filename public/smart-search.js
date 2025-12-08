/**
 * Smart Search & Autocomplete Module
 * Provides global search with autocomplete and real-time suggestions
 */

(function() {
  // Initialize search on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmartSearch);
  } else {
    initSmartSearch();
  }

  function initSmartSearch() {
    const searchInput = document.getElementById('global-search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    let debounceTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimeout);
      const query = e.target.value.trim();

      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }

      debounceTimeout = setTimeout(() => {
        performSearch(query, searchResults);
      }, 300); // 300ms debounce
    });

    // Click outside to close results
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-search-container]')) {
        searchResults.innerHTML = '';
      }
    });
  }

  async function performSearch(query, resultsContainer) {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
      const results = await response.json();

      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>';
        return;
      }

      resultsContainer.innerHTML = results
        .map(result => createResultElement(result))
        .join('');

      // Add click handlers
      resultsContainer.querySelectorAll('[data-result-link]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = link.href;
        });
      });
    } catch (err) {
      console.error('Search error:', err);
      resultsContainer.innerHTML = '<div class="search-error">Search failed</div>';
    }
  }

  function createResultElement(result) {
    const href = result.type === 'patient' ? `/patients/${result.id}` :
                 result.type === 'physician' ? `/physicians` :
                 `/prescriptions`;

    return `
      <a href="${href}" class="search-result-item" data-result-link>
        <div class="search-result-icon">${getIcon(result.type)}</div>
        <div class="search-result-content">
          <div class="search-result-label">${result.label}</div>
          <div class="search-result-type">${result.type}</div>
        </div>
      </a>
    `;
  }

  function getIcon(type) {
    switch (type) {
      case 'patient': return '👤';
      case 'physician': return '👨‍⚕️';
      case 'prescription': return '💊';
      default: return '📋';
    }
  }
})();

/**
 * Dynamic Filter Handler
 * Manages filter application and URL updates
 */
function applyFilters(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('change', () => {
    form.submit();
  });
}
