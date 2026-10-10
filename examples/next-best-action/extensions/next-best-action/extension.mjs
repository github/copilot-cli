import { joinSession } from "@github/copilot-sdk/extension";
import { createNextActionExtension } from "./session-adapter.mjs";

const extension = createNextActionExtension();
extension.attach(await joinSession(extension.options));
