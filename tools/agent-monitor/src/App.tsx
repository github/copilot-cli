import {useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, useApp, useInput, useWindowSize} from 'ink';
import {drawChrome, drawInspector, frameLayout, promptRef, resultRef} from './chrome.js';
import type {DetailTexts, Frame, ViewState} from './chrome.js';
import {errorMessage, JsonlReader} from './events.js';
import type {ContentRef} from './events.js';
import {drawGraph} from './graph.js';
import {AgentModel} from './model.js';
import type {Filter} from './model.js';
import {Screen} from './screen.js';
import {PALETTES} from './theme.js';
import type {ColorMode} from './theme.js';
import {drawTimeline} from './timeline.js';
import {buildTree, MAIN, nowSeconds, visualOf} from './tree.js';

export const MIN_COLS = 80;
export const MIN_ROWS = 24;
const NEXT_FILTER: Record<Filter, Filter> = {all: 'active', active: 'finished', finished: 'all'};

interface AppProps {
	model: AgentModel;
	revision?: number;
	loadContent: (ref: ContentRef) => Promise<string>;
	source?: Frame['source'];
	diagnostic?: string;
	mode?: ColorMode;
	width?: number;
	height?: number;
	clock?: () => number;
}

export function App({model, loadContent, source = 'following', diagnostic, mode = 'default', width, height, clock = Date.now}: AppProps) {
	const size = useWindowSize();
	const {exit} = useApp();
	const cols = width ?? size.columns;
	const rows = height ?? size.rows;
	const state = useRef<ViewState>({
		view: 'graph', filter: 'all', selectedId: MAIN, showTools: false, zoom: 1, pan: 0, detailScroll: 0, graphX: 0, graphY: 0, laneTop: 0, span: 0,
	}).current;
	const [, setTick] = useState(0);
	const [spin, setSpin] = useState(0);
	const rerender = (): void => setTick(tick => tick + 1);
	const tree = buildTree(model, state.filter);
	if (!tree.byId.has(state.selectedId)) state.selectedId = (tree.order.find(node => !node.ctx) ?? tree.root).id;
	const node = tree.byId.get(state.selectedId)!;
	const result = resultRef(model, node);
	const prompt = promptRef(model, node);
	const textKey = `${node.id}|${result?.eventId ?? ''}|${prompt?.eventId ?? ''}`;
	const [loaded, setLoaded] = useState<{key: string; texts: DetailTexts}>({key: '', texts: {pending: false}});

	useEffect(() => {
		let cancelled = false;
		void Promise.allSettled([result ? loadContent(result) : undefined, prompt ? loadContent(prompt) : undefined]).then(([r, p]) => {
			if (cancelled) return;
			setLoaded({
				key: textKey,
				texts: {
					pending: false,
					result: r.status === 'fulfilled' ? r.value : undefined,
					error: r.status === 'rejected' ? errorMessage(r.reason) : undefined,
					prompt: p.status === 'fulfilled' ? p.value : undefined,
				},
			});
		});
		return () => { cancelled = true; };
	}, [textKey, loadContent]);

	const animating = tree.order.some(n => visualOf(model, n) === 'running');
	useEffect(() => {
		if (!animating) return;
		const timer = setInterval(() => setSpin(value => value + 1), 250);
		return () => clearInterval(timer);
	}, [animating]);
	useEffect(() => {
		if (source !== 'following') return;
		const timer = setInterval(rerender, 1000);
		return () => clearInterval(timer);
	}, [source]);

	const now = nowSeconds(model, clock());
	useInput((input, key) => {
		const order = tree.order;
		const index = order.findIndex(n => n.id === state.selectedId);
		const select = (target: number): void => {
			state.selectedId = order[clamp(target, 0, order.length - 1)]!.id;
			state.detailScroll = 0;
		};
		const siblings = node.parent?.children ?? [node];
		const sibling = siblings.indexOf(node);
		const pageStep = Math.max(1, frameLayout(cols, rows).box.h - 6);
		const panStep = Math.max(1, (state.span || now) / 4);
		if (input === 'q' || key.escape) {
			exit();
			return;
		}
		if (key.tab) state.view = state.view === 'graph' ? 'timeline' : 'graph';
		else if (input === 'j' || key.downArrow) select(index + 1);
		else if (input === 'k' || key.upArrow) select(index - 1);
		else if (input === 'g' || key.home) select(0);
		else if (input === 'G' || key.end) select(order.length - 1);
		else if (input === 'f') {
			state.filter = NEXT_FILTER[state.filter];
			state.laneTop = 0;
		} else if (input === 't') state.showTools = !state.showTools;
		else if (key.pageDown) state.detailScroll += pageStep;
		else if (key.pageUp) state.detailScroll = Math.max(0, state.detailScroll - pageStep);
		else if (state.view === 'timeline' && (input === '+' || input === '=')) state.zoom = Math.min(64, state.zoom * 2);
		else if (state.view === 'timeline' && input === '-') {
			state.zoom = Math.max(1 / 64, state.zoom / 2);
			if (state.zoom === 1) state.pan = 0;
		} else if (state.view === 'timeline' && (key.leftArrow || input === 'h')) state.pan += panStep;
		else if (state.view === 'timeline' && (key.rightArrow || input === 'l')) state.pan -= panStep;
		else if (state.view === 'graph' && (key.leftArrow || input === 'h') && sibling > 0) state.selectedId = siblings[sibling - 1]!.id;
		else if (state.view === 'graph' && (key.rightArrow || input === 'l') && sibling < siblings.length - 1) state.selectedId = siblings[sibling + 1]!.id;
		else return;
		rerender();
	});

	if (cols < MIN_COLS || rows < MIN_ROWS) {
		return <Text>{`Terminal too small for the agent monitor (need ${MIN_COLS}x${MIN_ROWS}, have ${cols}x${rows}). q: quit`}</Text>;
	}
	const texts: DetailTexts = loaded.key === textKey ? loaded.texts : {pending: Boolean(result || prompt)};
	const warnings = [...model.warnings].join('; ');
	const frame: Frame = {
		model, state, tree, now, spin, cols, rows, source, texts,
		diagnostic: diagnostic ?? (warnings || undefined),
	};
	const layout = frameLayout(cols, rows);
	const screen = new Screen(cols, rows);
	drawChrome(screen, frame, layout);
	if (state.view === 'graph') drawGraph(screen, frame, layout.content, layout.legendY);
	else drawTimeline(screen, frame, layout.content, layout.legendY);
	drawInspector(screen, frame, layout.box);
	const palette = PALETTES[mode];
	return (
		<Box flexDirection="column" width={cols} height={rows}>
			{screen.segments().map((segments, y) => (
				<Text key={y} wrap="truncate-end">
					{segments.map((segment, i) => (
						<Text key={i} color={segment.fg ? palette[segment.fg] : undefined} backgroundColor={segment.bg ? palette[segment.bg] : undefined} bold={segment.bold} dimColor={segment.dim}>
							{segment.text}
						</Text>
					))}
				</Text>
			))}
		</Box>
	);
}

