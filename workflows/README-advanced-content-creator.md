# Advanced Content Creator Agent (16:9 / 9:16 / 1:1 / 21:9)

Slideshow video workflow: **Google Sheets** → **LLM (7-scene story)** → **ElevenLabs voiceover** → **Midjourney (piapi.ai)** → **Creatomate** longform/shorts/square. Optional Slack for image approval and notifications.

**Video:** [YouTube walkthrough](https://youtu.be/P-k-W0i0pAM)

## What this workflow does

- **Pick final video format:** 16:9 (longform), 9:16 (shorts), 1:1 (square), or 21:9
- **Confirm or regenerate images** per scene via Slack
- **Voiceover** (ElevenLabs) and **randomized music** from a sheet
- **Style for images:** cinematic, black & white, Pixar, sketch, etc.
- **Character or general story** via sheet columns
- **Creatomate** assembles 7 images + voiceover + music; voiceover drives timing so video length matches audio.

## Workflow file

| File | Description |
|------|-------------|
| `advanced-content-creator-agent.json` | Full n8n workflow (sanitized: no credential IDs; API keys via env or placeholders). |

## What you need

1. **Google Sheets** – Make a **copy** of the template in your own Google account (see structure below).
2. **Triggers:** Webhook (or swap for Schedule/Manual). Slack for “Choose your image” and notifications.
3. **APIs:** OpenAI (story + cleanup), ElevenLabs (voiceover), piapi.ai (Midjourney), Creatomate (render). Google Drive for voiceover upload.

---

## Google Sheets – make a copy

Use **one** spreadsheet with multiple sheets (tabs). Suggested tabs and columns:

### Sheet: `ideas_captions` (or `gid=0`)

| Column | Purpose |
|--------|--------|
| `id` | Consecutive ID |
| `idea` | Main idea for the video |
| `caption` | First part of the story (developed over 7 sections) |
| `channel_style_prompt` | Channel style (e.g. sci‑fi mystery, horror) |
| `character_style_prompt` | Main character for this story |
| `image_processing` | Image look (e.g. 35mm film-like, grain, cooler shadows, warmer mid/highlights) |
| `production_status` | `ready` = row is picked for production; `done` = finished |
| `final_output` | Final video URL (filled by workflow) |

### Sheet: `video_specs`

| Column | Purpose |
|--------|--------|
| `status` | `on` = use this row’s ratio |
| `ratio` | `16:9`, `9:16`, `1:1`, or `21:9` (for Midjourney aspect + Creatomate branch) |

### Sheet: `images_and_prompts`

Used by the workflow for image counter, temporary image URLs, selected image link, and status (`counter` / `current` / `done` / `ready`). Columns include: `id`, `status`, `counter`, `link`, `tmp_image1`–`tmp_image4`, etc.

### Sheet: `music`

| Column | Purpose |
|--------|--------|
| `status` | `on` = include in pool |
| `music1` … `music8` | URLs to music files (workflow picks one at random) |

---

## ChatGPT prompt (idea generation)

Use this (or similar) in ChatGPT to get ideas, then paste the table into `ideas_captions`:

```
Give me 5 ideas for Sci-Fi mystery videos. They can be anything from time travel,
multiple realities, aliens visiting earth, mysterious disappearances and appearances,
all kinds of impossible situations, multiple personalities that people access only
in their sleep, etc. Deliver the output in form of a table with the following columns:
id - consecutive numbers
idea - main idea for the video
caption - the first part of the story that will be developed over 7 sections/parts
channel_style_prompt - description of my YouTube channel overarching style
  (sci-fi mystery veering into horror)
character_style_prompt - main character for this video/story
image_processing - 35mm film-like, characteristic grain with cinematic processing,
  cooler tones in the shadows and warmer tones in mid tones and highlights
```

---

## LLM user message (story input)

In the **STORY CREATION** node, the user message is:

- **Main Story idea:** `{{ $json.idea }}`
- **Story guidance:** `{{ $json.caption }}`

(Your workflow may use `idea` / `caption` from the “GET IDEAS” sheet row.)

---

## LLM system / prompt (7-scene JSON)

**ROLE:**  
You are an expert prompt engineer and visual storyteller. Your task is to create sequential voiceover and image prompts for a flowing video, structured around a **7-scene narrative arc**: opening (1–2 scenes), development (2–4), climax, resolution, closing.

**TASK:**  
Return a valid **JSON array** of exactly **7 objects**. Each object:

```json
{
  "voiceText": "A 3-sentence voiceover, each sentence 11–15 words. Connects with previous scene, maintains flow, narrative tone and style.",
  "image_prompt": "Cinematic, visually rich description (max 950 chars). Avoid complex punctuation. Environment, lighting, mood, subject, composition, foreground, background. MidJourney-friendly. Nouns, visual metaphors, natural language. No lists, colons, semicolons, excessive commas. No abstract concepts. Include: {{ $json.image_processing }}."
}
```

**voiceText:**  
- Style/topic: `{{ $json.channel_style_prompt }}`  
- Use metaphors or analogies; emotionally compelling; no reuse of phrases/imagery from earlier scenes.

**image_prompt:**  
- Avoid complex grammar, repeated adjective stacking, newlines, bullets, numbers.  
- Think: “how would you describe this to a blind painter in plain, vivid English?”  
- Character (if needed): `{{ $json.character_style_prompt }}`

**CRITICAL:**  
- All 7 scenes = one connected, emotionally resonant narrative.  
- Output **only** a JSON array with double-quoted keys and string values. No headers or commentary.

---

## Structured output parser (example)

The **Structured Output Parser** expects an array of 7 objects with `voiceText` and `image_prompt`. Example:

```json
[
  { "voiceText": "You're standing at the edge...", "image_prompt": "A lone figure on a rainy, dimly lit street corner..." },
  { "voiceText": "The world around may seem dark...", "image_prompt": "A dimly lit room, shadows playing across walls..." },
  ...
]
```

---

## Code nodes (reference)

### EXTRACT VOICEOVER

```javascript
const voice_texts = items.flatMap(item =>
  item.json.output.map(p => p.voiceText).filter(Boolean)
);
return [{
  json: {
    voice_text1: voice_texts[0] || null,
    voice_text2: voice_texts[1] || null,
    voice_text3: voice_texts[2] || null,
    voice_text4: voice_texts[3] || null,
    voice_text5: voice_texts[4] || null,
    voice_text6: voice_texts[5] || null,
    voice_text7: voice_texts[6] || null,
  }
}];
```

### COMBINE VOICEOVER

```javascript
const input = items[0].json;
const parts = [
  input.voice_text1, input.voice_text2, input.voice_text3,
  input.voice_text4, input.voice_text5, input.voice_text6, input.voice_text7
];
const combinedVoiceover = parts.join('\n\n');
return [{ json: { voiceover_script: combinedVoiceover } }];
```

### VOICEOVER TEXT CLEANUP (LLM prompt)

Clean up the text:

1. Remove: `$ ; " & % # ' : -`
2. Commas and periods only → leave as is.
3. Currency symbols → three-letter codes (USD, EUR, JPY).
4. Rephrase naturally if removing symbols hurts grammar.
5. No quotation marks around titles/names; reword instead.
6. One paragraph only (remove paragraph breaks).
7. Optimize for DALL·E 3 / image generation if applicable.

Input: `{{ $json.voiceover_script }}`

### GET DRCT FILE LINK (direct voiceover URL)

```javascript
function appendFilenameToUrl(directUrl, filename) {
  return `${directUrl}&fileName=${encodeURIComponent(filename)}`;
}
const VoiceoverUrl = $input.first().json.webContentLink;
const filename = $input.first().json.name;
const directVoiceoverUrl = appendFilenameToUrl(VoiceoverUrl, filename);
return [{ json: { directVoiceoverUrl } }];
```

### PICK RANDOM MUSIC

```javascript
const row = items[0].json;
const musicLinks = [
  row.music1, row.music2, row.music3, row.music4,
  row.music5, row.music6, row.music7, row.music8
].filter(link => !!link);
const selectedMusic = musicLinks[Math.floor(Math.random() * musicLinks.length)] || null;
return [{ json: { music: selectedMusic } }];
```

### EXTRACT IMG PROMPTS

```javascript
const prompts = items[0].json.output;
const image_prompts = prompts.map(p => p.image_prompt);
return [{
  json: {
    image_prompt1: image_prompts[0] || null,
    image_prompt2: image_prompts[1] || null,
    image_prompt3: image_prompts[2] || null,
    image_prompt4: image_prompts[3] || null,
    image_prompt5: image_prompts[4] || null,
    image_prompt6: image_prompts[5] || null,
    image_prompt7: image_prompts[6] || null,
  }
}];
```

### SELECT IMG PROMPT

```javascript
const counter = $node["READ COUNTER"].json.counter;
const key = `image_prompt${counter}`;
const prompt = $node["EXTRACT IMG PROMPTS"].json[key];
if (!prompt) throw new Error(`Prompt not found for key: ${key}`);
return [{ json: { image_prompt: prompt } }];
```

### GET RESPONSE (Slack selection)

```javascript
const input = $input.item.json.data.yourselection || "Image 1";
const match = input.match(/\d+/);
const selection = match ? parseInt(match[0]) : 1;
return [{ json: { selection } }];
```

### SAVE SELECTED IMAGE

```javascript
const selection = $node["GET RESPONSE"].json["selection"];
const row = $node["WRT TMP IMG LINKS"].json;
if (!selection || !row) throw new Error("Missing selection or row data.");
const columns = ["tmp_image1", "tmp_image2", "tmp_image3", "tmp_image4"];
const selectedImage1 = row[columns[selection - 1]];
return [{ json: { selectedImage1 } }];
```

### EXTRACT ALL IMG LINKS

```javascript
const links = items.map(item => item.json.link);
return [{
  json: {
    link1: links[0] || null, link2: links[1] || null, link3: links[2] || null,
    link4: links[3] || null, link5: links[4] || null, link6: links[5] || null,
    link7: links[6] || null,
  }
}];
```

### GET DRCT LINKS TO ALL FILES (for Creatomate)

```javascript
return items.map(item => {
  const data = item.json;
  return {
    image1: data.link1, image2: data.link2, image3: data.link3, image4: data.link4,
    image5: data.link5, image6: data.link6, image7: data.link7,
    music: data.music,
    voiceover: data.directVoiceoverUrl
  };
});
```

---

## API endpoints (HTTP nodes)

### CREATE VOICEOVER (ElevenLabs)

- **URL:** `https://api.elevenlabs.io/v1/text-to-speech/<VOICE_ID>`
- **Header:** `xi-api-key`: `{{ $env.ELEVENLABS_API_KEY || 'YOUR_ELEVENLABS_API_KEY' }}`
- **Body (JSON):**
  - `text`: `{{ $json.message.content }}` (cleaned voiceover)
  - `model_id`: `eleven_turbo_v2`
  - `voice_settings`: stability, speed, similarity_boost, etc.
  - `output_format`: `mp3`

### CREATE IMAGE (piapi.ai – Midjourney)

- **URL:** `https://api.piapi.ai/api/v1/task/`
- **Header:** `x-api-key`: `{{ $env.PIAPI_API_KEY || 'YOUR_PIAPI_API_KEY' }}`
- **Body (JSON):**
  - `model`: `midjourney`
  - `task_type`: `imagine`
  - `input.prompt`: `{{ $('SELECT IMG PROMPT').item.json.image_prompt }}`
  - `input.aspect_ratio`: `{{ $('GET IMG RATIO').item.json.ratio }}` (e.g. 16:9, 9:16, 1:1)
  - `input.process_mode`: `fast`, `skip_prompt_check`: true

### GET IMAGES (piapi.ai – poll result)

- **URL:** `https://api.piapi.ai/api/v1/task/{{ $json.data.task_id }}`
- **Header:** same `x-api-key`

### CREATE VIDEO (Creatomate)

- **URL:** `https://api.creatomate.com/v1/renders`
- **Header:** `Authorization`: `Bearer <CREATOMATE_API_KEY>`
- **Body (JSON):**
  - `template_id`: longform / shorts / square (see workflow Switch)
  - `modifications`: map element IDs to sources, e.g.  
    `Image-NBN.source`, `Image-8X6.source`, … `Image-BKP.source`,  
    `Voiceover-TVH.source`, `Voiceover-6TN.source` (silence fallback),  
    `Audio-RJ6.source` (music)

Silence fallback URL (no voiceover):  
`https://res.cloudinary.com/dcapfjw28/video/upload/v1746555516/silence_pmuqox.mp3`  
(or your own silent MP3).

---

## Creatomate template (summary)

- **Output:** MP4, e.g. 1280×720 (16:9).
- **Elements:** 7 images (Image-NBN, 8X6, D3F, 98D, 7T8, RCF, BKP), each ~14% duration with fade/scale animations; one voiceover (Voiceover-TVH), optional silence (Voiceover-6TN), subtitles (Subtitles-B7P from Voiceover-TVH), background music (Audio-RJ6) at 40% with fade out.
- **Modifications:** Set `*.source` for each image, voiceover, and music to your URLs. Template IDs in the workflow: longform, shorts (9:16), square (1:1).

---

## API keys and credentials (after import)

1. **OpenAI** – STORY CREATION (Chat Model), VOICEOVER TEXT CLEANUP.
2. **Google Sheets** – All sheet read/write nodes; use one OAuth2 account.
3. **Google Drive** – UPLOAD VOICEOVER (folder for voiceover MP3s).
4. **Slack** – Start notification, “Choose your image” (sendAndWait), final confirmation. Create app with OAuth2 and channels.
5. **ElevenLabs:** Set `ELEVENLABS_API_KEY` in n8n env, or replace `YOUR_ELEVENLABS_API_KEY` in the CREATE VOICEOVER node (header `xi-api-key`). Add voice ID in the URL path.
6. **piapi.ai:** Set `PIAPI_API_KEY` in n8n env, or replace `YOUR_PIAPI_API_KEY` in CREATE IMAGE and GET IMAGES (header `x-api-key`).
7. **Creatomate:** Set `CREATOMATE_API_KEY` in n8n env, or replace `YOUR_CREATOMATE_API_KEY` in CREATE LONGFORM, CREATE SHORTS, CREATE SQUARE (header `Authorization: Bearer <key>`).

---

## Import and run

1. In n8n: **Workflows** → **Import from File** → choose `advanced-content-creator-agent.json`.
2. Reconnect: **Google Sheets**, **Google Drive**, **Slack**, **OpenAI** (pick your credentials for each node).
3. Set **document ID** and **sheet names** to your copy of the spreadsheet (ideas_captions, video_specs, images_and_prompts, music).
4. Set **ElevenLabs** voice ID in the CREATE VOICEOVER URL; configure **Webhook** or replace with Manual/Schedule trigger if you prefer.
5. Run from Webhook (or your trigger); mark a row `production_status = ready` and set `video_specs.status = on` with desired `ratio`.

---

## Credits

Community workflow (DavidM / UltCCAgent). Adapted for reuse with env-based API keys and documentation.
