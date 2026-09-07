import assert from "node:assert/strict";
import { test } from "node:test";
import {
    createRecommender,
    parseRecommendations,
    RecommendationTimeoutError,
    RECOMMENDATION_QUESTION,
    StaleRecommendationsError,
} from "../extensions/next-best-action/recommendations.mjs";
import { createNextActionExtension } from "../extensions/next-best-action/session-adapter.mjs";

const actions = [{
    label: "Review the change",
    prompt: "Review the current diff for correctness.",
    rationale: "The implementation is ready for review.",
}];
const response = () => ({ answer: JSON.stringify(actions) });

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((accept, fail) => {
        resolve = accept;
        reject = fail;
    });
    return { promise, resolve, reject };
}

function fixture(overrides = {}) {
    const calls = { query: [], form: [], input: [], send: [], log: [] };
    const listeners = new Map();
    const session = {
        capabilities: { ui: { elicitation: true } },
        getEvents: async () => [{ type: "user.message" }, { type: "assistant.message" }],
        rpc: {
            mode: { get: async () => "interactive" },
            ui: {
                ephemeralQuery: async (request) => {
                    calls.query.push(request);
                    return response();
                },
            },
        },
        ui: {
            elicitation: async (request) => {
                assert.equal(request.requestedSchema.type, "object");
                calls.form.push(request);
                return { action: "accept", content: { action: "action:0" } };
            },
            input: async (...args) => {
                calls.input.push(args);
                return actions[0].prompt;
            },
        },
        send: async (request) => {
            calls.send.push(request);
        },
        log: async (message) => {
            calls.log.push(message);
        },
        on: (name, handler) => {
            listeners.set(name, handler);
            return () => listeners.delete(name);
        },
        ...overrides,
    };
    const extension = createNextActionExtension();
    extension.attach(session);
    return {
        calls,
        session,
        emit: (name, agentId, data = {}) => listeners.get(name)?.({ agentId, data }),
        recommend: extension.options.tools[0].handler,
        pick: (args = "") => extension.options.commands[0].handler({ args }),
    };
}

function autopilotFixture(overrides = {}) {
    const f = fixture(overrides);
    f.session.rpc.mode.get = async () => "autopilot";
    f.session.rpc.mode.set = async () => assert.fail("The extension must not change autopilot mode.");
    f.session.rpc.permissions = {
        setMode: async () => assert.fail("The extension must not change permissions."),
    };
    return f;
}

test("parses valid recommendations and abstention without mutable cached results", () => {
    const result = parseRecommendations(response().answer);
    assert.deepEqual(result, actions);
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result[0]));
    assert.deepEqual(parseRecommendations("[]"), []);
});

test("rejects malformed, oversized, extra-field, duplicate, or unsafe recommendations", () => {
    const invalid = [
        "not JSON",
        "```json\n[]\n```",
        "{}",
        "[null]",
        JSON.stringify(Array(4).fill(actions[0])),
        JSON.stringify([actions[0], actions[0]]),
        JSON.stringify([{ ...actions[0], extra: true }]),
        JSON.stringify([{ ...actions[0], label: "" }]),
        JSON.stringify([{ ...actions[0], label: "x".repeat(81) }]),
        JSON.stringify([{ ...actions[0], prompt: "!git push" }]),
        JSON.stringify([{ ...actions[0], prompt: " /allow-all" }]),
        JSON.stringify([{ ...actions[0], prompt: "$rm file" }]),
        JSON.stringify([{ ...actions[0], label: "\u001b[2J" }]),
        JSON.stringify([{ ...actions[0], rationale: "hidden\u202econtent" }]),
        JSON.stringify([{ ...actions[0], prompt: "Review\n!git push" }]),
        " ".repeat(16001),
    ];
    for (const answer of invalid) {
        assert.throws(() => parseRecommendations(answer), undefined, answer.slice(0, 80));
    }
});

test("accepts ordinary Unicode text", () => {
    const value = [{ ...actions[0], label: "\u68c0\u67e5\u66f4\u6539" }];
    assert.deepEqual(parseRecommendations(JSON.stringify(value)), value);
});

test("empty model output is an error, not a fabricated abstention", () => {
    for (const answer of ["", " \n "]) {
        assert.throws(() => parseRecommendations(answer), /empty recommendation response/);
    }
});

