const MAX_RESPONSE_LENGTH = 16000;

export function createSessionQuery(session, { terminalWaitMs = 1500 } = {}) {
    let warned = false;

    return async (request) => {
        const streams = new Map();
        let ambiguous = false;
        let timer;
        let finishStream;
        const terminal = new Promise((resolve) => {
            finishStream = resolve;
        });
        const unsubscribe = session.on("ui.ephemeral_query", (event) => {
            if (event.agentId) {
                return;
            }
            const data = event.data;
            if (data.phase === "started") {
                if (streams.size > 0) {
                    ambiguous = true;
                    finishStream();
                    return;
                }
                streams.set(data.requestId, { phase: "started", chunks: [], length: 0 });
                return;
            }
            const stream = streams.get(data.requestId);
            if (!stream) {
                return;
            }
            if (stream.phase !== "started" && stream.phase !== "chunk") {
                stream.error = "The recommendation stream continued after its terminal event.";
                finishStream();
                return;
            }
            if (data.phase === "chunk") {
                if (typeof data.chunk !== "string") {
                    stream.error = "The recommendation stream contained a non-text chunk.";
                } else if (stream.length + data.chunk.length > MAX_RESPONSE_LENGTH) {
                    stream.error = "The recommendation stream exceeded the response size limit.";
                } else if (!stream.error) {
                    stream.chunks.push(data.chunk);
                    stream.length += data.chunk.length;
                }
                stream.phase = "chunk";
                if (stream.error) {
                    finishStream();
                }
                return;
            }
            stream.phase = data.phase;
            if (data.phase === "completed") {
                stream.answer = data.answer;
            } else if (data.phase === "failed") {
                stream.error = `The recommendation stream failed: ${data.error || "unknown model error"}`;
            } else if (data.phase === "aborted") {
                stream.error = "The recommendation query was cancelled.";
            } else {
                stream.error = "The recommendation stream reported an unsupported phase.";
            }
            finishStream();
        });

        try {
            const result = await session.rpc.ui.ephemeralQuery(request).catch((error) => {
                if (
                    error instanceof Error &&
                    /\b400\s+The requested model is not supported\b/iu.test(error.message)
                ) {
                    throw new Error(
                        "Copilot's side-query API rejected its model (HTTP 400). Check the model selection with /model, then use /next-action refresh. No model was changed or retry attempted.",
                        { cause: error },
                    );
                }
                throw error;
            });
            if (typeof result?.answer !== "string") {
                throw new TypeError("The current-session query returned an invalid response.");
            }
            if (result.answer.trim()) {
                return result;
            }
            // Some hosts stream a complete answer but return an empty RPC answer.
            // With no caller request ID in this API, concurrent streams must fail closed.
            await Promise.race([
                terminal,
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error(
                        "The query returned no answer and its response stream did not complete.",
                    )), terminalWaitMs);
                }),
            ]);
            if (ambiguous || streams.size !== 1) {
                throw new Error("Concurrent side queries made the streamed recommendation ambiguous. Request it again when other queries finish.");
            }
            const [stream] = streams.values();
            if (stream.error) {
                throw new Error(stream.error);
            }
            if (stream.phase !== "completed") {
                throw new Error("The recommendation stream did not complete successfully.");
            }
            const text = stream.chunks.join("");
            if (
                typeof stream.answer === "string" && stream.answer.trim() &&
                text && stream.answer !== text
            ) {
                throw new Error("The streamed and final recommendation answers disagree.");
            }
            const answer = text || stream.answer;
            if (typeof answer !== "string" || !answer.trim() || answer.length > MAX_RESPONSE_LENGTH) {
                throw new Error("The current-session query completed without a usable recommendation answer.");
            }
            if (!warned) {
                await session.log(
                    "Next-action compatibility: this CLI returned an empty query result; using the completed response stream instead.",
                    { level: "warning", ephemeral: true },
                );
                warned = true;
            }
            return { answer };
        } finally {
            clearTimeout(timer);
            unsubscribe();
        }
    };
}
