#pragma once

#include <cstdint>
#include <string>

#include "device_ports.h"

namespace access_device {

class DeviceStateMachine {
 public:
  DeviceStateMachine(const DeviceConfig& config, RfidReader& rfid, DoorActuator& actuator,
                     DoorSensor& sensor, Indicator& indicator, CommandStore& store,
                     NetworkClient& network);

  void begin(uint32_t nowMs);
  void tick(uint32_t nowMs);
  DeviceState state() const { return state_; }

 private:
  void transition(DeviceState next, Signal signal, const std::string& detail = "");
  void handleConnectivity(uint32_t nowMs);
  void handleReady(uint32_t nowMs);
  void handleRequesting(uint32_t nowMs);
  void handleWaiting(uint32_t nowMs);
  void handleActuating(uint32_t nowMs);
  void handleAcknowledgement(uint32_t nowMs);
  void acceptTerminalSession(uint32_t nowMs);
  bool validateCommand(const ActuationCommand& command) const;
  void rejectAttempt(const std::string& reason);
  void failClosed(const std::string& reason);
  std::string createRequestId(uint32_t nowMs) const;

  DeviceConfig config_;
  RfidReader& rfid_;
  DoorActuator& actuator_;
  DoorSensor& sensor_;
  Indicator& indicator_;
  CommandStore& store_;
  NetworkClient& network_;
  DeviceState state_{DeviceState::BOOT};
  PendingRequest request_;
  SessionResponse session_;
  Acknowledgement acknowledgement_;
  std::string lastUid_;
  uint32_t lastUidAtMs_{0};
  uint32_t nextHeartbeatAtMs_{0};
  uint32_t nextPollAtMs_{0};
  uint32_t pollDelayMs_{0};
  uint32_t nextReconnectAtMs_{0};
  uint32_t reconnectDelayMs_{0};
  uint32_t nextAckAtMs_{0};
};

}  // namespace access_device
