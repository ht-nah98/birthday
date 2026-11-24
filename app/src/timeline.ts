import type { TimelineEntry } from './engine/engine';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';
import { PLATES } from './scenes/v2/cues';
import { CHAPTERS } from './scenes/p2/cues';

// Trailer v2 (mặc định): mỗi plate một Scene trong scenes/v2/. Bản v1 cũ: ?v=1 (cần ảnh trong assets/web).
const plates: Record<string, () => Promise<any>> = import.meta.glob('./scenes/v2/p*.ts');
const chapters: Record<string, () => Promise<any>> = import.meta.glob('./scenes/p2/c*.ts');

export function makeTimeline(_: Lyrics, au: AudioData): TimelineEntry[] {
  // Phần 2 (?film=2): mỗi chương một Scene trong scenes/p2/, mốc ở scenes/p2/cues.ts
  if (new URLSearchParams(location.search).get('film') === '2')
    return CHAPTERS.map((c) => ({ id: c.id, load: chapters[`./scenes/p2/${c.id}.ts`]!, start: c.start, end: c.end }));
  if (new URLSearchParams(location.search).get('v') === '1')
    return [{ id: 'trailer', load: () => import('./scenes/trailer'), start: 0, end: au.duration }];
  // Chân dung ký tự + bộ đếm ngày (scenes/v2/portraits.ts) phủ lên plate. Tắt bằng ?glyph=0 (để so với v02).
  const glyph = new URLSearchParams(location.search).get('glyph') !== '0';
  return PLATES.map((p) => ({
    id: p.id, start: p.start, end: p.end,
    load: glyph
      ? async () => { const [m, o] = await Promise.all([plates[`./scenes/v2/${p.id}.ts`]!(), import('./scenes/v2/portraits')]); return { default: o.withPortraits(m.default) }; }
      : plates[`./scenes/v2/${p.id}.ts`]!,
  }));
}
