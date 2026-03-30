# Vista Reels Website API Endpoints

This document contains the curl commands for all APIs used in the Vista Reels React project.

## Base URL
All API endpoints use the base URL: `<backend_url>` (configured via `VITE_API_BASE_URL`)

## API Endpoints

### 1. Get Website Content (Categories and Banners)
```bash
curl -X GET "<backend_url>/api/v1/website/exploreSequencer/website-content?scope=local"
```
*Note: `scope` can be `local` or `global` based on user's location*

### 2. Get Content Distributors (Streaming Platforms)
```bash
curl -X GET "<backend_url>/api/v1/website/content/contentDistributors?page=-1&fields=name,ottAppMasterId&populate=ottAppMasterId:name,icon"
```

### 3. Get Genres
```bash
curl -X GET "<backend_url>/api/v1/website/content/genres?sortBy=name:asc&page=-1"
```

### 4. Get Age Ratings
```bash
curl -X GET "<backend_url>/api/v1/website/content/ageRatings?sortBy=name:asc&page=-1"
```

### 5. Get Content Types
```bash
curl -X GET "<backend_url>/api/v1/website/content/contentTypes?sortBy=name:asc&page=-1"
```

### 6. Get IMDb Ratings
```bash
curl -X GET "<backend_url>/api/v1/website/content/imdbRatings?sortBy=min:asc&page=-1"
```

### 7. Get Filtered Content (Poster Grid)
```bash
curl -X GET "<backend_url>/api/v1/website/content?page=1&limit=20&fields=title,posterPath,backdropPath,releaseDate,runtime,overview,genres,cast,rating,type,status,imdbRating,avgUserRating,watchForFree,watchForFreeLinks,ottAvailability,imdbLink,seasonCount&populate=genres:name;type:name;imdbRating:name;rating:name,shortName;cast-id:name,profilePath,avatar;ottAvailability-id:name"
```

**Optional Query Parameters for Filtering:**
- `contentType`: Content type ID (e.g., `1` for movies)
- `genre`: Comma-separated genre IDs (e.g., `action,drama`)
- `imdbMinRating`: Comma-separated minimum IMDb ratings (e.g., `7.0,8.0`)
- `releaseYear`: Comma-separated release years (e.g., `2020,2021`)
- `ageRating`: Comma-separated age rating IDs (e.g., `U,PG`)
- `ottAppMasterId`: Comma-separated OTT platform IDs (e.g., `netflix,prime`)

### 8. Get Reels for Content
```bash
curl -X GET "<backend_url>/api/v1/website/reels/website-reels?contentId=123&limit=15"
```
*Note: Replace `123` with the actual content ID*

### 9. Get User Location (External API)
```bash
curl -X GET "https://ipapi.co/json/"
```

## Notes
- All endpoints are GET requests
- No authentication headers are required
- The project uses JavaScript `fetch` API calls, converted to equivalent curl commands
- Pagination is supported with `page` and `limit` parameters
- Some endpoints support sorting with `sortBy` parameter