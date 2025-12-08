// UNIVERSAL TABLE AJAX CONTROLLER
// Works with: patients, physicians, prescriptions, appointments, billings
// Jax Version — stable & fully debounced & auto-detecting

document.addEventListener("DOMContentLoaded", () => {

  // Detect shared elements automatically
  const filterForm = document.querySelector("#filter-form");
  const tableBody =
    document.querySelector("#table-body") ||
    document.querySelector("[id$='table-body']");
  const paginationContainer = document.querySelector("#pagination-container");
  const resultCount = document.querySelector("#result-count");

  if (!tableBody || !paginationContainer || !filterForm) {
    return; // Page does not use AJAX tables
  }

  let debounceTimer = null;

  // ---- AJAX Loader ----
  function loadAjax(url) {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("AJAX Load Error:", data.error);
          alert("Unable to update table. Please try again.");
          return;
        }
        tableBody.innerHTML = data.rowsHtml;
        paginationContainer.innerHTML = data.paginationHtml;

        if (resultCount && data.count !== undefined && data.totalCount !== undefined) {
          resultCount.textContent =
            `Showing ${data.count} of ${data.totalCount} results`;
        }
      })
      .catch((err) => {
        console.error("AJAX Load Failed:", err);
        alert("Table refresh failed. Check console for details.");
      });
  }

  // ---- Auto-build AJAX URL from form ----
  function buildAjaxUrl() {
    const params = new URLSearchParams(new FormData(filterForm));
    params.set("ajax", "1");

    const base = window.location.pathname;
    return `${base}?${params.toString()}`;
  }

  // ---- Live Input Search with Debounce ----
  function attachTypingSearch() {
    const searchInput =
      filterForm.querySelector(".searchbar-main") ||
      filterForm.querySelector("input[name='search']");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadAjax(buildAjaxUrl());
      }, 200); // nice fast debounce
    });
  }

  // ---- Detect Changes on Dropdowns (sort, gender, specializations, etc.) ----
  filterForm.addEventListener("change", (e) => {
    e.preventDefault();
    loadAjax(buildAjaxUrl());
  });

  // ---- Pagination Link Intercept ----
  paginationContainer.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    e.preventDefault();
    const url = link.href.includes("ajax=1")
      ? link.href
      : link.href + "&ajax=1";

    loadAjax(url);
  });

  // ---- Init ----
  attachTypingSearch();
});