test("shares one current-session query across concurrent requests and cache reads", async () => {
    const f = fixture();
    const results = await Promise.all([f.recommend(), f.recommend(), f.recommend()]);
    assert.equal(new Set(results).size, 1);
    assert.deepEqual(f.calls.query, [{ question: RECOMMENDATION_QUESTION }]);
    assert.deepEqual(f.calls.send, []);
    await f.recommend();
    assert.equal(f.calls.query.length, 1);
});

test("does not call the model at extension load or on context invalidation", () => {
    const f = fixture();
    f.emit("session.task_complete");
    f.emit("user.message");
    assert.deepEqual(f.calls.query, []);
});

test("empty sessions and side-query-only history never dispatch inference or show a picker", async () => {
    for (const events of [
        [],
        [{ type: "session.start" }, { type: "model.turn_started" }, { type: "model.turn_ended" }],
        [{ type: "user.message" }],
        [{ type: "user.message", agentId: "child" }, { type: "assistant.message", agentId: "child" }],
    ]) {
        const f = fixture({ getEvents: async () => events });
        await f.pick();
        assert.match(f.calls.log.at(-1), /Finish a task in this session/);
        assert.deepEqual(f.calls.query, []);
        assert.deepEqual(f.calls.form, []);
        assert.deepEqual(f.calls.send, []);
    }
});

test("autopilot recovers from missing context after the first response completes", async () => {
    let events = [];
    let historyReads = 0;
    const f = autopilotFixture({ getEvents: async () => { historyReads += 1; return events; } });
    await f.pick();
    await f.pick();
    assert.equal(historyReads, 1);
    assert.deepEqual(f.calls.query, []);
    events = [{ type: "user.message" }, { type: "assistant.message" }];
    f.emit("assistant.turn_end");
    await f.pick();
    assert.equal(f.calls.query.length, 1);
    assert.match(f.calls.log.at(-1), /Next actions \(autopilot stays enabled\)/);
});

test("cleared context and subagent responses do not count as a prior task exchange", async () => {
    const f = fixture({ getEvents: async () => [
        { type: "user.message" },
        { type: "assistant.message" },
        { type: "session.context_cleared" },
        { type: "user.message" },
        { type: "assistant.message", agentId: "child" },
    ] });
    await f.pick();
    assert.match(f.calls.log.at(-1), /No next-action context yet/);
    assert.deepEqual(f.calls.query, []);
});

test("history failures and malformed history propagate instead of looking like an empty session", async () => {
    for (const getEvents of [
        async () => { throw new Error("History unavailable"); },
        async () => ({}),
        async () => [null],
    ]) {
        const f = fixture({ getEvents });
        await assert.rejects(f.pick(), /History unavailable|invalid response|invalid event/);
        assert.deepEqual(f.calls.query, []);
    }
});

test("context changes during history retrieval prevent model dispatch", async () => {
    const history = deferred();
    const f = fixture({ getEvents: () => history.promise });
    const pending = f.pick();
    await new Promise((resolve) => setImmediate(resolve));
    f.emit("user.message");
    history.resolve([{ type: "user.message" }, { type: "assistant.message" }]);
    await assert.rejects(pending, StaleRecommendationsError);
    assert.deepEqual(f.calls.query, []);
});

test("the read-only tool reports missing context explicitly without requesting a model", async () => {
    const f = fixture({ getEvents: async () => [] });
    const result = await f.recommend();
    assert.equal(result.resultType, "failure");
    assert.match(result.textResultForLlm, /No next-action context yet/);
    assert.deepEqual(f.calls.query, []);
});

test("extension registration does not request permission bypass or credentials", () => {
    const { options } = createNextActionExtension();
    assert.ok(options.tools.every((tool) => tool.skipPermission !== true));
    assert.equal(Object.hasOwn(options, "onPermissionRequest"), false);
    assert.equal(Object.hasOwn(options, "requestedEnvironmentVariables"), false);
});

test("new main-session context invalidates recommendations but subagent events do not", async () => {
    const f = fixture();
    await f.recommend();
    f.emit("session.task_complete", "subagent");
    await f.recommend();
    assert.equal(f.calls.query.length, 1);
    f.emit("user.message");
    await f.recommend();
    assert.equal(f.calls.query.length, 2);
});

