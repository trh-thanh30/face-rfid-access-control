#pragma once

#include <cstdint>
#include <string>

namespace access_device {

enum class DeviceState {
  BOOT,
  CONNECTING,
  READY,
  REQUESTING,
  WAITING,
  ACTUATING,
  ACK_PENDING,
  ERROR,
};

enum class SessionStatus { PENDING, VERIFYING, ALLOWED, DENIED, EXPIRED, INVALID };
enum class ExecutionStatus { APPLIED_UNCONFIRMED, CONFIRMED, FAILED, UNKNOWN };
enum class ActuatorProgress { IDLE, RUNNING, COMPLETE, FAILED };
enum class Signal {
  BOOTING,
  CONNECTING,
  READY,
  REQUESTING,
  WAITING,
  ALLOWED,
  DENIED,
  NETWORK_ERROR,
  COMMAND_REJECTED,
  ACTUATION_FAILED,
};

struct DeviceConfig {
  std::string deviceCode;
  std::string firmwareVersion;
  uint32_t heartbeatIntervalMs{10000};
  uint32_t pollInitialMs{250};
  uint32_t pollMaximumMs{1000};
  uint32_t rfidCooldownMs{2000};
  uint32_t reconnectInitialMs{500};
  uint32_t reconnectMaximumMs{30000};
  uint32_t ackRetryMs{1000};
  std::string resetReason{"unknown"};
};

struct PendingRequest {
  std::string uid;
  std::string requestId;
};

struct ActuationCommand {
  std::string commandId;
  std::string sessionId;
  std::string deviceId;
  uint64_t expiresAtEpochMs{0};
  uint32_t openDurationMs{0};
};

struct SessionResponse {
  std::string sessionId;
  std::string correlationId;
  SessionStatus status{SessionStatus::INVALID};
  uint64_t expiresAtEpochMs{0};
  std::string reasonCode;
  bool hasCommand{false};
  ActuationCommand command;
};

struct Acknowledgement {
  std::string commandId;
  std::string sessionId;
  ExecutionStatus executionStatus{ExecutionStatus::UNKNOWN};
  uint64_t timestampEpochMs{0};
  std::string errorCode;
};

struct Heartbeat {
  std::string deviceCode;
  std::string firmwareVersion;
  uint64_t timestampEpochMs{0};
  uint32_t uptimeSeconds{0};
  int rssi{0};
  std::string resetReason;
  bool hasDoorSensor{false};
};

}  // namespace access_device
