import type { TimelineEntry } from './engine/engine';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';
export function makeTimeline(_: Lyrics, au: AudioData): TimelineEntry[] {
  return [{ id: 'trailer', load: () => import('./scenes/trailer'), start: 0, end: au.duration }];
}
