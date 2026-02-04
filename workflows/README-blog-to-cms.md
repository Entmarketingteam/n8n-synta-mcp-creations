# Blog to CMS (canonical → Webflow or WordPress)

One workflow structure for **blog automation**: read briefs from a source (e.g. Google Sheets), generate content (LLM), normalize to a **canonical blog shape**, then send to a CMS. The only part that changes per CMS is the last node (HTTP Request) and its URL/body mapping.

## Workflow file

| File | Purpose |
|------|--------|
| `blog-to-cms.json` | Trigger → Read Sheet → Generate (placeholder/LLM) → Normalize to canonical blog → **HTTP Request (CMS)**. |

## Canonical schema and adapters

See **[docs/CONTENT-CANONICAL-SCHEMAS.md](../docs/CONTENT-CANONICAL-SCHEMAS.md)** for:

- The **canonical blog post** fields (`title`, `slug`, `body_html`, `excerpt`, `featured_image_url`, `featured_image_alt`, `meta_title`, `meta_description`, `status`, etc.).
- **WordPress** adapter: `POST /wp/v2/posts`, field mapping, featured_media upload.
- **Webflow** adapter: CMS API collection items, field slugs, auth.

## Variants

- **For Webflow:** Use the HTTP Request node as in the JSON (or update URL to your collection and adjust `jsonBody` to your collection’s field slugs). Set `WEBFLOW_COLLECTION_ID` in n8n variables or use Header Auth with your Webflow API token.
- **For WordPress:** Replace the last node with an HTTP Request to `https://yoursite.com/wp-json/wp/v2/posts`; body: `title`, `content`, `slug`, `excerpt`, `status`; use Application Password or OAuth in the credential. Upload featured image via `/wp/v2/media` first if needed, then set `featured_media` to the attachment ID.

## After import

1. **Google Sheets:** Set document ID and sheet name in “Read blog briefs (Sheet)”. One row per post (columns: e.g. topic, status).
2. **Generate step:** Replace the placeholder Code node with an **OpenAI** (or AI) node that takes the sheet row and outputs the canonical fields (title, slug, body, excerpt, image URL, alt, meta, status). See CONTENT-CANONICAL-SCHEMAS for the exact field list.
3. **CMS adapter:** Configure the last node with your CMS base URL, auth (Header Auth or OAuth), and body mapping from canonical fields to the CMS API. Document your mapping in CONTENT-CANONICAL-SCHEMAS or in this README.

## Quick reference

- **Pattern:** Trigger → Source → LLM → Normalize to canonical blog → CMS adapter.
- **Schema:** [docs/CONTENT-CANONICAL-SCHEMAS.md](../docs/CONTENT-CANONICAL-SCHEMAS.md).
- **Swap destination:** Change only the last node and its mapping; the rest of the workflow stays the same.