test("discards stale responses without aborting the user's session or overlapping queries", async () => {
    const request = deferred();
    let calls = 0;
    const recommender = createRecommender(() => {
        calls += 1;
        return request.promise;
    });
    const first = recommender.recommend();
    await Promise.resolve();
    recommender.invalidate();
    await assert.rejects(recommender.recommend(), /still running/);
    request.resolve(response());
    await assert.rejects(first, StaleRecommendationsError);
    assert.equal(calls, 1);
    assert.deepEqual(await recommender.recommend(), actions);
    assert.equal(calls, 2);
});

test("does not dispatch a query invalidated before inference starts", async () => {
    let calls = 0;
    const recommender = createRecommender(async () => {
        calls += 1;
        return response();
    });
    const result = recommender.recommend();
    recommender.invalidate();
    await assert.rejects(result, StaleRecommendationsError);
    assert.equal(calls, 0);
});

test("provider errors propagate and are not automatically retried", async () => {
    let calls = 0;
    const failure = new Error("Provider unavailable");
    const recommender = createRecommender(async () => {
        calls += 1;
        throw failure;
    });
    await assert.rejects(recommender.recommend(), (error) => error === failure);
    await assert.rejects(recommender.recommend(), (error) => error === failure);
    assert.equal(calls, 1);
    recommender.invalidate();
    await assert.rejects(recommender.recommend(), (error) => error === failure);
    assert.equal(calls, 2);
});

test("times out a stalled inference without starting overlapping requests", async () => {
    const request = deferred();
    let calls = 0;
    const recommender = createRecommender(() => {
        calls += 1;
        return request.promise;
    }, { timeoutMs: 10 });
    await assert.rejects(recommender.recommend(), RecommendationTimeoutError);
    recommender.invalidate();
    await assert.rejects(recommender.recommend(), /still running/);
    assert.equal(calls, 1);
    request.resolve(response());
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(await recommender.recommend(), actions);
    assert.equal(calls, 2);
});

test("late success does not replace a timeout or trigger an automatic retry", async () => {
    const request = deferred();
    let calls = 0;
    const recommender = createRecommender(() => {
        calls += 1;
        return request.promise;
    }, { timeoutMs: 10 });
    await assert.rejects(recommender.recommend(), RecommendationTimeoutError);
    request.resolve(response());
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(recommender.recommend(), RecommendationTimeoutError);
    assert.equal(calls, 1);
});

test("late rejection after a timeout is handled and does not remain in flight", async () => {
    const request = deferred();
    let calls = 0;
    const recommender = createRecommender(() => {
        calls += 1;
        return calls === 1 ? request.promise : Promise.resolve(response());
    }, { timeoutMs: 10 });
    await assert.rejects(recommender.recommend(), RecommendationTimeoutError);
    request.reject(new Error("Late provider error"));
    await new Promise((resolve) => setImmediate(resolve));
    recommender.invalidate();
    assert.deepEqual(await recommender.recommend(), actions);
    assert.equal(calls, 2);
});

test("rejects invalid inference deadlines", () => {
    for (const timeoutMs of [0, -1, NaN, Infinity, 2147483648]) {
        assert.throws(() => createRecommender(async () => response(), { timeoutMs }), TypeError);
    }
});

test("tool failures preserve an explicit failure status and useful error message", async () => {
    const f = fixture();
    f.session.rpc.ui.ephemeralQuery = async () => {
        throw new Error("Inference unavailable in this runtime");
    };
    assert.deepEqual(await f.recommend(), {
        resultType: "failure",
        textResultForLlm: "Next-action recommendations failed: Inference unavailable in this runtime",
    });
    assert.deepEqual(f.calls.send, []);
});

test("command reports progress and inference failures without swallowing the error", async () => {
    const f = fixture();
    const notices = [];
    const failure = new Error("Provider unavailable");
    f.session.log = async (message, options) => notices.push({ message, options });
    f.session.rpc.ui.ephemeralQuery = async () => { throw failure; };
    await assert.rejects(f.pick(), (error) => error === failure);
    assert.deepEqual(notices, [
        { message: "Preparing next-action suggestions...", options: { ephemeral: true } },
        { message: "Next-action failed: Provider unavailable", options: { level: "warning" } },
    ]);
    assert.deepEqual(f.calls.send, []);
});

