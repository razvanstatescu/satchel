# Tools: verified facts (live probes, 2026-10-22)

Everything here was checked against the live APIs on this machine, or against the official spec where marked
**(spec)**. Raw probe outputs are in `notes/probe/`. Keys come only from `tools/lib/env.mjs` and never appear
in any file. A scan of `notes/` and `tools/` found 0 key occurrences.

## 0. Model IDs to use

| Job | Model id | Why |
|---|---|---|
| Images: photoreal macro and product shots, fast iterations | `gpt-image-2.5-flare` | Photoreal leather grain, stitching and brass even at `low`; 8.5 s at 1024²; same price as sunburst |
| Images: precise edits and final hero frames | `gpt-image-2.5-sunburst` | OpenAI positions it for editing precision and premium work; slower (18.8 s for a low-quality 1024² edit) |
| Transparent cut-outs | either 2.5 model with `background: 'transparent'`, `output_format: 'png'` | Verified; see the alpha gotcha in §2 |
| Voiceover | `eleven_v4` (default in helper); fallbacks `eleven_v3` and `eleven_multilingual_v2` | All three verified with `/with-timestamps`. Pick by ear from the samples |
| SFX | `eleven_text_to_sound_v2` (`eleven_text_to_sound_v3` is in the spec, untested) | Verified |
| Music | `music_v1` with a `composition_plan` | Verified: plan plus compose, 15 s. `music_v2` and `music_v2_5` exist in the spec (they take a different plan schema), untested |
| STT and QA | `scribe_v1` plus `POST /v1/forced-alignment` | Both verified |

## 1. Remotion
A teammate installed `remotion` **4.0.537** in `marketing/video`. Per the coordinator, the version and skill audit
was skipped here.

## 2. OpenAI images (`https://api.openai.com/v1`)

- **`GET /v1/models` (live, 139 models).** Image-capable ids: `gpt-image-2.5-flare`,
  `gpt-image-2.5-flare-2026-09-08`, `gpt-image-2.5-sunburst`, `gpt-image-2.5-sunburst-2026-09-08`, `gpt-image-2`,
  `gpt-image-2-2026-04-21`, `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`, `chatgpt-image-latest`. Video models
  **`sora-2` and `sora-2-pro` are listed** for this key. They were not called, and the SDK changelog marks the
  Sora video APIs as deprecated (openai-node 7.5.0). dall-e-2 and dall-e-3 were retired on 2026-05-12.
- **"Image 2.5"** means the GPT Image 2.5 family released 2026-09-08 (openai-node 7.12.0): **flare** and
  **sunburst**. Third-party write-ups (gradually.ai, apidog, cometapi) report that both models take identical
  parameters and token rates. They describe flare as the default, with up to 50% lower latency than gpt-image-2, and
  sunburst as the slower model for precise premium edits, which can use more output tokens on complex edits.
- **Pricing.** Both models bill per token: $5/M text input, $8/M image input, $30/M image output (third-party
  sources quoting the official rates; the OpenAI pricing page itself was not fetched).
  - Measured: a low-quality 1024² generation used 58 input and 196 output tokens, about **$0.006**.
  - Measured: a low-quality 1024² edit with one 1024² reference used 1078 input and 196 output tokens, about **$0.014**.
  - Medium and high quality were not measured. Expect several times as many output tokens.
- **`POST /images/generations` (spec: openai-node `src/resources/images.ts`, verified live).**
  - Required: `model`, `prompt` (up to 32,000 characters).
  - `size`: `1024x1024 | 1536x1024 | 1024x1536 | auto`. On 2.x models any `WxH` also works if both sides are
    divisible by 16, the aspect ratio is between 1:3 and 3:1, and the size is at most **3840x2160**. Sizes above
    2560x1440 are experimental. For full-frame plates use **`1920x1088`** or `2560x1440`, then crop.
  - `quality`: `low | medium | high | xhigh | max | auto`. `xhigh` and `max` are 2.5 only.
  - `background`: `transparent | opaque | auto`. `transparent` needs png or webp output, and is only a preview on gpt-image-2.
  - `output_format`: `png | jpeg | webp`. `output_compression`: 0–100, for jpeg and webp.
  - `moderation`: `auto | low`. `n`: 1–10. `stream` plus `partial_images` (0–3) gives progressive previews.
  - `safety_identifier` replaces `user`. The response is always `b64_json`, plus `usage`, `size`, `quality`,
    `background` and `output_format`.
