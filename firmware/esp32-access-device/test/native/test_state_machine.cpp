#include <cassert>
#include <iostream>
#include <set>
#include <utility>
#include <vector>

#include "device_state_machine.h"

using namespace access_device;

class FakeRfid final : public RfidReader {
 public:
  std::vector<std::string> queue;
  void begin() override {}
  bool readUid(std::string& uid) override {
    if (queue.empty()) return false;
    uid = queue.front();
    queue.erase(queue.begin());
    return true;
  }
};

class FakeActuator final : public DoorActuator {
 public:
  int starts{0};
  bool failStart{false};
  ActuatorProgress progress{ActuatorProgress::COMPLETE};
  void begin() override {}
  bool start(uint32_t, uint32_t) override {
    ++starts;
    return !failStart;
  }
  ActuatorProgress tick(uint32_t) override { return progress; }
  void forceClosed() override {}
};

class FakeSensor final : public DoorSensor {
 public:
  bool installed{false};
  bool opened{false};
  void begin() override {}
  bool available() const override { return installed; }
  bool openedDuringActuation() const override { return opened; }
};

class FakeIndicator final : public Indicator {
 public:
  std::vector<Signal> signals;
  void begin() override {}
  void show(Signal signal, const std::string& = "") override { signals.push_back(signal); }
};

class FakeStore final : public CommandStore {
 public:
  bool isHealthy{true};
  PendingRequest pendingRequest;
  bool hasRequest{false};
  std::set<std::string> seen;
  Acknowledgement pendingAck;
  bool hasAck{false};
  bool healthy() const override { return isHealthy; }
  bool loadPendingRequest(PendingRequest& request) override {
    if (!hasRequest) return false;
    request = pendingRequest;
    return true;
  }
  bool savePendingRequest(const PendingRequest& request) override {
    pendingRequest = request;
    hasRequest = true;
    return true;
  }
  void clearPendingRequest() override { hasRequest = false; }
  bool reserveCommand(const ActuationCommand& command) override {
    return seen.insert(command.commandId).second;
  }
  bool queueAcknowledgement(const Acknowledgement& acknowledgement) override {
    pendingAck = acknowledgement;
    hasAck = true;
    return true;
  }
  bool loadPendingAcknowledgement(Acknowledgement& acknowledgement) override {
    if (!hasAck) return false;
    acknowledgement = pendingAck;
    return true;
  }
  void markAcknowledged(const std::string&) override { hasAck = false; }
  void recoverInterrupted(uint64_t) override {}
};

class FakeNetwork final : public NetworkClient {
 public:
  bool online{true};
  bool synced{true};
  uint64_t now{100000};
  std::string deviceId{"device-1"};
  SessionResponse response;
  int createCalls{0};
  int ackCalls{0};
  Acknowledgement lastAck;
  void begin() override {}
  bool connected() const override { return online; }
  void maintain(uint32_t) override {}
  bool clockSynchronized() const override { return synced; }
  uint64_t epochMs() const override { return now; }
  std::string authenticatedDeviceId() const override { return deviceId; }
  bool sendHeartbeat(const Heartbeat&) override { return online; }
  bool createSession(const PendingRequest&, SessionResponse& output) override {
    ++createCalls;
    if (!online) return false;
    output = response;
    return true;
  }
  bool pollSession(const std::string&, SessionResponse& output) override {
    output = response;
    return online;
  }
  bool acknowledge(const Acknowledgement& acknowledgement) override {
    ++ackCalls;
    lastAck = acknowledgement;
    return online;
  }
  int rssi() const override { return -50; }
};

struct Fixture {
  DeviceConfig config{"DOOR_01", "test", 10000, 10, 40, 2000, 10, 100, 10};
  FakeRfid rfid;
  FakeActuator actuator;
  FakeSensor sensor;
  FakeIndicator indicator;
  FakeStore store;
  FakeNetwork network;
  DeviceStateMachine machine{config, rfid, actuator, sensor, indicator, store, network};

  Fixture() {
    network.response.sessionId = "session-1";
    network.response.status = SessionStatus::ALLOWED;
    network.response.expiresAtEpochMs = 200000;
    network.response.hasCommand = true;
    network.response.command = {"command-1", "session-1", "device-1", 150000, 500};
  }

  void attempt() {
    machine.begin(0);
    machine.tick(0);
    rfid.queue.push_back("04A1B2C3");
    machine.tick(1);
    machine.tick(2);
    machine.tick(3);
    machine.tick(4);
  }
};

void testAllowedExecutesOnceAndAcknowledgesUnconfirmed() {
  Fixture fixture;
  fixture.attempt();
  assert(fixture.actuator.starts == 1);
  assert(fixture.network.ackCalls == 1);
  assert(fixture.network.lastAck.executionStatus == ExecutionStatus::APPLIED_UNCONFIRMED);
  fixture.rfid.queue.push_back("04A1B2C3");
  fixture.machine.tick(3000);
  fixture.machine.tick(3001);
  assert(fixture.actuator.starts == 1);
}

void testSensorProducesConfirmed() {
  Fixture fixture;
  fixture.sensor.installed = true;
  fixture.sensor.opened = true;
  fixture.attempt();
  assert(fixture.network.lastAck.executionStatus == ExecutionStatus::CONFIRMED);
}

void testWrongDeviceExpiredAndUnsyncedFailClosed() {
  Fixture wrong;
  wrong.network.response.command.deviceId = "other-device";
  wrong.attempt();
  assert(wrong.actuator.starts == 0);

  Fixture expired;
  expired.network.response.command.expiresAtEpochMs = expired.network.now;
  expired.attempt();
  assert(expired.actuator.starts == 0);

  Fixture unsynced;
  unsynced.network.synced = false;
  unsynced.attempt();
  assert(unsynced.actuator.starts == 0);
}

void testCommandReplayDoesNotReactuate() {
  Fixture fixture;
  fixture.attempt();
  assert(fixture.actuator.starts == 1);
  fixture.rfid.queue.push_back("04A1B2C4");
  fixture.machine.tick(3000);
  fixture.machine.tick(3001);
  fixture.machine.tick(3002);
  assert(fixture.actuator.starts == 1);
}

void testNetworkLossKeepsDoorClosedAndRequestPersists() {
  Fixture fixture;
  fixture.network.online = false;
  fixture.machine.begin(0);
  fixture.rfid.queue.push_back("04A1B2C3");
  fixture.machine.tick(0);
  fixture.machine.tick(10);
  assert(fixture.actuator.starts == 0);
  assert(fixture.machine.state() == DeviceState::CONNECTING);
}

void testPendingAckRecoversWithoutReactuation() {
  Fixture fixture;
  fixture.store.hasAck = true;
  fixture.store.pendingAck = {"command-old", "session-old", ExecutionStatus::UNKNOWN, 90000,
                              "RESTART_DURING_ACTUATION"};
  fixture.machine.begin(0);
  fixture.machine.tick(0);
  assert(fixture.actuator.starts == 0);
  assert(fixture.network.ackCalls == 1);
}

int main() {
  testAllowedExecutesOnceAndAcknowledgesUnconfirmed();
  testSensorProducesConfirmed();
  testWrongDeviceExpiredAndUnsyncedFailClosed();
  testCommandReplayDoesNotReactuate();
  testNetworkLossKeepsDoorClosedAndRequestPersists();
  testPendingAckRecoversWithoutReactuation();
  std::cout << "firmware state-machine tests passed\n";
  return 0;
}
