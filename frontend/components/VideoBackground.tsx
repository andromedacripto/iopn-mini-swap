"use client";

// Fullscreen looping background video, rendered behind all page content.
//
// Implementation notes:
// - Uses the Cloudinary embed player via <iframe> (not a native <video>
//   tag), since the asset is served through Cloudinary's player, not as
//   a direct, publicly-fetchable .mp4 URL.
// - `pointer-events-none` on the wrapper means clicks always pass through
//   to whatever is rendered on top (the swap UI) — the video is purely
//   decorative and never intercepts interaction.
// - `autoplay=true&muted=true&loop=true&controls=false` are passed as
//   query params understood by the Cloudinary player, so it behaves like
//   a silent looping background instead of a normal embedded video.
// - A dark overlay sits between the video and the content to keep text
//   readable regardless of what's playing underneath.
export function VideoBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <iframe
        src="https://player.cloudinary.com/embed/?cloud_name=dffq1itle&public_id=6436-191745480_adqp1j&autoplay=true&muted=true&loop=true&controls=false"
        title=""
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        frameBorder={0}
        className="h-full w-full scale-125 object-cover"
        style={{ border: "none" }}
      />
      {/* dark overlay so the swap card stays readable on top of the video */}
      <div className="absolute inset-0 bg-black/70" />
    </div>
  );
}