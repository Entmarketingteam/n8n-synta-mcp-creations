# Content canonical schemas

Internal shapes for content automation so one workflow can target different CMSes by swapping only the **destination adapter**. Same idea as [ent-tools/shared/contracts/CONTRACTS.md](../ent-tools/shared/contracts/CONTRACTS.md) for document pipelines.

## Blog post (canonical)

Use this shape between “Generate” (e.g. LLM) and “Destination” (WordPress, Webflow, etc.). Each CMS adapter maps from this shape to the CMS API.

| Field | Type | Purpose |
|-------|------|--------|
| `title` | string | Post title |
| `slug` | string | URL slug |
| `body_html` or `body_markdown` | string | Main content (adapter may convert) |
| `excerpt` | string | Short summary |
| `featured_image_url` | string | Main image URL |
| `featured_image_alt` | string | Alt text for featured image |
| `headings` | array of `{ level, text }` or string[] | Optional; for TOC or structure |
| `meta_title` | string | SEO title |
| `meta_description` | string | SEO description |
| `status` | string | e.g. `draft`, `published` |
| `published_at` | string (ISO date) | Optional |

Workflow pattern: **Trigger → Source (e.g. Sheet) → LLM → Normalize to this shape → CMS adapter**.

---

## Destination adapters

### WordPress

- **API:** REST API `POST /wp/v2/posts` (and optionally media upload for featured image).
- **Mapping:**
  - `title` → `title` (object with `rendered` if needed; API often accepts `title` string).
  - `body_html` → `content` (raw HTML).
  - `slug` → `slug`.
  - `excerpt` → `excerpt`.
  - `meta_title` / `meta_description` → Yoast or other meta plugin fields (often under `meta` or a separate meta endpoint).
  - `featured_image_url` → upload via `POST /wp/v2/media`, then set `featured_media` to the returned attachment ID.
  - `status` → `status` (draft, publish, etc.).
- **Auth:** Application password or OAuth; send in `Authorization` header. Store in n8n credential.

### Webflow

- **API:** Webflow CMS API — create collection item (e.g. `POST https://api.webflow.com/v2/collections/{collection_id}/items`). Image may be URL (if collection field accepts URL) or upload via Assets API.
- **Mapping (typical collection field names; adjust to your collection):**
  - `title` → `name` (or your title field slug).
  - `slug` → `slug`.
  - `body_html` → `post-body` or the slug of your rich text / HTML field.
  - `excerpt` → `excerpt` or description field.
  - `featured_image_url` → featured image field (URL); if Webflow expects an asset ID, use Assets API first and pass the asset ID.
  - `featured_image_alt` → alt text field if present.
  - `meta_title` / `meta_description` → SEO fields if your collection has them (e.g. `seo-title`, `seo-description`).
  - `status` → `archived` boolean or state field if available (Webflow CMS items are typically “published” when the site is published; check Webflow docs for draft/archived).
- **Auth:** Bearer token (API token from Webflow account). Store in n8n credential. Required header: `Authorization: Bearer <token>`, `Content-Type: application/json`.
- **Note:** Collection and field slugs are site-specific; document your collection’s field slugs and required fields. Image upload may require a separate Assets API call and then reference the asset ID in the item payload.

---

## Workflow and README

- **Workflow:** [workflows/blog-to-cms.json](../workflows/blog-to-cms.json) — Trigger → Source → Normalize to canonical blog → **HTTP Request (CMS)**. Swap the last node (and its URL/body mapping) for WordPress vs Webflow; see [workflows/README-blog-to-cms.md](../workflows/README-blog-to-cms.md).
- For “WordPress blog automation but for Webflow”: use the same pattern and this schema; only the CMS adapter (last node + mapping) changes.
