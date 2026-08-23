# PIXEL FORGE ARENA

Mobile-first browser drawing battle game inspired by the general idea of drawing monsters and having their appearance determine battle ability.

## Original implementation
- No OpenAI/ChatGPT/LLM/image-generation API is used.
- 24x24 pixel analyzer extracts density, perimeter, symmetry, components, spikes, centroid and palette features.
- Procedural enemy generator creates all enemy sprites from deterministic seeds.
- Local tactical engine chooses attack / skill / guard based on current battle state.
- Peer-to-peer online matches use WebRTC via PeerJS public signaling.
- Rating and monster collection persist in localStorage.
- PWA-ready and touch-first.

This project uses original code and original procedural assets and is not affiliated with MONO ENTERTAINMENT or the Steam title AI Pixel Battle.