test("selection alone does not submit; edited prompt confirmation submits exactly once", async () => {
    const f = fixture();
    const confirmation = deferred();
    f.session.ui.input = (...args) => {
        f.calls.input.push(args);
        return confirmation.promise;
    };
    const picking = f.pick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.calls.input[0][1].default, actions[0].prompt);
    assert.equal(f.calls.form[0].requestedSchema.properties.action.default, "done");
    assert.deepEqual(f.calls.send, []);
    confirmation.resolve("Review the diff, focusing on error handling.");
    await picking;
    assert.deepEqual(f.calls.send, [{ prompt: "Review the diff, focusing on error handling." }]);
});

test("picker supplies an explicit object schema matching the SDK's typed contract", async () => {
    const f = fixture();
    f.session.ui.elicitation = async (request) => {
        assert.equal(request.requestedSchema.type, "object");
        assert.ok(request.requestedSchema.properties.action);
        return { action: "cancel" };
    };
    await f.pick();
    assert.deepEqual(f.calls.send, []);
});

test("Done, declining, cancellation, and empty results never submit a prompt", async () => {
    for (const result of [
        { action: "decline" },
        { action: "cancel" },
        { action: "accept", content: { action: "done" } },
    ]) {
        const f = fixture();
        f.session.ui.elicitation = async () => result;
        await f.pick();
        assert.deepEqual(f.calls.send, []);
        assert.deepEqual(f.calls.input, []);
    }
    const cancelled = fixture();
    cancelled.session.ui.input = async () => null;
    await cancelled.pick();
    assert.deepEqual(cancelled.calls.send, []);
    const empty = fixture();
    empty.session.rpc.ui.ephemeralQuery = async () => ({ answer: "[]" });
    await empty.pick();
    assert.match(empty.calls.log.at(-1), /^No useful next action/);
    assert.deepEqual(empty.calls.form, []);
    assert.deepEqual(empty.calls.send, []);
});

test("supports Something else and freeform selection through an explicit editable prompt", async () => {
    for (const choice of ["custom", "Explain the change instead."]) {
        const f = fixture();
        f.session.ui.elicitation = async () => ({ action: "accept", content: { action: choice } });
        await f.pick();
        assert.equal(f.calls.input[0][1].default, choice === "custom" ? "" : choice);
        assert.equal(f.calls.send.length, 1);
    }
});

test("new context while a form is open prevents submitting a stale action", async () => {
    const f = fixture();
    f.session.ui.input = async () => {
        f.emit("user.message");
        return actions[0].prompt;
    };
    await assert.rejects(f.pick(), StaleRecommendationsError);
    assert.deepEqual(f.calls.send, []);
    assert.match(f.calls.log.at(-1), /^Next-action failed: The session changed/);
});

test("rejects unsafe edited prompts and unexpected form values", async () => {
    const f = fixture();
    f.session.ui.input = async () => "!git push";
    await assert.rejects(f.pick(), /natural-language/);
    assert.deepEqual(f.calls.send, []);
    for (const choice of [true, "", "action:99"]) {
        const invalid = fixture();
        invalid.session.ui.elicitation = async () => ({ action: "accept", content: { action: choice } });
        await assert.rejects(invalid.pick(), TypeError);
        assert.deepEqual(invalid.calls.send, []);
    }
    const invalidResponse = fixture();
    invalidResponse.session.ui.elicitation = async () => ({ action: "unexpected" });
    await assert.rejects(invalidResponse.pick(), /unsupported response/);
    assert.deepEqual(invalidResponse.calls.send, []);
});

test("requires UI support and valid arguments before spending model usage", async () => {
    const f = fixture({ capabilities: {} });
    await assert.rejects(f.pick(), /cannot display/);
    assert.deepEqual(f.calls.query, []);
    const invalid = fixture();
    await assert.rejects(invalid.pick("unknown"), /Usage:/);
    assert.deepEqual(invalid.calls.query, []);
});

test("prevents overlapping pickers, allows explicit refresh, and recovers after UI errors", async () => {
    const f = fixture();
    const selection = deferred();
    f.session.ui.elicitation = () => selection.promise;
    const first = f.pick();
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(f.pick(), /already running/);
    selection.reject(new Error("UI unavailable"));
    await assert.rejects(first, /UI unavailable/);
    f.session.ui.elicitation = async () => ({ action: "cancel" });
    await f.pick("refresh");
    assert.equal(f.calls.query.length, 2);
});

