// /utils/ppagination.js

export function buildPaginationQuery(query, page) {
  const params = { ...query, page };
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v ?? "")}`)
    .join("&");
}

export function renderPagination(req, baseRoute, current, total, includePerPage = false) {
  if (total <= 1) return "";

  let html = `<nav class="pagination-nav">`;

  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);

  if (end - start < 4) start = Math.max(1, end - 4);

  // FIRST PAGE
  if (start > 1) {
    html += `<a href="${baseRoute}?${buildPaginationQuery(req.query, 1)}" class="pagination-link">1</a>`;
  }

  // NUMBER BLOCK
  for (let p = start; p <= end; p++) {
    html += `<a href="${baseRoute}?${buildPaginationQuery(req.query, p)}" class="pagination-link${
      p === current ? " active" : ""
    }">${p}</a>`;
  }

  // LAST PAGE
  if (end < total) {
    html += `<a href="${baseRoute}?${buildPaginationQuery(req.query, total)}" class="pagination-link">Last</a>`;
  }

  // INPUT JUMP
  html += `
    <input type="number"
      min="1" max="${total}"
      value="${current}"
      class="pagination-input"
      style="width:40px; font-size:12px; margin-left:8px;"
      onchange="window.location.href='${baseRoute}?${buildPaginationQuery(req.query, "")}&page='+this.value">
  `;

  html += `</nav>`;

  // OPTIONAL per-page dropdown (use only if needed)
  if (includePerPage) {
    const currentLimit = parseInt(req.query.limit || 10);
    html += `
      <div class="perpage-controls" style="margin-top:8px; text-align:right; font-size:12px;">
        <label>Per page:</label>
        <select onchange="window.location.href='${baseRoute}?${buildPaginationQuery(
          req.query,
          current
        )}&limit='+this.value">
          <option value="10"  ${currentLimit === 10 ? "selected" : ""}>10</option>
          <option value="25"  ${currentLimit === 25 ? "selected" : ""}>25</option>
          <option value="50"  ${currentLimit === 50 ? "selected" : ""}>50</option>
          <option value="100" ${currentLimit === 100 ? "selected" : ""}>100</option>
        </select>
      </div>
    `;
  }

  return html;
}
