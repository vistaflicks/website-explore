const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

const buildApiUrl = (path, query = {}) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, API_BASE_URL);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

export { API_BASE_URL, buildApiUrl };