- **`POST /images/edits` (multipart, verified live).**
  - Inputs: `image` (one) or `image[]` (up to **16** references; png, webp or jpg, each under 50 MB), `prompt`, and
    an optional `mask` (PNG; alpha 0 marks where to edit; applies to the first image).
  - Takes the same size, quality, background, format and compression options as generations.
  - `input_fidelity` (`high | low`) applies **only to gpt-image-1 and 1.5**. Omit it for 2.x.
- **Gotchas.**
  1. The transparent PNG really is RGBA: 26.7% of pixels had alpha 0. However, the **subject's alpha was 251–253,
     not 255**. Before compositing, clamp it, for example with
     (verified: 72% of pixels become 255) `ffmpeg -i in.png -vf "format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(alpha(X,Y),240),255,alpha(X,Y))'" out.png`.
     Transparent pixels still hold blurred RGB background colour.
  2. An edit asking to "isolate the object" **re-rendered** the bag (new texture, tighter crop). If the object must
     be exact, generate it on a transparent background from the start, or use a mask.
  3. Latency was 8.5 s (flare, low, generation) and 18.8 s (sunburst, low, edit). Use timeouts of 300 s or more for high and max.

## 3. ElevenLabs (`https://api.elevenlabs.io`, header `xi-api-key`)

### Account (`GET /v1/user/subscription`)
- Tier **`payg`** (pay-as-you-go), status active.
- Before the probes: 6,505 of 33,257 used. After the probes: **6,703 of 33,257 used, so 26,554 remain**.
- All of my calls together cost about 198 credits; this figure may include other concurrent use of the account.
- `next_character_count_reset_unix` is 2026-10-22T11:11:31Z. What a "reset" means on payg is unclear, so don't
  count on a refill.
- `voice_limit` is 3; instant and professional voice cloning are not allowed. The response has no flag for music
  or SFX, but **both work on this tier (verified)**.

### Text to speech
- **Models (`GET /v1/models`).**

  | Model | Character cost multiplier | Max characters per request | Languages | Notes |
  |---|---|---|---|---|
  | `eleven_v4` | ×1 | 10k | 94 | "fastest and most emotive". No style or speaker_boost. Its settings are `stability`, `similarity_boost`, `speed` (`clone_strength` applies to PVCs only) |
  | `eleven_v4_turbo` | ×0.5 | | | |
  | `eleven_v3` | ×1 | 5k | 74 | Expressive; "requires more prompt engineering" |
  | `eleven_v3_conversational` | ×0.5 | | | |
  | `eleven_multilingual_v2` | ×1 | 10k | 29 | Supports style and speaker_boost |
  | `eleven_flash_v2_5`, `eleven_turbo_v2_5` | ×0.5 | 40k | | |
  | `eleven_flash_v2`, `eleven_turbo_v2` | ×0.5 | | English | |

- **Endpoint.** `POST /v1/text-to-speech/{voice_id}[/with-timestamps]?output_format=…`
  - Body: `text`, `model_id`, `voice_settings{stability, similarity_boost, style, use_speaker_boost, speed}`,
    `language_code` (not on multilingual_v2), `seed`, `previous_text`, `next_text`, `previous_request_ids`,
    `next_request_ids`, `apply_text_normalization` (`auto | on | off`), `pronunciation_dictionary_locators` (up to 3).
  - New **`audio_effects`** (spec): `environment_id` reverb, `pan`, `distance`, `background_noise_id`,
    `filter_preset_id`; the catalogue is at `GET /v1/audio-effects/catalog`.
- **Output formats.**
  - mp3 22.05–44.1 kHz at 32–192 kbps, opus_48000_32–192, pcm and wav at 8–48 kHz, ulaw, alaw.
  - **`mp3_44100_192` works on payg** (verified on SFX at about 200 kbps). The spec says pcm and wav at 44.1 kHz
    need Pro or above (not tested).
  - The helpers default to `mp3_44100_192` for TTS and SFX.