test("a completed autopilot task offers choices without any elicitation or mode change", async () => {
    const f = autopilotFixture({ capabilities: {} });
    f.emit("session.task_complete", undefined, { success: true, outcome: "completed" });
    await f.pick();
    assert.match(f.calls.log.at(-1), /Next actions \(autopilot stays enabled\)/);
    assert.match(f.calls.log.at(-1), /1\. Review the change/);
    assert.match(f.calls.log.at(-1), /\/next-action run 1/);
    assert.deepEqual(f.calls.form, []);
    assert.deepEqual(f.calls.input, []);
    assert.deepEqual(f.calls.send, []);
    await f.pick("1");
    assert.match(f.calls.log.at(-1), /Preview 1:/);
    assert.ok(f.calls.log.at(-1).includes(actions[0].prompt));
    assert.deepEqual(f.calls.send, []);
    await f.pick("run 1");
    assert.deepEqual(f.calls.send, [{ prompt: actions[0].prompt }]);
    assert.equal(f.calls.query.length, 1);
    assert.equal(await f.session.rpc.mode.get(), "autopilot");
});

test("running a numbered choice requires a displayed list and a separate preview", async () => {
    const f = autopilotFixture();
    await assert.rejects(f.pick("run 1"), /Run \/next-action first/);
    await assert.rejects(f.pick("1"), /Run \/next-action first/);
    assert.deepEqual(f.calls.query, []);
    await f.pick();
    await assert.rejects(f.pick("run 1"), /Preview this suggestion/);
    await assert.rejects(f.pick("2"), /not available/);
    await assert.rejects(f.pick("run 9"), /Usage:/);
    assert.deepEqual(f.calls.send, []);
    assert.equal(f.calls.query.length, 1);
});

test("command diagnostics do not invalidate the list needed to correct an unreviewed run", async () => {
    const f = autopilotFixture();
    f.session.log = async (message, options) => {
        f.calls.log.push(message);
        if (options?.level === "error") {
            f.emit("session.error");
        }
    };
    await f.pick();
    await assert.rejects(f.pick("run 1"), /Preview this suggestion/);
    await f.pick("1");
    await f.pick("run 1");
    assert.equal(f.calls.query.length, 1);
    assert.equal(f.calls.send.length, 1);
});

test("command diagnostics do not invalidate a cached inference failure", async () => {
    const f = autopilotFixture();
    f.session.log = async (message, options) => {
        f.calls.log.push(message);
        if (options?.level === "error") {
            f.emit("session.error");
        }
    };
    let queries = 0;
    f.session.rpc.ui.ephemeralQuery = async () => {
        queries += 1;
        throw new Error("Provider unavailable");
    };
    await assert.rejects(f.pick(), /Provider unavailable/);
    await assert.rejects(f.pick(), /Provider unavailable/);
    assert.equal(queries, 1);
});

test("previewing one action does not authorize a different numbered action", async () => {
    const f = autopilotFixture();
    f.session.rpc.ui.ephemeralQuery = async () => ({ answer: JSON.stringify([
        ...actions,
        { label: "Explain the change", prompt: "Explain the current diff.", rationale: "Understand what changed." },
    ]) });
    await f.pick();
    await f.pick("1");
    await assert.rejects(f.pick("run 2"), /Preview this suggestion/);
    await f.pick("2");
    await assert.rejects(f.pick("run 1"), /Preview this suggestion/);
    await f.pick("run 2");
    assert.deepEqual(f.calls.send, [{ prompt: "Explain the current diff." }]);
});

test("a mode change during the mode lookup prevents both inference and presentation", async () => {
    const f = autopilotFixture();
    const mode = deferred();
    f.session.rpc.mode.get = () => mode.promise;
    const pending = f.pick();
    f.emit("session.mode_changed");
    mode.resolve("autopilot");
    await assert.rejects(pending, StaleRecommendationsError);
    assert.deepEqual(f.calls.query, []);
    await assert.rejects(f.pick("1"), /Run \/next-action first/);
});

