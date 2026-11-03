import stringWidth from 'string-width';
import {stripVTControlCharacters} from 'node:util';
import type {Tone} from './theme.js';

export interface Style {
	fg?: Tone;
	bg?: Tone;
	bold?: boolean;
	dim?: boolean;
}

export type Part = readonly [string, Style];

export interface Segment {
	text: string;
	fg?: Tone;
	bg?: Tone;
	bold: boolean;
	dim: boolean;
}

interface Cell {
	ch: string;
	fg?: Tone;
	bg?: Tone;
	bold: boolean;
	dim: boolean;
}

const graphemes = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const JUNCTIONS: Record<string, string> = {
	'1100': '│', '0011': '─', '0101': '┌', '0110': '┐', '1001': '└', '1010': '┘', '1101': '├', '1110': '┤',
	'0111': '┬', '1011': '┴', '1111': '┼', '0100': '╷', '1000': '╵', '0001': '╶', '0010': '╴',
};

export const width = (text: string): number => stringWidth(text);

/** Removes terminal control sequences so recorded text cannot move the cursor or restyle the screen. */
export function clean(text: string): string {
	return stripVTControlCharacters(text).replace(/\t/g, '  ').replace(CONTROL, '');
}

export function fit(text: string, max: number): string {
	if (max <= 0) return '';
	if (stringWidth(text) <= max) return text;
	let out = '';
	let used = 0;
	for (const {segment} of graphemes.segment(text)) {
		const w = stringWidth(segment);
		if (used + w > max - 1) break;
		out += segment;
		used += w;
	}
	return out + '…';
}

function split(word: string, max: number): string[] {
	const pieces: string[] = [];
	let cur = '';
	for (const {segment} of graphemes.segment(word)) {
		if (stringWidth(cur + segment) > max) {
			pieces.push(cur);
			cur = '';
		}
		cur += segment;
	}
	if (cur) pieces.push(cur);
	return pieces;
}

/** Word-wraps recorded text to display columns, keeping paragraph breaks and splitting over-long tokens. */
export function wrap(text: string, max: number): string[] {
	const lines: string[] = [];
	for (const paragraph of clean(text).split(/\r?\n/)) {
		const words = paragraph.split(' ').filter(Boolean);
		if (!words.length) {
			if (lines.length && lines.at(-1) !== '') lines.push('');
			continue;
		}
		let cur = '';
		for (const word of words) {
			const candidate = cur ? `${cur} ${word}` : word;
			if (stringWidth(candidate) <= max) {
				cur = candidate;
				continue;
			}
			if (cur) lines.push(cur);
			const pieces = stringWidth(word) > max ? split(word, max) : [word];
			lines.push(...pieces.slice(0, -1));
			cur = pieces.at(-1) ?? '';
		}
		if (cur) lines.push(cur);
	}
	while (lines.at(-1) === '') lines.pop();
	return lines;
}

export function junction(up: boolean, down: boolean, left: boolean, right: boolean): string {
	return JUNCTIONS[`${+up}${+down}${+left}${+right}`] ?? ' ';
}

/** Fixed-size grid of styled terminal cells; every write is clipped to the grid. */
export class Screen {
	private readonly cells: Cell[][];

	constructor(readonly cols: number, readonly rows: number) {
		this.cells = Array.from({length: rows}, () => Array.from({length: cols}, () => ({ch: ' ', bold: false, dim: false})));
	}

	charAt(x: number, y: number): string {
		return this.cells[y]?.[x]?.ch ?? '';
	}

	put(x: number, y: number, text: string, style: Style = {}): number {
		const row = this.cells[y];
		for (const {segment} of graphemes.segment(text)) {
			const w = stringWidth(segment);
			if (w === 0) continue;
			if (row && x >= 0 && x < this.cols) {
				// Never leave half of an existing wide character behind.
				if (row[x]!.ch === '' && x > 0) row[x - 1]!.ch = ' ';
				if (x + w <= this.cols) {
					const after = row[x + w];
					if (after && after.ch === '') after.ch = ' ';
					row[x] = {ch: segment, fg: style.fg, bg: style.bg ?? row[x]!.bg, bold: Boolean(style.bold), dim: Boolean(style.dim)};
					for (let i = 1; i < w; i++) row[x + i] = {ch: '', fg: style.fg, bg: style.bg ?? row[x + i]!.bg, bold: false, dim: false};
				} else row[x] = {...row[x]!, ch: ' '};
			}
			x += w;
		}
		return x;
	}

	rput(right: number, y: number, text: string, style: Style = {}): number {
		return this.put(right - stringWidth(text) + 1, y, text, style);
	}

	seq(x: number, y: number, parts: readonly Part[]): number {
		for (const [text, style] of parts) x = this.put(x, y, text, style);
		return x;
	}

	/** Writes parts left to right within `max` columns, ending with an ellipsis when truncated. */
	seqFit(x: number, y: number, parts: readonly Part[], max: number, extra: Style = {}): number {
		let used = 0;
		for (const [text, style] of parts) {
			const room = max - used;
			if (room <= 0) break;
			const shown = stringWidth(text) > room ? fit(text, room) : text;
			this.put(x + used, y, shown, {...style, ...extra});
			used += stringWidth(shown);
		}
		return x + used;
	}

	fill(x: number, y: number, w: number, h: number, bg: Tone): void {
		for (let j = y; j < y + h; j++) {
			for (let i = x; i < x + w; i++) {
				const cell = this.cells[j]?.[i];
				if (cell) cell.bg = bg;
			}
		}
	}

	hline(x: number, y: number, w: number, ch: string, style: Style = {}): void {
		if (w > 0) this.put(x, y, ch.repeat(w), style);
	}

	vline(x: number, y: number, h: number, ch: string, style: Style = {}): void {
		for (let j = 0; j < h; j++) this.put(x, y + j, ch, style);
	}

	box(x: number, y: number, w: number, h: number, style: Style = {}): void {
		if (w < 2 || h < 2) return;
		this.put(x, y, `╭${'─'.repeat(w - 2)}╮`, style);
		for (let j = 1; j < h - 1; j++) {
			this.put(x, y + j, '│', style);
			this.put(x + w - 1, y + j, '│', style);
		}
		this.put(x, y + h - 1, `╰${'─'.repeat(w - 2)}╯`, style);
	}

	/** Copies another screen onto this one at the given offset. */
	blit(src: Screen, x: number, y: number): void {
		for (let j = 0; j < src.rows; j++) {
			const target = this.cells[y + j];
			if (!target) continue;
			for (let i = 0; i < src.cols; i++) {
				if (x + i >= 0 && x + i < this.cols) target[x + i] = {...src.cells[j]![i]!};
			}
		}
	}

	segments(): Segment[][] {
		return this.cells.map(row => {
			const out: Segment[] = [];
			for (const cell of row) {
				const last = out.at(-1);
				if (last && last.fg === cell.fg && last.bg === cell.bg && last.bold === cell.bold && last.dim === cell.dim) last.text += cell.ch;
				else out.push({text: cell.ch, fg: cell.fg, bg: cell.bg, bold: cell.bold, dim: cell.dim});
			}
			return out;
		});
	}

	text(): string {
		return this.cells.map(row => row.map(cell => cell.ch).join('').trimEnd()).join('\n');
	}
}
