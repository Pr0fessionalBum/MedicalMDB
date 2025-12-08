// /utils/pagination.js
export function renderPagination(req, baseRoute, currentPage, totalPages) {
  if (totalPages <= 1) return "";

  const queryParams = { ...req.query };
  delete queryParams.page;
  delete queryParams.ajax;

  const queryString = new URLSearchParams(queryParams).toString();
  const qs = queryString ? `&${queryString}` : "";

  let html = `
  <nav class="pagination-nav">
    <div class="pagination-pages">
  `;

  // ---- page window logic (5 numbers total) ----
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  if (end - start < 4) {
    if (start === 1) end = Math.min(totalPages, start + 4);
    else start = Math.max(1, end - 4);
  }

  // FIRST PAGE BUTTON IF NEEDED
  if (start > 1) {
    html += pageButton(1, currentPage, baseRoute, qs);
    html += `<span class="page-dot">...</span>`;
  }

  // MAIN PAGE WINDOW
  for (let p = start; p <= end; p++) {
    html += pageButton(p, currentPage, baseRoute, qs);
  }

  // LAST PAGE BUTTON
  if (end < totalPages) {
    html += `<span class="page-dot">...</span>`;
    html += pageButton(totalPages, currentPage, baseRoute, qs);
  }

  html += `
    </div>

    <div class="pagination-goto">
      <input 
        type="number" 
        min="1" 
        max="${totalPages}" 
        value="${currentPage}" 
        class="pagination-input"
        onchange="window.location.href='${baseRoute}?page=' + this.value + '${qs}'">
    </div>
  </nav>

  <div class="pagination-per-page">
    <label>Per page:</label>
    <select id="page-size-selector"
      onchange="window.location.href='${baseRoute}?page=1${qs}&limit=' + this.value">
      <option value="10" ${req.query.limit == 10 ? "selected" : ""}>10</option>
      <option value="25" ${req.query.limit == 25 ? "selected" : ""}>25</option>
      <option value="50" ${req.query.limit == 50 ? "selected" : ""}>50</option>
      <option value="100" ${req.query.limit == 100 ? 'selected' : ""}>100</option>
    </select>
  </div>
  `;

  return html;
}

function pageButton(pageNum, currentPage, baseRoute, qs) {
  const activeClass = pageNum === currentPage ? "active" : "";
  return `
    <a 
      href="${baseRoute}?page=${pageNum}${qs}" 
      class="page-link ${activeClass}">
      ${pageNum}
    </a>
  `;
}
