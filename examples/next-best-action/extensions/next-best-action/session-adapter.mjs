import { createRecommender, validatePrompt } from "./recommendations.mjs";
import { createSessionQuery } from "./session-query.mjs";

const INVALIDATING_EVENTS = [
    "user.message",
    "assistant.turn_start",
    "assistant.turn_end",
    "session.task_complete",
    "session.autopilot_objective_changed",
    "session.context_changed",
    "session.context_cleared",
    "session.snapshot_rewind",
    "session.model_change",
    "session.mode_changed",
    "session.permissions_changed",
    "session.session_limits_changed",
    "pending_messages.modified",
    "session.background_tasks_changed",
    "session.error",
    "abort",
    "session.shutdown",
];

class NoTaskContextError extends Error {
    constructor() {
        super("No next-action context yet. Finish a task in this session, then run /next-action. No model query was made.");
        this.name = "NoTaskContextError";
    }
}

function hasTaskContext(events) {
    if (!Array.isArray(events)) {
        throw new TypeError("The current-session history returned an invalid response.");
    }
    let userMessage = false;
    let assistantResponse = false;
    for (const event of events) {
        if (typeof event?.type !== "string") {
            throw new TypeError("The current-session history contained an invalid event.");
        }
        if (event.agentId) {
            continue;
        }
        if (event.type === "session.context_cleared") {
            userMessage = false;
            assistantResponse = false;
        } else if (event.type === "user.message") {
            userMessage = true;
        } else if (event.type === "assistant.message" && userMessage) {
            assistantResponse = true;
        }
    }
    return assistantResponse;
}

