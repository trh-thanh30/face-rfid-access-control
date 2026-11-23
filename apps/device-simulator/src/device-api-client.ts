import {
  ACCESS_CONTRACT_VERSION,
  ACCESS_CONTRACT_VERSION_HEADER,
  DEVICE_CODE_HEADER,
  DEVICE_ENDPOINTS,
  accessSessionResponseSchema,
  acknowledgeCommandSchema,
  createAccessSessionSchema,
  type AcknowledgeCommand,
  type AccessSessionResponse,
} from "@access/shared";
import type { SimulatorConfig } from "./config.js";

export class DeviceApiClient {
  constructor(
    private readonly config: SimulatorConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async createSession(
    uid: string,
    requestId: string,
  ): Promise<AccessSessionResponse> {
    const body = createAccessSessionSchema.parse({
      deviceCode: this.config.deviceCode,
      requestId,
      timestamp: new Date().toISOString(),
      rfidUid: uid,
      firmwareVersion: this.config.firmwareVersion,
    });
    return this.jsonRequest(
      DEVICE_ENDPOINTS.accessSessions,
      { method: "POST", body: JSON.stringify(body) },
      accessSessionResponseSchema,
    );
  }

  pollSession(sessionId: string): Promise<AccessSessionResponse> {
    const path = DEVICE_ENDPOINTS.accessSessionById.replace(
      "{sessionId}",
      encodeURIComponent(sessionId),
    );
    return this.jsonRequest(
      path,
      { method: "GET" },
      accessSessionResponseSchema,
    );
  }

  async acknowledge(
    sessionId: string,
    input: AcknowledgeCommand,
  ): Promise<void> {
    const body = acknowledgeCommandSchema.parse(input);
    const path = DEVICE_ENDPOINTS.acknowledgeCommand.replace(
      "{sessionId}",
      encodeURIComponent(sessionId),
    );
    await this.request(path, { method: "POST", body: JSON.stringify(body) });
  }

  private async jsonRequest<T>(
    path: string,
    init: RequestInit,
    schema: { parse(value: unknown): T },
  ): Promise<T> {
    const response = await this.request(path, init);
    try {
      return schema.parse(await response.json());
    } catch (error) {
      throw new DeviceApiError(
        "Device API returned an invalid contract payload",
        {
          cause: error,
        },
      );
    }
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetchImplementation(
        `${this.config.apiUrl}${path}`,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${this.config.deviceToken}`,
            [DEVICE_CODE_HEADER]: this.config.deviceCode,
            [ACCESS_CONTRACT_VERSION_HEADER]: ACCESS_CONTRACT_VERSION,
            "Content-Type": "application/json",
            ...init.headers,
          },
        },
      );
    } catch (error) {
      throw new DeviceNetworkError("Device API is unavailable", {
        cause: error,
      });
    }
    if (!response.ok) {
      throw new DeviceHttpError(
        response.status,
        `Device API rejected request (${response.status})`,
      );
    }
    return response;
  }
}

export class DeviceApiError extends Error {}
export class DeviceNetworkError extends DeviceApiError {}
export class DeviceHttpError extends DeviceApiError {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
