#pragma once

#include <cstdint>
#include <string>

#include "device_types.h"

namespace access_device {

class RfidReader {
 public:
  virtual ~RfidReader() = default;
  virtual void begin() = 0;
  virtual bool readUid(std::string& normalizedUid) = 0;
};

class DoorActuator {
 public:
  virtual ~DoorActuator() = default;
  virtual void begin() = 0;
  virtual bool start(uint32_t openDurationMs, uint32_t nowMs) = 0;
  virtual ActuatorProgress tick(uint32_t nowMs) = 0;
  virtual void forceClosed() = 0;
};

class DoorSensor {
 public:
  virtual ~DoorSensor() = default;
  virtual void begin() = 0;
  virtual bool available() const = 0;
  virtual bool openedDuringActuation() const = 0;
};

class Indicator {
 public:
  virtual ~Indicator() = default;
  virtual void begin() = 0;
  virtual void show(Signal signal, const std::string& detail = "") = 0;
};

class CommandStore {
 public:
  virtual ~CommandStore() = default;
  virtual bool healthy() const = 0;
  virtual bool loadPendingRequest(PendingRequest& request) = 0;
  virtual bool savePendingRequest(const PendingRequest& request) = 0;
  virtual void clearPendingRequest() = 0;
  virtual bool reserveCommand(const ActuationCommand& command) = 0;
  virtual bool queueAcknowledgement(const Acknowledgement& acknowledgement) = 0;
  virtual bool loadPendingAcknowledgement(Acknowledgement& acknowledgement) = 0;
  virtual void markAcknowledged(const std::string& commandId) = 0;
  virtual void recoverInterrupted(uint64_t nowEpochMs) = 0;
};

class NetworkClient {
 public:
  virtual ~NetworkClient() = default;
  virtual void begin() = 0;
  virtual bool connected() const = 0;
  virtual void maintain(uint32_t nowMs) = 0;
  virtual bool clockSynchronized() const = 0;
  virtual uint64_t epochMs() const = 0;
  virtual std::string authenticatedDeviceId() const = 0;
  virtual bool sendHeartbeat(const Heartbeat& heartbeat) = 0;
  virtual bool createSession(const PendingRequest& request, SessionResponse& response) = 0;
  virtual bool pollSession(const std::string& sessionId, SessionResponse& response) = 0;
  virtual bool acknowledge(const Acknowledgement& acknowledgement) = 0;
  virtual int rssi() const = 0;
};

}  // namespace access_device
