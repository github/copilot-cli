import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { createSessionQuery } from "../extensions/next-best-action/session-query.mjs";

function fixture(infer) {
    const emitter = new EventEmitter();
    const notices = [];
    let calls = 0;
    const emit = (phase, data = {}, requestId = "ours", agentId) => emitter.emit(
        "ui.ephemeral_query", { agentId, data: { phase, requestId, ...data } },
    );
    const session = {
        on(name, handler) {
            emitter.on(name, handler);
            return () => emitter.off(name, handler);
        },
        rpc: {
            ui: {
                ephemeralQuery: async (request) => {
                    calls += 1;
                    return infer(emit, request);
                },
            },
        },
        log: async (...args) => notices.push(args),
    };
    return {
        query: createSessionQuery(session, { terminalWaitMs: 50 }),
        notices,
        get calls() { return calls; },
        get listeners() { return emitter.listenerCount("ui.ephemeral_query"); },
    };
}

test("uses a nonempty RPC answer without depending on stream support", async () => {
    const f = fixture(async () => ({ answer: "[]" }));
    assert.deepEqual(await f.query({ question: "suggest" }), { answer: "[]" });
    assert.equal(f.calls, 1);
    assert.equal(f.listeners, 0);
    assert.deepEqual(f.notices, []);
});

test("recovers the same completed streamed response when the RPC answer is empty", async () => {
    const f = fixture(async (emit) => {
        emit("started");
        emit("chunk", { chunk: "[" });
        emit("chunk", { chunk: "]" });
        emit("completed", { answer: "" });
        return { answer: "" };
    });
    assert.deepEqual(await f.query({ question: "suggest" }), { answer: "[]" });
    assert.equal(f.calls, 1);
    assert.equal(f.notices.length, 1);
    assert.equal(f.listeners, 0);
    await f.query({ question: "suggest again" });
    assert.equal(f.notices.length, 1);
});

test("waits for a terminal event delivered after the RPC resolves", async () => {
    const f = fixture(async (emit) => {
        emit("started");
        emit("chunk", { chunk: "[]" });
        setImmediate(() => emit("completed", { answer: "" }));
        return { answer: "" };
    });
    assert.deepEqual(await f.query({ question: "suggest" }), { answer: "[]" });
    assert.equal(f.listeners, 0);
});

test("supports a complete terminal answer when the host does not send chunks", async () => {
    const f = fixture(async (emit) => {
        emit("started");
        emit("completed", { answer: "[]" });
        return { answer: "" };
    });
    assert.deepEqual(await f.query({ question: "suggest" }), { answer: "[]" });
});

test("fails closed for overlapping streams instead of borrowing another query's answer", async () => {
    const f = fixture(async (emit) => {
        emit("started");
        emit("started", {}, "other");
        emit("chunk", { chunk: "[]" }, "other");
        emit("completed", { answer: "[]" }, "other");
        emit("chunk", { chunk: "[]" });
        emit("completed", { answer: "[]" });
        return { answer: "" };
    });
    await assert.rejects(f.query({ question: "suggest" }), /ambiguous/);
    assert.equal(f.listeners, 0);
    assert.deepEqual(f.notices, []);
});

test("ignores subagent streams and an older stream whose start was not observed", async () => {
    const f = fixture(async (emit) => {
        emit("chunk", { chunk: "wrong" }, "older");
        emit("started", {}, "subagent-query", "subagent");
        emit("started");
        emit("chunk", { chunk: "[]" });
        emit("completed", { answer: "[]" });
        return { answer: "" };
    });
    assert.deepEqual(await f.query({ question: "suggest" }), { answer: "[]" });
});

test("does not turn stream failures, cancellation, disagreement, or malformed chunks into success", async () => {
    for (const [event, expected] of [
        [(emit) => emit("failed", { error: "provider unavailable" }), /provider unavailable/],
        [(emit) => emit("aborted"), /cancelled/],
        [(emit) => emit("completed", { answer: "[1]" }), /disagree/],
        [(emit) => emit("chunk", { chunk: 1 }), /non-text/],
        [(emit) => emit("chunk", { chunk: "x".repeat(16001) }), /size limit/],
        [(emit) => { emit("completed", { answer: "[]" }); emit("chunk", { chunk: "x" }); }, /after its terminal/],
    ]) {
        const f = fixture(async (emit) => {
            emit("started");
            emit("chunk", { chunk: "[]" });
            event(emit);
            return { answer: "" };
        });
        await assert.rejects(f.query({ question: "suggest" }), expected);
        assert.equal(f.calls, 1);
        assert.equal(f.listeners, 0);
    }
});

test("rejects empty and incomplete streams and always removes its listener", async () => {
    const empty = fixture(async (emit) => {
        emit("started");
        emit("completed", { answer: "" });
        return { answer: "" };
    });
    await assert.rejects(empty.query({ question: "suggest" }), /without a usable/);
    const missingTerminal = fixture(async (emit) => {
        emit("started");
        emit("chunk", { chunk: "[]" });
        return { answer: "" };
    });
    await assert.rejects(missingTerminal.query({ question: "suggest" }), /did not complete/);
    assert.equal(empty.listeners, 0);
    assert.equal(missingTerminal.listeners, 0);
});

test("never recovers a rejected RPC from streamed content or fabricates a response", async () => {
    const failure = new Error("RPC failed");
    const rejected = fixture(async (emit) => {
        emit("started");
        emit("chunk", { chunk: "[]" });
        emit("completed", { answer: "[]" });
        throw failure;
    });
    await assert.rejects(rejected.query({ question: "suggest" }), (error) => error === failure);
    const malformed = fixture(async () => ({}));
    await assert.rejects(malformed.query({ question: "suggest" }), /invalid response/);
    assert.equal(rejected.listeners, 0);
    assert.equal(malformed.listeners, 0);
});

test("unsupported-model failures explain recovery without switching models or retrying", async () => {
    const failure = new Error("Request session.ui.ephemeralQuery failed with message: host-rethrow: 400 The requested model is not supported.");
    const f = fixture(async () => { throw failure; });
    await assert.rejects(f.query({ question: "suggest" }), (error) => {
        assert.equal(error.cause, failure);
        assert.match(error.message, /side-query API rejected its model/);
        assert.match(error.message, /\/model/);
        assert.match(error.message, /No model was changed or retry attempted/);
        return true;
    });
    assert.equal(f.calls, 1);
    assert.equal(f.listeners, 0);
});

test("unrelated provider errors are preserved, not misclassified as unsupported models", async () => {
    for (const message of ["400 Invalid request body", "401 Unauthorized", "503 Service unavailable"]) {
        const failure = new Error(message);
        const f = fixture(async () => { throw failure; });
        await assert.rejects(f.query({ question: "suggest" }), (error) => error === failure);
        assert.equal(f.calls, 1);
        assert.equal(f.listeners, 0);
    }
});