export function createNextActionExtension() {
    let session;
    let recommender;
    let commandActive = false;
    let presentedBatch;
    let reviewedAction;

    function requireSession() {
        if (!session) {
            throw new Error("The next-action extension has not joined a session.");
        }
        return session;
    }

    function clearChoices() {
        presentedBatch = undefined;
        reviewedAction = undefined;
    }

    function invalidate(reason) {
        recommender.invalidate(reason);
        clearChoices();
    }

    function requireAction(number) {
        if (!presentedBatch) {
            throw new Error("Run /next-action first to display current suggestions.");
        }
        recommender.assertCurrent(presentedBatch.revision);
        const action = presentedBatch.actions[number - 1];
        if (!action) {
            throw new Error(`Suggestion ${number} is not available in the current list.`);
        }
        return { action, revision: presentedBatch.revision };
    }

    async function previewAction(number) {
        const { action, revision } = requireAction(number);
        reviewedAction = undefined;
        await session.log([
            `Preview ${number}: ${action.label}`,
            "",
            `    ${action.prompt}`,
            "",
            `Nothing has been submitted. Run /next-action run ${number} to use this prompt.`,
            `To edit it, use /next-action run ${number} <your edited prompt>, or type your own prompt normally.`,
        ].join("\n"));
        recommender.assertCurrent(revision);
        reviewedAction = { number, revision };
    }

    async function runReviewedAction(number, editedPrompt) {
        const { action, revision } = requireAction(number);
        if (reviewedAction?.number !== number || reviewedAction.revision !== revision) {
            throw new Error(`Preview this suggestion with /next-action ${number} before running it.`);
        }
        const prompt = validatePrompt(editedPrompt ?? action.prompt);
        clearChoices();
        await session.send({ prompt });
    }

    async function handleCommand({ args = "" }) {
        const currentSession = requireSession();
        const argument = args.trim();
        if (commandActive) {
            throw new Error("A next-action command is already running.");
        }
        commandActive = true;
        try {
            if (argument === "done") {
                clearChoices();
                await currentSession.log("Next-action choices dismissed. No task was started.");
                return;
            }
            if (/^[1-3]$/u.test(argument)) {
                await previewAction(Number(argument));
                return;
            }
            const run = /^run\s+([1-3])(?:\s+([\s\S]+))?$/u.exec(argument);
            if (run) {
                await runReviewedAction(Number(run[1]), run[2]);
                return;
            }
            if (argument !== "" && argument !== "refresh") {
                throw new Error("Usage: /next-action [refresh | 1-3 | run 1-3 [edited prompt] | done]");
            }
            clearChoices();
            if (argument === "refresh") {
                invalidate("explicit refresh");
            }
            const revision = recommender.revision;
            if (typeof currentSession.rpc.mode?.get !== "function") {
                throw new Error("This Copilot version does not expose session.rpc.mode.get.");
            }
            const mode = await currentSession.rpc.mode.get();
            recommender.assertCurrent(revision);
            if (mode !== "autopilot" && !currentSession.capabilities.ui?.elicitation) {
                throw new Error("This Copilot host cannot display the next-action picker.");
            }
            await currentSession.log("Preparing next-action suggestions...", { ephemeral: true });
            recommender.assertCurrent(revision);
            const actions = await recommender.recommend();
            recommender.assertCurrent(revision);
            if (actions.length === 0) {
                await currentSession.log("No useful next action was identified. Continue with your own prompt.");
                return;
            }
            if (mode === "autopilot") {
                // Autopilot auto-declines elicitation, including dialogs opened by commands.
                await currentSession.log([
                    "Next actions (autopilot stays enabled):",
                    "",
                    ...actions.map((action, index) => `${index + 1}. ${action.label} - ${action.rationale}`),
                    "",
                    "Preview a listed choice: /next-action 1.",
                    "Then explicitly submit it: /next-action run 1.",
                    "Use /next-action done to dismiss, or type your own prompt normally.",
                ].join("\n"));
                recommender.assertCurrent(revision);
                presentedBatch = { revision, actions };
                return;
            }
            const result = await currentSession.ui.elicitation({
                message: "Choose a suggested next task. Selection only opens an editable prompt; it does not run it.",
                requestedSchema: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            title: "Next task",
                            oneOf: [
                                ...actions.map((action, index) => ({
                                    const: `action:${index}`,
                                    title: `${action.label} - ${action.rationale}`,
                                })),
                                { const: "custom", title: "Something else" },
                                { const: "done", title: "Done" },
                            ],
                            default: "done",
                        },
                    },
                },
            });
            if (result.action === "decline" || result.action === "cancel") {
                clearChoices();
                await currentSession.log("Next-action picker dismissed. No task was started.");
                return;
            }
            if (result.action !== "accept") {
                throw new TypeError("The next-action picker returned an unsupported response.");
            }
            recommender.assertCurrent(revision);
            const choice = result.content?.action;
            if (choice === "done") {
                clearChoices();
                await currentSession.log("Next-action choices dismissed. No task was started.");
                return;
            }
            if (typeof choice !== "string" || !choice.trim()) {
                throw new TypeError("A next-action selection must be nonempty text.");
            }
            const index = actions.findIndex((_, candidate) => choice === `action:${candidate}`);
            if (choice.startsWith("action:") && index === -1) {
                throw new TypeError("That next-action selection is no longer available.");
            }
            const draft = index >= 0
                ? actions[index].prompt
                : choice === "custom" ? "" : validatePrompt(choice);
            const prompt = await currentSession.ui.input(
                "Review the next prompt. Submitting this form starts a new turn in this session; Cancel runs nothing.",
                {
                    title: "Next prompt",
                    description: "Existing session mode and tool permissions are unchanged.",
                    default: draft,
                    maxLength: 1000,
                },
            );
            if (prompt === null) {
                clearChoices();
                await currentSession.log("Next-action prompt cancelled. No task was started.");
                return;
            }
            recommender.assertCurrent(revision);
            const validatedPrompt = validatePrompt(prompt);
            clearChoices();
            await currentSession.send({ prompt: validatedPrompt });
        } finally {
            commandActive = false;
        }
    }

    return {
        options: {
            tools: [{
                name: "next_action_recommendations",
                description: "When the user explicitly asks for next-task suggestions, infer up to three editable prompts from this session's context. Uses one no-tools LLM query and may incur model usage. Does not scan files, execute actions, or submit prompts.",
                parameters: { type: "object", properties: {}, additionalProperties: false },
                handler: async () => {
                    requireSession();
                    return recommender.recommend().then(
                        (actions) => JSON.stringify({ actions }),
                        (error) => {
                            if (!(error instanceof Error)) {
                                throw error;
                            }
                            return {
                                resultType: "failure",
                                textResultForLlm: `Next-action recommendations failed: ${error.message}`,
                            };
                        },
                    );
                },
            }],
            commands: [{
                name: "next-action",
                description: "Suggest next tasks. In autopilot: preview with /next-action 1, then submit with /next-action run 1. Use refresh for new suggestions.",
                handler: (context) => handleCommand(context).then(undefined, async (error) => {
                    if (session && error instanceof NoTaskContextError) {
                        await session.log(error.message);
                        return;
                    }
                    if (session && error instanceof Error) {
                        // An error-level log emits session.error and would invalidate our own cache.
                        await session.log(`Next-action failed: ${error.message}`, { level: "warning" });
                    }
                    throw error;
                }),
            }],
        },
        attach(joinedSession) {
            if (session) {
                throw new Error("The next-action extension is already attached.");
            }
            if (typeof joinedSession?.rpc?.ui?.ephemeralQuery !== "function") {
                throw new Error("This Copilot version does not expose session.rpc.ui.ephemeralQuery.");
            }
            if (typeof joinedSession.getEvents !== "function") {
                throw new Error("This Copilot version does not expose session.getEvents.");
            }
            session = joinedSession;
            const query = createSessionQuery(session);
            recommender = createRecommender(async (request) => {
                const revision = recommender.revision;
                const events = await session.getEvents();
                recommender.assertCurrent(revision);
                if (!hasTaskContext(events)) {
                    throw new NoTaskContextError();
                }
                return query(request);
            });
            for (const eventName of INVALIDATING_EVENTS) {
                session.on(eventName, (event) => {
                    if (!event.agentId) {
                        invalidate(`${eventName}${event.ephemeral ? ", ephemeral" : ""}`);
                    }
                });
            }
        },
    };
}
