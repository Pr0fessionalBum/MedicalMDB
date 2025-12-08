// Build pagination-friendly querystring
export function paginationQuery(req, page) {
  const params = { ...req.query };
  params.page = page;

  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
}
