/**
 * Producer Agent
 *
 * Orchestrates "agentic producer" flow:
 * 1) Draft Score Plan from prompt (schema-guided).
 * 2) Generate music via JSON-RPC gateway.
 * 3) Run critics to quality-gate the result.
 * 4) Refine the plan and retry (bounded attempts).
 */

const { BaseAgent, AgentRole, AgentCapabilities } = require('./base-agent');
const { PythonBridge } = require('../python-bridge');
const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_ITERATIONS = 2;
const DEFAULT_BPM = 90;
const DEFAULT_KEY = 'C';
const DEFAULT_MODE = 'minor';
const DEFAULT_TIME_SIGNATURE = [4, 4];

class ProducerAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      role: AgentRole.PRODUCER,
      name: options.name || 'producer',
      description: 'Creates score plans, generates music, and runs quality critics',
      capabilities: [
        AgentCapabilities.SEARCH,
        AgentCapabilities.READ,
        AgentCapabilities.EXECUTE,
        AgentCapabilities.TODO,
        AgentCapabilities.HANDOFF
      ]
    });

    this.pythonBridge = null;
  }

  getSystemPrompt() {
    return `You are the PRODUCER agent in a multi-agent music system.

# ROLE
- Generate a valid Score Plan (score_plan_v1) for MUSE.
- Keep plans musically coherent and production-aware.
- Return JSON only (no markdown) when asked to output a plan.

# QUALITY
- Prefer clear section structures and instrument roles.
- Use musically sensible BPM, key, mode, and arrangement.

# SAFETY
- Do not remove features or disable existing behavior.
- Keep outputs deterministic and schema-compliant.`;
  }

  async process(task, context = {}) {
    const prompt = this._extractPrompt(task);
    const maxIterations = Number(context.maxIterations || DEFAULT_MAX_ITERATIONS);

    const builder = this.orchestrator?.getBuilder?.();
    const verifier = this.orchestrator?.getVerifier?.();
    if (!builder) {
      return { success: false, error: 'Producer requires Builder agent access' };
    }
    if (!verifier) {
      return { success: false, error: 'Producer requires Verifier agent access' };
    }

    let scorePlan = await this._createScorePlan(prompt);
    scorePlan = this._normalizeScorePlan(scorePlan, prompt);

    let lastResult = null;
    let lastCritics = null;

    for (let attempt = 1; attempt <= maxIterations; attempt++) {
      this.log('info', 'Producer attempt starting', { attempt, maxIterations });

      lastResult = await builder.generateMusicFromScorePlan(scorePlan, {
        prompt,
        trackProgress: true
      });

      if (!lastResult || !lastResult.midi_path) {
        this.log('error', 'Music generation failed', { attempt, result: lastResult });
        return {
          success: false,
          error: 'Generation failed or missing midi_path',
          attempt,
          result: lastResult
        };
      }

      lastCritics = await verifier.runMusicCritics(lastResult.midi_path, scorePlan.genre);

      if (lastCritics.passed) {
        return {
          success: true,
          response: this._formatSuccessResponse(scorePlan, lastResult, lastCritics, attempt),
          scorePlan,
          generation: lastResult,
          critics: lastCritics
        };
      }

      if (attempt < maxIterations) {
        scorePlan = await this._refineScorePlan(prompt, scorePlan, lastCritics);
        scorePlan = this._normalizeScorePlan(scorePlan, prompt);
      }
    }

    return {
      success: false,
      response: this._formatFailureResponse(scorePlan, lastResult, lastCritics, maxIterations),
      scorePlan,
      generation: lastResult,
      critics: lastCritics
    };
  }

  async ensurePythonBridge() {
    if (!this.pythonBridge) {
      this.pythonBridge = PythonBridge.getShared();
    }
    if (!this.pythonBridge.isRunning) {
      await this.pythonBridge.start();
    }
    return this.pythonBridge;
  }

  _extractPrompt(task) {
    if (!task) return '';
    if (typeof task === 'string') return task.trim();
    if (typeof task.prompt === 'string') return task.prompt.trim();
    if (typeof task.description === 'string') return task.description.trim();
    return '';
  }

  _schemaPath() {
    return path.resolve(__dirname, '..', '..', '..', '..', 'MUSE', 'docs', 'muse-specs', 'schemas', 'score_plan.v1.schema.json');
  }

  _loadSchema() {
    try {
      const schemaPath = this._schemaPath();
      return fs.readFileSync(schemaPath, 'utf-8');
    } catch (error) {
      this.log('warn', 'Failed to load score plan schema', { error: error.message });
      return null;
    }
  }

  async _createScorePlan(prompt) {
    const schemaText = this._loadSchema();
    const baseInstruction = `Create a score_plan_v1 JSON for this prompt.
Prompt: ${prompt}

Rules:
- Output JSON ONLY (no markdown).
- Must satisfy required fields in the schema.
- Keep instruments realistic and varied.
`;

    const promptWithSchema = schemaText
      ? `${baseInstruction}\nSchema:\n${schemaText}`
      : baseInstruction;

    const response = await this.chat(promptWithSchema);
    const jsonText = this._extractJson(response.text);
    if (!jsonText) {
      this.log('warn', 'Failed to parse score plan JSON, falling back');
      return {};
    }
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      this.log('warn', 'Score plan JSON parse error', { error: error.message });
      return {};
    }
  }

  async _refineScorePlan(prompt, previousPlan, critics) {
    const schemaText = this._loadSchema();
    const criticSummary = critics?.report?.summary || 'Critics failed without a summary.';
    const baseInstruction = `Refine the previous score_plan_v1 JSON to address critics.
Prompt: ${prompt}
Critic summary: ${criticSummary}

Rules:
- Output JSON ONLY (no markdown).
- Preserve the prompt and keep schema validity.
`;

    const promptWithSchema = schemaText
      ? `${baseInstruction}\nPrevious plan:\n${JSON.stringify(previousPlan, null, 2)}\nSchema:\n${schemaText}`
      : `${baseInstruction}\nPrevious plan:\n${JSON.stringify(previousPlan, null, 2)}`;

    const response = await this.chat(promptWithSchema);
    const jsonText = this._extractJson(response.text);
    if (!jsonText) {
      return previousPlan;
    }
    try {
      return JSON.parse(jsonText);
    } catch (_error) {
      return previousPlan;
    }
  }

  _normalizeScorePlan(plan, prompt) {
    const normalized = (plan && typeof plan === 'object') ? { ...plan } : {};
    normalized.schema_version = 'score_plan_v1';
    normalized.prompt = (normalized.prompt && String(normalized.prompt).trim()) || prompt || 'Music generation';

    const bpm = Number(normalized.bpm);
    normalized.bpm = Number.isFinite(bpm) ? Math.min(220, Math.max(30, bpm)) : DEFAULT_BPM;

    const key = typeof normalized.key === 'string' ? normalized.key.trim() : DEFAULT_KEY;
    normalized.key = /^[A-G](#|b)?$/.test(key) ? key : DEFAULT_KEY;

    const mode = typeof normalized.mode === 'string' ? normalized.mode : DEFAULT_MODE;
    const allowedModes = new Set(['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']);
    normalized.mode = allowedModes.has(mode) ? mode : DEFAULT_MODE;

    if (!Array.isArray(normalized.time_signature) || normalized.time_signature.length !== 2) {
      normalized.time_signature = DEFAULT_TIME_SIGNATURE;
    }

    if (!Array.isArray(normalized.sections) || normalized.sections.length === 0) {
      normalized.sections = [
        { name: 'Intro', type: 'intro', bars: 8, energy: 0.2, tension: 0.2 },
        { name: 'Verse', type: 'verse', bars: 16, energy: 0.35, tension: 0.3 },
        { name: 'Chorus', type: 'chorus', bars: 16, energy: 0.6, tension: 0.5 },
        { name: 'Outro', type: 'outro', bars: 8, energy: 0.2, tension: 0.2 }
      ];
    }

    if (!Array.isArray(normalized.tracks) || normalized.tracks.length === 0) {
      normalized.tracks = [
        { role: 'pad', instrument: 'Atmospheric Pad', density: 0.7 },
        { role: 'strings', instrument: 'Warm Strings', density: 0.5 },
        { role: 'keys', instrument: 'Soft Piano', density: 0.4 },
        { role: 'bass', instrument: 'Sub Bass', density: 0.3 },
        { role: 'fx', instrument: 'Drone FX', density: 0.2 }
      ];
    }

    return normalized;
  }

  _extractJson(text) {
    if (!text || typeof text !== 'string') return null;
    const stripped = text.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    if (stripped.startsWith('{') && stripped.endsWith('}')) {
      return stripped;
    }
    const start = stripped.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < stripped.length; i++) {
      const ch = stripped[i];
      if (ch === '{') depth += 1;
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return stripped.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  _formatSuccessResponse(plan, generation, critics, attempt) {
    const title = generation.title || generation.output_name || generation.output_filename || 'Generated track';
    const midiPath = generation.midi_path || 'unknown';
    const audioPath = generation.audio_path || generation.wav_path || 'unknown';
    const criticsSummary = critics?.report?.summary || 'Critics passed.';
    return `Producer completed in ${attempt} attempt(s).
Title: ${title}
Prompt: ${plan.prompt}
Key/Mode: ${plan.key} ${plan.mode}
BPM: ${plan.bpm}
MIDI: ${midiPath}
Audio: ${audioPath}
Critics: ${criticsSummary}`;
  }

  _formatFailureResponse(plan, generation, critics, attempts) {
    const criticsSummary = critics?.report?.summary || 'Critics failed.';
    return `Producer failed after ${attempts} attempt(s).
Prompt: ${plan?.prompt || 'unknown'}
Last result: ${generation?.midi_path || 'no midi'}
Critics: ${criticsSummary}`;
  }
}

module.exports = { ProducerAgent };