- **`/with-timestamps` works on `eleven_v4`, `eleven_v3` and `eleven_multilingual_v2` (all verified).**
  - Response: `{ audio_base64, alignment, normalized_alignment }`. Each alignment is
    `{ characters[], character_start_times_seconds[], character_end_times_seconds[] }`, one entry per character
    including spaces and punctuation.
  - To get word timings, group runs of non-whitespace characters. A word starts at the start time of its first
    character and ends at the end time of its last. `alignmentToWords()` in `eleven.mjs` does this, with an optional
    offset for concatenated clips.
  - **v4 timings are quantised to 40 ms; v3 and v2 are finer.**
  - TTS alignment put the first word at 0.00 s, while Scribe and forced alignment heard it at **0.10 s**. For
    caption sync, prefer forced alignment on the final audio.
- **Measured.** A 59-character line took 1.3–2.4 s. The `character-cost` response header read **13** for every
  model, which looks like payg billing units rather than characters.

### Voices (`GET /v2/voices`, 36 in the account; `GET /v1/shared-voices` searches the public library)

The shortlist uses account voices, so no slots are needed. Samples read *"This NFT is a wallet. Sell it, and the
wallet goes with it."*

| Voice | id | Labels | Why | Sample |
|---|---|---|---|---|
| Eric – Smooth, Trustworthy | `cjVigY5qzO86Huf0OWal` | male, middle-aged, American, classy | Smooth tenor; closest to an Apple-keynote VO | `probe/voice-eric.mp3` (v4), `voice-eric-v3.mp3`, `voice-eric-mv2.mp3` |
| Brian (professional) | `n8kTUi6dVrplENT9Un56` | male, middle-aged, American, confident, narrative | Warm narrator, 40 years of VO | `probe/voice-brian.mp3` (v4) |
| Sarah – Mature, Reassuring, Confident | `EXAVITQu4vr4xnSDxMaL` | female, young adult, American, professional | Confident and warm, modern | `probe/voice-sarah.mp3` (v4) |
| Lily – Velvety Actress | `pFZP5JQG7iQjIQuC4Bku` | female, middle-aged, British, confident | Premium velvety read | `probe/voice-lily.mp3` (v4) |
| George – Warm, Captivating Storyteller | `JBFqnCBsd6RMkjVDRZzb` | male, middle-aged, British, mature | Warm storyteller (no sample; cap) | — |
| Bella – Professional, Bright, Warm | `hpp4J3VqNfWAUOO0d1Us` | female, middle-aged, American | Polished explainer (no sample) | — |
| Daniel – Steady Broadcaster | `onwK4e9ZLuTAKqWW03F9` | male, middle-aged, British, formal | Authoritative fallback (no sample) | — |
| River – Relaxed, Neutral | `SAz9YHcvj6GT2YYXdXww` | neutral, American, calm | Gender-neutral option (no sample) | — |

The `voice-eric*.mp3` files compare v4, v3 and multilingual_v2 on one voice. Durations: 4.16 s, 3.52 s and 3.16 s.
v4 reads most slowly.

### Sound effects (`POST /v1/sound-generation?output_format=…`)
- Body: `text`, `duration_seconds` (0.5–30, or null to let the model decide), `prompt_influence` (0–1, default
  0.3), `loop` (bool), `model_id` (`eleven_text_to_sound_v2 | eleven_text_to_sound_v3`).
- Output formats are the same as TTS.
- Verified: "deep cinematic whoosh, fast pass-by, clean, no music" at 1.2 s returned exactly 1.200 s of 44.1 kHz
  stereo in 1.6 s, with `character-cost` 7 (`probe/sfx-whoosh.mp3`). A 1.5 s impact at mp3_44100_192 cost 8.

### Music (**available on payg, verified**)
- `POST /v1/music/plan` takes `{prompt, music_length_ms (3000–600000), model_id, source_composition_plan}` and
  returns a plan in 3.2 s (`probe/music-15s.plan.json`).
- The `music_v1` plan (`MusicPrompt`) has this shape:
  - `positive_global_styles[]` and `negative_global_styles[]` (up to 50 each).
  - `sections[]` (up to 30), each with `section_name`, `positive_local_styles[]`, `negative_local_styles[]`,
    `duration_ms` (3000–120000), `lines[]` (up to 30 lyric lines of at most 200 characters; **empty means
    instrumental**), and an optional `source_from` used for inpainting.
