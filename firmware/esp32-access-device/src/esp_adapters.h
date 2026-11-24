#pragma once

#include <Arduino.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>

#if defined(ACCESS_RFID_MFRC522)
#include <MFRC522.h>
#endif
#if defined(ACCESS_ACTUATOR_SERVO)
#include <ESP32Servo.h>
#endif

#include <string>

#include "board_profile.h"
#include "device_ports.h"

namespace access_device {

class SerialRfidReader final : public RfidReader {
 public:
  void begin() override;
  bool readUid(std::string& normalizedUid) override;
};

#if defined(ACCESS_RFID_MFRC522)
class Mfrc522Reader final : public RfidReader {
 public:
  Mfrc522Reader();
  void begin() override;
  bool readUid(std::string& normalizedUid) override;
 private:
  MFRC522 reader_;
};
#endif

class TimedFakeActuator final : public DoorActuator {
 public:
  void begin() override;
  bool start(uint32_t openDurationMs, uint32_t nowMs) override;
  ActuatorProgress tick(uint32_t nowMs) override;
  void forceClosed() override;

 private:
  bool running_{false};
  uint32_t closeAtMs_{0};
};

#if defined(ACCESS_ACTUATOR_RELAY)
class RelayActuator final : public DoorActuator {
 public:
  void begin() override;
  bool start(uint32_t openDurationMs, uint32_t nowMs) override;
  ActuatorProgress tick(uint32_t nowMs) override;
  void forceClosed() override;

 private:
  bool running_{false};
  uint32_t closeAtMs_{0};
};
#endif

#if defined(ACCESS_ACTUATOR_SERVO)
class ServoActuator final : public DoorActuator {
 public:
  void begin() override;
  bool start(uint32_t openDurationMs, uint32_t nowMs) override;
  ActuatorProgress tick(uint32_t nowMs) override;
  void forceClosed() override;
 private:
  Servo servo_;
  bool running_{false};
  uint32_t closeAtMs_{0};
};
#endif

class NoDoorSensor final : public DoorSensor {
 public:
  void begin() override {}
  bool available() const override { return false; }
  bool openedDuringActuation() const override { return false; }
};

#if defined(ACCESS_DOOR_SENSOR_REED)
class ReedSwitchSensor final : public DoorSensor {
 public:
  void begin() override;
  bool available() const override { return true; }
  bool openedDuringActuation() const override;
};
#endif

class SerialIndicator final : public Indicator {
 public:
  void begin() override {}
  void show(Signal signal, const std::string& detail = "") override;
};

#if defined(ACCESS_INDICATOR_LED) || defined(ACCESS_INDICATOR_BUZZER)
class GpioIndicator final : public Indicator {
 public:
  void begin() override;
  void show(Signal signal, const std::string& detail = "") override;
};
#endif

class NvsCommandStore final : public CommandStore {
 public:
  NvsCommandStore();
  ~NvsCommandStore() override;
  bool healthy() const override { return healthy_; }
  bool loadPendingRequest(PendingRequest& request) override;
  bool savePendingRequest(const PendingRequest& request) override;
  void clearPendingRequest() override;
  bool reserveCommand(const ActuationCommand& command) override;
  bool queueAcknowledgement(const Acknowledgement& acknowledgement) override;
  bool loadPendingAcknowledgement(Acknowledgement& acknowledgement) override;
  void markAcknowledged(const std::string& commandId) override;
  void recoverInterrupted(uint64_t nowEpochMs) override;

 private:
  Preferences preferences_;
  bool healthy_{false};
};

class EspHttpNetworkClient final : public NetworkClient {
 public:
  EspHttpNetworkClient(const char* ssid, const char* password, const char* baseUrl,
                       const char* deviceCode, const char* token);
  void begin() override;
  bool connected() const override;
  void maintain(uint32_t nowMs) override;
  bool clockSynchronized() const override;
  uint64_t epochMs() const override;
  std::string authenticatedDeviceId() const override { return deviceId_; }
  bool sendHeartbeat(const Heartbeat& heartbeat) override;
  bool createSession(const PendingRequest& request, SessionResponse& response) override;
  bool pollSession(const std::string& sessionId, SessionResponse& response) override;
  bool acknowledge(const Acknowledgement& acknowledgement) override;
  int rssi() const override;

 private:
  void addHeaders(HTTPClient& http) const;
  bool parseSession(const String& body, SessionResponse& response) const;
  String endpoint(const char* path) const;
  const char* ssid_;
  const char* password_;
  const char* baseUrl_;
  const char* deviceCode_;
  const char* token_;
  std::string deviceId_;
  uint32_t nextConnectAtMs_{0};
  uint32_t connectBackoffMs_{500};
};

}  // namespace access_device
