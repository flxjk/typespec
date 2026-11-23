import { expect, it, vi } from "vitest";
import type { ExtensionStateManager } from "../../src/extension-state-manager.js";
import { TelemetryClient } from "../../src/telemetry/telemetry-client.js";
import { TelemetryEventName } from "../../src/telemetry/telemetry-event.js";
import { ResultCode } from "../../src/types.js";

vi.mock("../../src/utils.js", () => ({
  isWhitespaceStringOrUndefined: (value: string | undefined) => !value?.trim(),
}));

it("continues to run commands with old telemetry configuration and leaves the queue alone", async () => {
  vi.stubEnv("TYPESPEC_VSCODE_TELEMETRY_KEY", "fixture");
  const state = {
    loadDelayedTelemetryEvents: vi.fn(),
    pushDelayedTelemetryEvent: vi.fn(),
    cleanUpDelayedTelemetryEvents: vi.fn(),
  };
  const client = new TelemetryClient();
  try {
    client.Initialize(state as unknown as ExtensionStateManager);
    client.sendDelayedTelemetryEvents();
    const result = await client.doOperationWithTelemetry(
      TelemetryEventName.OperationDetail,
      async (_event, complete) => {
        complete(ResultCode.Success, true);
        return ResultCode.Success;
      },
    );
    expect(result).toBe(ResultCode.Success);
    expect(state.loadDelayedTelemetryEvents).not.toHaveBeenCalled();
    expect(state.pushDelayedTelemetryEvent).not.toHaveBeenCalled();
    expect(state.cleanUpDelayedTelemetryEvents).not.toHaveBeenCalled();
    await client.dispose();
  } finally {
    vi.unstubAllEnvs();
  }
});