test("context changes while displaying progress, choices, or previews cannot revive a batch", async () => {
    for (const phase of ["Preparing", "Next actions (", "Preview 1:"]) {
        const f = autopilotFixture();
        f.session.log = async (message) => {
            f.calls.log.push(message);
            if (message.startsWith(phase)) {
                f.emit("session.mode_changed");
            }
        };
        if (phase === "Preview 1:") {
            await f.pick();
            await assert.rejects(f.pick("1"), StaleRecommendationsError);
        } else {
            await assert.rejects(f.pick(), StaleRecommendationsError);
        }
        await assert.rejects(f.pick("run 1"), /Run \/next-action first/);
        assert.deepEqual(f.calls.send, []);
        if (phase === "Preparing") {
            assert.deepEqual(f.calls.query, []);
        }
    }
});

test("autopilot permits editing a reviewed prompt but rejects executable prefixes", async () => {
    const f = autopilotFixture();
    await f.pick();
    await f.pick("1");
    await assert.rejects(f.pick("run 1 !git push"), /natural-language/);
    assert.deepEqual(f.calls.send, []);
    await f.pick("run 1 Explain the diff without modifying files.");
    assert.deepEqual(f.calls.send, [{ prompt: "Explain the diff without modifying files." }]);
    assert.equal(f.calls.query.length, 1);
});

test("new work, task completion, mode changes, and permission changes invalidate previews", async () => {
    for (const event of [
        "user.message", "session.task_complete", "session.mode_changed", "session.permissions_changed",
    ]) {
        const f = autopilotFixture();
        await f.pick();
        await f.pick("1");
        f.emit(event);
        await assert.rejects(f.pick("run 1"), /Run \/next-action first/);
        assert.deepEqual(f.calls.send, []);
        assert.equal(f.calls.query.length, 1);
    }
});

test("refresh requires a new preview even when the suggestion number is unchanged", async () => {
    const f = autopilotFixture();
    await f.pick();
    await f.pick("1");
    await f.pick("refresh");
    await assert.rejects(f.pick("run 1"), /Preview this suggestion/);
    assert.deepEqual(f.calls.send, []);
    await f.pick("1");
    await f.pick("run 1");
    assert.equal(f.calls.query.length, 2);
    assert.equal(f.calls.send.length, 1);
});

test("Done clears an autopilot preview without running anything", async () => {
    const f = autopilotFixture();
    await f.pick();
    await f.pick("1");
    await f.pick("done");
    assert.match(f.calls.log.at(-1), /dismissed/);
    await assert.rejects(f.pick("run 1"), /Run \/next-action first/);
    assert.deepEqual(f.calls.send, []);
    assert.equal(f.calls.query.length, 1);
});

test("a reviewed choice can be submitted only once, including concurrent commands", async () => {
    const f = autopilotFixture();
    const sending = deferred();
    f.session.send = async (request) => {
        f.calls.send.push(request);
        return sending.promise;
    };
    await f.pick();
    await f.pick("1");
    const first = f.pick("run 1");
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(f.pick("run 1"), /already running/);
    sending.resolve();
    await first;
    await assert.rejects(f.pick("run 1"), /Run \/next-action first/);
    assert.equal(f.calls.send.length, 1);
});

test("a failed submission is not silently retried with the same reviewed choice", async () => {
    const f = autopilotFixture();
    f.session.send = async (request) => {
        f.calls.send.push(request);
        throw new Error("Submission failed");
    };
    await f.pick();
    await f.pick("1");
    await assert.rejects(f.pick("run 1"), /Submission failed/);
    await assert.rejects(f.pick("run 1"), /Run \/next-action first/);
    assert.equal(f.calls.send.length, 1);
});

test("autopilot abstention leaves no runnable choice", async () => {
    const f = autopilotFixture();
    f.session.rpc.ui.ephemeralQuery = async () => ({ answer: "[]" });
    await f.pick();
    assert.match(f.calls.log.at(-1), /^No useful next action/);
    await assert.rejects(f.pick("1"), /Run \/next-action first/);
    assert.deepEqual(f.calls.form, []);
    assert.deepEqual(f.calls.send, []);
});

test("unsupported session API fails clearly instead of starting another CLI", () => {
    assert.throws(() => createNextActionExtension().attach({ rpc: {} }), /ephemeralQuery/);
});
