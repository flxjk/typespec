import type { ExtensionStateManager } from "../extension-state-manager.js";
import type { Result } from "../types.js";
import { ResultCode } from "../types.js";
import { isWhitespaceStringOrUndefined } from "../utils.js";
import type {
  OperationDetailPropertyName,
  OperationTelemetryEvent,
} from "./telemetry-event.js";
import { generateActivityId, TelemetryEventName } from "./telemetry-event.js";

export class TelemetryClient {
  public Initialize(_stateManager: ExtensionStateManager): void {
    // The extension keeps the operation API for existing command callers.
  }

  public async doOperationWithTelemetry<T extends ResultCode | Result<unknown>>(
    eventName: TelemetryEventName,
    /**
     * The operation must return either a {@link ResultCode} or a {@link Result}, and the
     * telemetry event's result will be set from it automatically.
     */
    operation: (
      opTelemetryEvent: OperationTelemetryEvent,
      /** Call this function to send the telemetry event if you don't want to wait until the end of the operation for some reason*/
      sendTelemetryEvent: (result: ResultCode, delay: boolean) => void,
    ) => Promise<T>,
    activityId?: string,
    /**
     * Optional callback to handle unhandled exceptions from the operation.
     * If provided, the exception will NOT be re-thrown and this callback will be invoked instead,
     * and its return value will be used as the result of the operation.
     * If not provided, the exception will be re-thrown after telemetry logging (default behavior).
     */
    onUnhandledException?: (error: unknown) => T,
  ): Promise<T> {
    const opTelemetryEvent = this.createOperationTelemetryEvent(eventName, activityId);
    let eventSent = false;
    const completeOperation = (result?: ResultCode) => {
      if (!eventSent) {
        eventSent = true;
        opTelemetryEvent.endTime ??= new Date();
        if (result) {
          opTelemetryEvent.result = result;
        }
      }
    };
    try {
      const result = await operation(opTelemetryEvent, completeOperation);
      const isResultCode = (v: any) => Object.values(ResultCode).includes(v as ResultCode);
      if (isResultCode(result)) {
        opTelemetryEvent.result ??= result as ResultCode;
      } else if (typeof result === "object" && "code" in result && isResultCode(result.code)) {
        opTelemetryEvent.result ??= result.code as ResultCode;
      }
      return result;
    } catch (e) {
      opTelemetryEvent.result = ResultCode.Fail;
      if (onUnhandledException) {
        return onUnhandledException(e);
      }
      throw e;
    } finally {
      completeOperation();
    }
  }

  public logOperationTelemetryEvent(_event: OperationTelemetryEvent, _delay = false): void {
    // External telemetry is disabled in this build.
  }

  public logOperationDetailTelemetry(
    _activityId: string,
    _detail: Partial<Record<keyof typeof OperationDetailPropertyName, string>>,
    _delay = false,
  ): void {
    // External telemetry is disabled in this build.
  }

  /**
   * Create a operation telemetry event with following default values.
   * Please make sure the default values are updated properly as needed
   *     activityId: a new random guid will be generated if not provided
   *     eventName: the event name provided
   *     startTime: set to the current time
   *     endTime: undefined
   *     result: undefined
   *     lastStep: undefined
   */
  private createOperationTelemetryEvent(
    eventName: TelemetryEventName,
    activityId?: string,
  ): OperationTelemetryEvent {
    return {
      activityId: isWhitespaceStringOrUndefined(activityId) ? generateActivityId() : activityId!,
      eventName: eventName,
      startTime: new Date(),
      endTime: undefined,
      result: undefined,
      lastStep: undefined,
    };
  }

  sendDelayedTelemetryEvents(): void {
    // Legacy queued analytics stays local.
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}

const telemetryClient = new TelemetryClient();
export default telemetryClient;