function clamp(value: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, value));
}

export function LiveApp({file, mode, onError}: {file: string; mode: ColorMode; onError: (message: string) => void}) {
	const reader = useMemo(() => new JsonlReader(file), [file]);
	const model = useMemo(() => new AgentModel(), [file]);
	const [revision, setRevision] = useState(0);
	const [diagnostic, setDiagnostic] = useState<string>();
	const [stopped, setStopped] = useState(false);
	const loadContent = useMemo(() => (ref: ContentRef) => reader.readContent(ref), [reader]);
	useEffect(() => {
		let active = true;
		let timer: ReturnType<typeof setTimeout>;
		const poll = async (): Promise<void> => {
			try {
				const changed = await reader.poll(record => model.apply(record), () => {
					model.reset();
					if (active) setDiagnostic('Session log was replaced/truncated; view rebuilt from the new source.');
				});
				if (!active) return;
				if (changed) setRevision(value => value + 1);
				timer = setTimeout(() => { void poll(); }, 400);
			} catch (error) {
				if (!active) return;
				const message = `Source stopped: ${errorMessage(error)}`;
				setDiagnostic(message);
				setStopped(true);
				onError(message);
			}
		};
		void poll();
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [reader, model, onError]);
	const source = stopped ? 'stopped' : model.sessionEnded ? 'ended' : 'following';
	return <App model={model} revision={revision} loadContent={loadContent} source={source} diagnostic={diagnostic} mode={mode}/>;
}
