export const ACCESS_CONTRACT_NAME = "face-rfid-access-control";
export const ACCESS_CONTRACT_VERSION = "1.0.0";
export const ACCESS_CONTRACT_VERSION_HEADER = "X-Access-Contract-Version";
export const DEVICE_CODE_HEADER = "X-Device-Code";
export const DEVICE_ID_HEADER = "X-Device-Id";

export const DEVICE_API_BASE_PATH = "/api/device/v1";
export const DEVICE_ENDPOINTS = {
  heartbeat: `${DEVICE_API_BASE_PATH}/heartbeat`,
  accessSessions: `${DEVICE_API_BASE_PATH}/access-sessions`,
  accessSessionById: `${DEVICE_API_BASE_PATH}/access-sessions/{sessionId}`,
  acknowledgeCommand: `${DEVICE_API_BASE_PATH}/access-sessions/{sessionId}/ack`,
} as const;

export const VISION_API_BASE_PATH = "/internal/v1";
export const VISION_ENDPOINTS = {
  enrollments: `${VISION_API_BASE_PATH}/enrollments`,
  verifications: `${VISION_API_BASE_PATH}/verifications`,
} as const;

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

export function getContractMajor(version: string): number | null {
  const match = SEMVER_PATTERN.exec(version);
  return match ? Number(match[1]) : null;
}

export function isContractVersionCompatible(
  requestedVersion: string,
  supportedVersion = ACCESS_CONTRACT_VERSION,
): boolean {
  const requestedMajor = getContractMajor(requestedVersion);
  const supportedMajor = getContractMajor(supportedVersion);

  return requestedMajor !== null && requestedMajor === supportedMajor;
}
