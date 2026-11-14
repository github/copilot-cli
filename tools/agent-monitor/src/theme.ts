export const COLOR_MODES = ['default', 'light', 'dim', 'high-contrast', 'colorblind'] as const;
export type ColorMode = typeof COLOR_MODES[number];

export interface Palette {
	fg: string;
	muted: string;
	border: string;
	faint: string;
	sel: string;
	selbar: string;
	tab: string;
	accent: string;
	accentEm: string;
	chip: string;
	onEm: string;
	success: string;
	attention: string;
	danger: string;
	done: string;
}

export type Tone = keyof Palette;

// Primer semantic tokens, matching the Copilot CLI color modes on dark and light terminals.
const DEFAULT: Palette = {
	fg: '#f0f6fc', muted: '#9198a1', border: '#3d444d', faint: '#262c36', sel: '#151b23', selbar: '#656c76',
	tab: '#212830', accent: '#4493f8', accentEm: '#1f6feb', chip: '#162945', onEm: '#ffffff',
	success: '#3fb950', attention: '#d29922', danger: '#f85149', done: '#ab7df8',
};

export const PALETTES: Record<ColorMode, Palette> = {
	default: DEFAULT,
	light: {
		fg: '#1f2328', muted: '#59636e', border: '#d1d9e0', faint: '#eaeef2', sel: '#f6f8fa', selbar: '#818b98',
		tab: '#eff2f5', accent: '#0969da', accentEm: '#0969da', chip: '#ddf4ff', onEm: '#ffffff',
		success: '#1a7f37', attention: '#9a6700', danger: '#d1242f', done: '#8250df',
	},
	dim: {
		fg: '#d1d7e0', muted: '#9198a1', border: '#3d444d', faint: '#2f3742', sel: '#262c36', selbar: '#656c76',
		tab: '#2a313c', accent: '#478be6', accentEm: '#316dca', chip: '#283c58', onEm: '#f0f6fc',
		success: '#57ab5a', attention: '#c69026', danger: '#e5534b', done: '#986ee2',
	},
	'high-contrast': {
		fg: '#ffffff', muted: '#b7bdc8', border: '#9ea7b3', faint: '#30363d', sel: '#1b2330', selbar: '#ffffff',
		tab: '#262c36', accent: '#74b9ff', accentEm: '#409eff', chip: '#11294a', onEm: '#010409',
		success: '#2bd853', attention: '#f0b72f', danger: '#ff6a69', done: '#b687f7',
	},
	colorblind: {...DEFAULT, success: '#58a6ff', danger: '#f0883e'},
};

export function isColorMode(value: string): value is ColorMode {
	return (COLOR_MODES as readonly string[]).includes(value);
}
