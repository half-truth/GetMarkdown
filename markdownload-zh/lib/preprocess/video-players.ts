/**
 * Generic video player filtering
 *
 * Migrated as-is from extractor.unlisted.ts removeVideoPlayers()
 */

/**
 * Video player selectors (generic)
 */
const VIDEO_PLAYER_SELECTORS = [
  'video',
  '[class*="video-player"]',
  '[class*="player-container"]',
  '[class*="txp_"]',
  '[class*="vcp_"]',
  '[class*="plyr"]',
  '[class*="jw-"]',
  '[class*="flowplayer"]',
];

const POSTER_SELECTOR = 'img[class*="poster"], img[class*="cover"], img[class*="thumbnail"]';

/**
 * Generic video player filtering: remove player UI, preserve the poster image
 */
export function removeVideoPlayers(doc: Document): void {
  doc.querySelectorAll(VIDEO_PLAYER_SELECTORS.join(', ')).forEach((el) => {
    const poster = el.querySelector(POSTER_SELECTOR);
    if (poster && el.parentElement) {
      const clonedPoster = poster.cloneNode(true) as HTMLImageElement;
      clonedPoster.alt ||= '[Video Poster]';
      el.parentElement.insertBefore(clonedPoster, el);
    }
    el.remove();
  });
}