- `POST /v1/music?output_format=…` body:
  - `prompt` (up to 4100 characters) **or** `composition_plan`; never both.
  - `music_length_ms` and `force_instrumental` work with a prompt only.
  - `generation_mode` (`track | loop | ambience | video_to_music`) works with a prompt only.
  - `seed` works with a plan only.
  - `respect_sections_durations` (default true; music_v1 only, and always enforced on v2 and v2.5).
  - Also: `model_id` (`music_v1 | music_v2 | music_v2_5`), `lyrics_text`, `store_for_inpainting`, `sign_with_c2pa`, `finetune_id`.
- Formats: `auto` (mp3_44100_128 for v1, mp3_48000_192 for v2), mp3 up to **mp3_48000_320**, and pcm up to 48 kHz.
- Variants: `/v1/music/detailed` (multipart with metadata and word timestamps), `/v1/music/stream`,
  `/v1/music/video-to-music`, `/v1/music/stem-separation`.
- **Verified: a 15 s instrumental from a plan (Launch Pulse 7 s, System Ignition 8 s) came back as 15.05 s of 44.1
  kHz stereo in only 4.0 s** (`probe/music-15s.mp3`). No cost header is returned.

### Speech-to-text and forced alignment (both verified on `voice-eric.mp3`)
- **`POST /v1/speech-to-text`** (multipart).
  - Params: `model_id` (`scribe_v1`; `no_verbatim` needs scribe_v2), `file`, `language_code`,
    `timestamps_granularity` (`none | word | character`, default word), `tag_audio_events`, `diarize`,
    `num_speakers`, `keyterms[]` (bias terms such as "NFT" or "NEAR").
  - Returns `{ text, language_code, words:[{text,start,end,type:'word'|'spacing'|'audio_event',…}] }`.
  - Took 0.9 s. It dropped the comma ("Sell it and") but got every word, starting at 0.10 s.
- **`POST /v1/forced-alignment`** (multipart `file`, `text`) returns `{characters[], words[{text,start,end,loss}], loss}`.
  - Took 0.4 s, with loss 0.64.
  - **Its `words` include whitespace tokens**, so filter out `text.trim() === ''`.
  - Use it for caption timing against the exact script.

## 4. Local tooling
- Node v22.22.2, npm 10.9.7, **ffmpeg and ffprobe 8.0.1** (Homebrew; libmp3lame, x264, x265, opus, videotoolbox).
- ffmpeg has every filter we need: `loudnorm`, `ebur128`, `silencedetect`, `afade`, `acrossfade`, `amix`,
  `sidechaincompress`, `acompressor`, `alimiter`, `adelay`, `apad`, `atrim`, `aresample`, `highpass`, `lowpass`,
  `astats`, `showwavespic`.
- Tested:
  - **Two-pass loudnorm.** Pass 1 (`loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json`) gives `measured_*` values.
    Pass 2 (`…:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true`) measured
    **−16.0 LUFS, peak −1.5 dBFS** on ebur128.
  - `silencedetect=noise=-40dB:d=0.25` found the 1.74–2.10 s pause.
  - A VO-ducking mix (`sidechaincompress` + `amix normalize=0` + `afade`) rendered.
- **zsh gotcha:** in `"$VAR:linear"`, zsh treats `:l` as a lowercase modifier and breaks the filter string. Write `${VAR}:linear`.
- Python 3.14.3 (Homebrew): **numpy 2.5.3 is importable**; scipy and librosa are not installed. No venv was needed.
  If librosa or madmom is wanted later, create `marketing/.venv` (`python3 -m venv marketing/.venv`), never system-wide.

### Beat grid: `node tools/beats.mjs <audio> --bpm 120 --fps 30 [--beats-per-bar 4] --out beats.json`
- Uses Node and ffmpeg only.
- Method:
  1. Decode to mono 22.05 kHz.
  2. Compute a log spectral-flux onset envelope (FFT 1024, hop 256, about 11.6 ms).
  3. Estimate tempo by autocorrelation with a prior around `--bpm`.
  4. Track beats with Ellis 2007 dynamic programming, then snap each beat to its onset peak with sub-frame refinement.
  5. Fit a least-squares constant-tempo grid.
  6. Pick the downbeat phase from low-band (kick) flux.
- Output fields: `beats` (tracked), `gridBeats` and `bpmGrid`/`gridOffset` (clean grid), `downbeats`,
  `beatFrames`, `downbeatFrames` and `gridRmsMs`.
