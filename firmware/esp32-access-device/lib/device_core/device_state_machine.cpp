#include "device_state_machine.h"

#include <algorithm>
#include <sstream>

namespace access_device {

DeviceStateMachine::DeviceStateMachine(const DeviceConfig& config, RfidReader& rfid,
                                       DoorActuator& actuator, DoorSensor& sensor,
                                       Indicator& indicator, CommandStore& store,
                                       NetworkClient& network)
    : config_(config),
      rfid_(rfid),
      actuator_(actuator),
      sensor_(sensor),
      indicator_(indicator),
      store_(store),
      network_(network) {}

void DeviceStateMachine::begin(uint32_t nowMs) {
  indicator_.begin();
  indicator_.show(Signal::BOOTING);
  rfid_.begin();
  sensor_.begin();
  actuator_.begin();
  actuator_.forceClosed();
  network_.begin();
  if (!store_.healthy()) {
    failClosed("COMMAND_STORE_UNHEALTHY");
    return;
  }
  store_.recoverInterrupted(network_.clockSynchronized() ? network_.epochMs() : 0);
  if (store_.loadPendingAcknowledgement(acknowledgement_)) {
    state_ = DeviceState::ACK_PENDING;
    nextAckAtMs_ = nowMs;
    return;
  }
  if (store_.loadPendingRequest(request_)) {
    state_ = DeviceState::REQUESTING;
  } else {
    state_ = DeviceState::CONNECTING;
  }
  reconnectDelayMs_ = config_.reconnectInitialMs;
  nextReconnectAtMs_ = nowMs;
}

void DeviceStateMachine::tick(uint32_t nowMs) {
  network_.maintain(nowMs);
  if (!network_.connected()) {
    if (state_ == DeviceState::ACTUATING) actuator_.tick(nowMs);
    handleConnectivity(nowMs);
    return;
  }
  reconnectDelayMs_ = config_.reconnectInitialMs;
  if (nowMs >= nextHeartbeatAtMs_) {
    Heartbeat heartbeat{config_.deviceCode,
                        config_.firmwareVersion,
                        network_.clockSynchronized() ? network_.epochMs() : 0,
                        nowMs / 1000,
                        network_.rssi(),
                        config_.resetReason,
                        sensor_.available()};
    network_.sendHeartbeat(heartbeat);
    nextHeartbeatAtMs_ = nowMs + config_.heartbeatIntervalMs;
  }
  switch (state_) {
    case DeviceState::BOOT:
    case DeviceState::CONNECTING:
      transition(DeviceState::READY, Signal::READY);
      break;
    case DeviceState::READY:
      handleReady(nowMs);
      break;
    case DeviceState::REQUESTING:
      handleRequesting(nowMs);
      break;
    case DeviceState::WAITING:
      handleWaiting(nowMs);
      break;
    case DeviceState::ACTUATING:
      handleActuating(nowMs);
      break;
    case DeviceState::ACK_PENDING:
      handleAcknowledgement(nowMs);
      break;
    case DeviceState::ERROR:
      actuator_.forceClosed();
      break;
  }
}

void DeviceStateMachine::handleConnectivity(uint32_t nowMs) {
  actuator_.forceClosed();
  if (nowMs < nextReconnectAtMs_) return;
  indicator_.show(Signal::CONNECTING);
  nextReconnectAtMs_ = nowMs + reconnectDelayMs_;
  reconnectDelayMs_ = std::min(reconnectDelayMs_ * 2, config_.reconnectMaximumMs);
}

void DeviceStateMachine::handleReady(uint32_t nowMs) {
  std::string uid;
  if (!rfid_.readUid(uid) || uid.empty()) return;
  if (uid == lastUid_ && nowMs - lastUidAtMs_ < config_.rfidCooldownMs) return;
  lastUid_ = uid;
  lastUidAtMs_ = nowMs;
  request_ = {uid, createRequestId(nowMs)};
  if (!store_.savePendingRequest(request_)) {
    failClosed("REQUEST_PERSIST_FAILED");
    return;
  }
  transition(DeviceState::REQUESTING, Signal::REQUESTING);
}

void DeviceStateMachine::handleRequesting(uint32_t nowMs) {
  if (!network_.createSession(request_, session_)) {
    transition(DeviceState::CONNECTING, Signal::NETWORK_ERROR);
    return;
  }
  if (session_.status == SessionStatus::PENDING || session_.status == SessionStatus::VERIFYING) {
    pollDelayMs_ = config_.pollInitialMs;
    nextPollAtMs_ = nowMs + pollDelayMs_;
    transition(DeviceState::WAITING, Signal::WAITING);
    return;
  }
  acceptTerminalSession(nowMs);
}

void DeviceStateMachine::handleWaiting(uint32_t nowMs) {
  if (!network_.clockSynchronized() || network_.epochMs() >= session_.expiresAtEpochMs) {
    rejectAttempt("SESSION_EXPIRED_OR_CLOCK_UNAVAILABLE");
    return;
  }
  if (nowMs < nextPollAtMs_) return;
  if (!network_.pollSession(session_.sessionId, session_)) {
    transition(DeviceState::CONNECTING, Signal::NETWORK_ERROR);
    return;
  }
  if (session_.status == SessionStatus::PENDING || session_.status == SessionStatus::VERIFYING) {
    pollDelayMs_ = std::min(pollDelayMs_ * 2, config_.pollMaximumMs);
    nextPollAtMs_ = nowMs + pollDelayMs_;
    return;
  }
  acceptTerminalSession(nowMs);
}

void DeviceStateMachine::acceptTerminalSession(uint32_t nowMs) {
  if (session_.status == SessionStatus::DENIED || session_.status == SessionStatus::EXPIRED) {
    store_.clearPendingRequest();
    transition(DeviceState::READY, Signal::DENIED, session_.reasonCode);
    return;
  }
  if (session_.status != SessionStatus::ALLOWED || !session_.hasCommand ||
      !validateCommand(session_.command)) {
    rejectAttempt("COMMAND_INVALID");
    return;
  }
  store_.clearPendingRequest();
  if (!store_.reserveCommand(session_.command)) {
    transition(DeviceState::READY, Signal::COMMAND_REJECTED, "COMMAND_REPLAY");
    return;
  }
  if (!actuator_.start(session_.command.openDurationMs, nowMs)) {
    acknowledgement_ = {session_.command.commandId, session_.sessionId,
                        ExecutionStatus::FAILED, network_.epochMs(), "ACTUATOR_START_FAILED"};
    store_.queueAcknowledgement(acknowledgement_);
    transition(DeviceState::ACK_PENDING, Signal::ACTUATION_FAILED);
    return;
  }
  state_ = DeviceState::ACTUATING;
}

void DeviceStateMachine::handleActuating(uint32_t nowMs) {
  const auto progress = actuator_.tick(nowMs);
  if (progress == ActuatorProgress::RUNNING) return;
  if (progress == ActuatorProgress::FAILED) {
    acknowledgement_ = {session_.command.commandId, session_.sessionId,
                        ExecutionStatus::FAILED, network_.epochMs(), "ACTUATOR_FAILED"};
    indicator_.show(Signal::ACTUATION_FAILED);
  } else {
    acknowledgement_ = {
        session_.command.commandId,
        session_.sessionId,
        sensor_.available() && sensor_.openedDuringActuation()
            ? ExecutionStatus::CONFIRMED
            : ExecutionStatus::APPLIED_UNCONFIRMED,
        network_.epochMs(),
        ""};
    indicator_.show(Signal::ALLOWED);
  }
  if (!store_.queueAcknowledgement(acknowledgement_)) {
    failClosed("ACK_PERSIST_FAILED");
    return;
  }
  nextAckAtMs_ = nowMs;
  state_ = DeviceState::ACK_PENDING;
}

void DeviceStateMachine::handleAcknowledgement(uint32_t nowMs) {
  if (nowMs < nextAckAtMs_) return;
  if (network_.acknowledge(acknowledgement_)) {
    store_.markAcknowledged(acknowledgement_.commandId);
    transition(DeviceState::READY, Signal::READY);
    return;
  }
  nextAckAtMs_ = nowMs + config_.ackRetryMs;
}

bool DeviceStateMachine::validateCommand(const ActuationCommand& command) const {
  if (!network_.clockSynchronized()) return false;
  if (command.sessionId != session_.sessionId) return false;
  if (command.deviceId != network_.authenticatedDeviceId()) return false;
  if (command.expiresAtEpochMs <= network_.epochMs()) return false;
  if (command.openDurationMs < 100 || command.openDurationMs > 60000) return false;
  return true;
}

void DeviceStateMachine::transition(DeviceState next, Signal signal, const std::string& detail) {
  state_ = next;
  indicator_.show(signal, detail);
}

void DeviceStateMachine::failClosed(const std::string& reason) {
  actuator_.forceClosed();
  state_ = DeviceState::ERROR;
  indicator_.show(Signal::COMMAND_REJECTED, reason);
}

void DeviceStateMachine::rejectAttempt(const std::string& reason) {
  actuator_.forceClosed();
  store_.clearPendingRequest();
  transition(DeviceState::READY, Signal::COMMAND_REJECTED, reason);
}

std::string DeviceStateMachine::createRequestId(uint32_t nowMs) const {
  std::ostringstream value;
  value << config_.deviceCode << '-' << nowMs;
  return value.str();
}

}  // namespace access_device