- **Validation:**
  - On a synthetic 120 BPM click track (first beat at 0.25 s): bpmGrid 120.013, offset 0.251 s, max error
    **2.5 ms**, mean 0.5 ms. A latency correction of one hop was calibrated on this track.
  - On `probe/music-15s.mp3`: **bpmGrid 120.024**, offset 0.037 s, rms jitter 6.7 ms, 31 beats, downbeats every
    2.0 s (`probe/music-15s.beats.json`).
- Recommendation: request a BPM in the music prompt or plan, run `beats.mjs`, and cut on `downbeatFrames`. Trust
  `gridBeats` when `gridRmsMs` is under about 15 ms; otherwise use the tracked `beats`.

## 5. Helpers (`tools/lib`, ESM, Node built-ins only)
- **`http.mjs`**
  - `request(url, {method, headers, json|body, timeoutMs, retries=5, baseDelayMs, maxDelayMs, retryOnTimeout, responseType, label, log})`
    returns `{status, data, buffer, headers (response), attempts, ms}`. Also exports `requestJson`,
    `requestBuffer`, `scrub` and `HttpError`.
  - Retries 408, 409, 425, 429, 5xx and Cloudflare 52x, with exponential backoff and jitter, honouring
    `Retry-After` and `retry-after-ms`.
  - Fails fast on quota 429s (`insufficient_quota` and similar).
  - A POST that times out is not retried unless you opt in. TTS, plan, STT and align opt in because they are cheap.
  - Never logs request headers; error bodies are scrubbed.
  - Tests: `node --test tools/tests/http.test.mjs` (3 pass). Pass the file, not the directory: Node 22's
    `--test dir/` fails.
- **`eleven.mjs`**
  - `subscription()`, `models()`, `listVoices({search, category})`, `sharedVoices(filters)`.
  - `tts(text, {voiceId, modelId, voiceSettings, withTimestamps, outputFormat, previousText, nextText, previousRequestIds, nextRequestIds, languageCode, seed})`
    returns `{audio, alignment?, normalizedAlignment?, words?, requestId, characterCost, ms}`.
  - `alignmentToWords(alignment, {offsetSeconds})`.
  - `sfx(prompt, {durationSeconds, promptInfluence, loop, modelId, outputFormat})` returns a Buffer (`.meta`).
  - `musicPlan(prompt, lengthMs)` returns the plan.
  - `music({prompt|compositionPlan, lengthMs, forceInstrumental, respectSectionsDurations, outputFormat, modelId, seed})` returns a Buffer.
  - `stt(path, {modelId, languageCode, keyterms, diarize})` and `align(path, text)`.
- **`openai-image.mjs`**
  - `generate({prompt, model, size, quality, background, outputFormat, outputCompression, moderation, n})` returns
    `Buffer[]` (with `.usage` and `.meta`).
  - `edit({images:[paths|Buffers], prompt, mask, inputFidelity, …same})` returns `Buffer[]`.
  - The default model is `gpt-image-2.5-flare`.
- **Examples** (each one produced the probe files above): `tools/examples/{tts,sfx,music,stt,image}.mjs`. For
  example: `node tools/examples/tts.mjs "Text" --voice cjVigY5qzO86Huf0OWal --timestamps --out vo.mp3`.

## 6. Spend log (within caps)
- 6 TTS calls (4 voice samples on v4, plus the v3 and multilingual_v2 timestamp tests), each 59 characters.
- 2 SFX, 1 music plan, 1 music generation (15 s), 1 STT, 1 forced alignment.
- 2 images, both low quality at 1024²: a flare generation and a sunburst transparent edit. Total about $0.02.
- No video calls.

## 7. Gotchas
- For long music, undici has a built-in 300 s header timeout. A 15 s track took 4 s, so a 2–3 minute track should
  be fine. If it isn't, use `/v1/music/stream`.
- Parallel sessions on the same keys can hit 429 `too_many_concurrent_requests`. `http.mjs` backs off and retries.
- Composition plans for `music_v2` and `music_v2_5` use a different schema (`CompositionPlan.chunks[]`); a
  `music_v1` plan sent to those models is an error.
- The payg `character-cost` header is not a character count: 13 for a 59-character line on every model.
- In `.gitignore`, `notes/probe/*.mp3` is ignored, but the PNG and JSON probe files are not.
