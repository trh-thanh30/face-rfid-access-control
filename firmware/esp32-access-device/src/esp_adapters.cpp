#include "esp_adapters.h"

#include <ArduinoJson.h>
#include <generated/access_contracts.h>
#include <time.h>

#include <algorithm>
#include <cctype>

#if defined(ACCESS_RFID_MFRC522)
#include <SPI.h>
#endif

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "dev"
#endif

namespace access_device {
namespace {

String isoTimestamp(uint64_t epochMs) {
  const time_t seconds = static_cast<time_t>(epochMs / 1000);
  struct tm utc {};
  gmtime_r(&seconds, &utc);
  char value[25];
  strftime(value, sizeof(value), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return String(value);
}

uint64_t parseTimestamp(const char* value) {
  if (!value) return 0;
  struct tm parsed {};
  if (!strptime(value, "%Y-%m-%dT%H:%M:%S", &parsed)) return 0;
  return static_cast<uint64_t>(timegm(&parsed)) * 1000;
}

const char* executionStatusName(ExecutionStatus status) {
  switch (status) {
    case ExecutionStatus::APPLIED_UNCONFIRMED:
      return "APPLIED_UNCONFIRMED";
    case ExecutionStatus::CONFIRMED:
      return "CONFIRMED";
    case ExecutionStatus::FAILED:
      return "FAILED";
    case ExecutionStatus::UNKNOWN:
      return "UNKNOWN";
  }
  return "UNKNOWN";
}

const char* actuatorCapability() {
#if defined(ACCESS_ACTUATOR_RELAY)
  return "RELAY";
#elif defined(ACCESS_ACTUATOR_SERVO)
  return "SERVO";
#else
  return "VIRTUAL";
#endif
}

std::string jsonString(JsonVariantConst value) {
  const char* text = value.as<const char*>();
  return text == nullptr ? "" : text;
}

SessionStatus parseStatus(const char* status) {
  if (!status) return SessionStatus::INVALID;
  if (strcmp(status, "PENDING") == 0) return SessionStatus::PENDING;
  if (strcmp(status, "VERIFYING") == 0) return SessionStatus::VERIFYING;
  if (strcmp(status, "ALLOWED") == 0) return SessionStatus::ALLOWED;
  if (strcmp(status, "DENIED") == 0) return SessionStatus::DENIED;
  if (strcmp(status, "EXPIRED") == 0) return SessionStatus::EXPIRED;
  return SessionStatus::INVALID;
}

bool splitPair(const String& value, std::string& left, std::string& right) {
  const int separator = value.indexOf('|');
  if (separator <= 0) return false;
  left = value.substring(0, separator).c_str();
  right = value.substring(separator + 1).c_str();
  return !left.empty() && !right.empty();
}

}  // namespace

void SerialRfidReader::begin() {
  Serial.println("RFID adapter: serial fixture. Enter RFID:<HEX_UID>");
}

bool SerialRfidReader::readUid(std::string& normalizedUid) {
  if (!Serial.available()) return false;
  String value = Serial.readStringUntil('\n');
  value.trim();
  if (!value.startsWith("RFID:")) return false;
  value.remove(0, 5);
  value.replace(" ", "");
  value.replace(":", "");
  value.toUpperCase();
  if (value.length() < 4 || value.length() > 64) return false;
  for (unsigned int index = 0; index < value.length(); ++index) {
    const char character = value[index];
    if (!isxdigit(static_cast<unsigned char>(character))) return false;
  }
  normalizedUid = value.c_str();
  return true;
}

#if defined(ACCESS_RFID_MFRC522)
Mfrc522Reader::Mfrc522Reader() : reader_(ACCESS_PIN_RFID_SS, ACCESS_PIN_RFID_RST) {}
void Mfrc522Reader::begin() { SPI.begin(); reader_.PCD_Init(); }
bool Mfrc522Reader::readUid(std::string& normalizedUid) {
  if (!reader_.PICC_IsNewCardPresent() || !reader_.PICC_ReadCardSerial()) return false;
  normalizedUid.clear();
  static const char hex[] = "0123456789ABCDEF";
  for (byte index = 0; index < reader_.uid.size; ++index) {
    const byte value = reader_.uid.uidByte[index];
    normalizedUid.push_back(hex[value >> 4]);
    normalizedUid.push_back(hex[value & 0x0F]);
  }
  reader_.PICC_HaltA();
  reader_.PCD_StopCrypto1();
  return !normalizedUid.empty();
}
#endif

void TimedFakeActuator::begin() { forceClosed(); }
bool TimedFakeActuator::start(uint32_t duration, uint32_t nowMs) {
  if (running_) return false;
  running_ = true;
  closeAtMs_ = nowMs + duration;
  Serial.println("ACTUATOR: OPEN (fixture)");
  return true;
}
ActuatorProgress TimedFakeActuator::tick(uint32_t nowMs) {
  if (!running_) return ActuatorProgress::IDLE;
  if (static_cast<int32_t>(nowMs - closeAtMs_) < 0) return ActuatorProgress::RUNNING;
  forceClosed();
  return ActuatorProgress::COMPLETE;
}
void TimedFakeActuator::forceClosed() {
  if (running_) Serial.println("ACTUATOR: CLOSED (fixture)");
  running_ = false;
}

#if defined(ACCESS_ACTUATOR_RELAY)
void RelayActuator::begin() {
  pinMode(ACCESS_PIN_ACTUATOR, OUTPUT);
  forceClosed();
}
bool RelayActuator::start(uint32_t duration, uint32_t nowMs) {
  if (running_) return false;
  digitalWrite(ACCESS_PIN_ACTUATOR, ACCESS_RELAY_ACTIVE_HIGH ? HIGH : LOW);
  closeAtMs_ = nowMs + duration;
  running_ = true;
  return true;
}
ActuatorProgress RelayActuator::tick(uint32_t nowMs) {
  if (!running_) return ActuatorProgress::IDLE;
  if (static_cast<int32_t>(nowMs - closeAtMs_) < 0) return ActuatorProgress::RUNNING;
  forceClosed();
  return ActuatorProgress::COMPLETE;
}
void RelayActuator::forceClosed() {
  digitalWrite(ACCESS_PIN_ACTUATOR, ACCESS_RELAY_ACTIVE_HIGH ? LOW : HIGH);
  running_ = false;
}
#endif

#if defined(ACCESS_ACTUATOR_SERVO)
void ServoActuator::begin() { servo_.setPeriodHertz(50); servo_.attach(ACCESS_PIN_ACTUATOR, 500, 2400); forceClosed(); }
bool ServoActuator::start(uint32_t duration, uint32_t nowMs) {
  if (running_) return false;
  servo_.write(ACCESS_SERVO_OPEN_DEGREES);
  running_ = true;
  closeAtMs_ = nowMs + duration;
  return true;
}
ActuatorProgress ServoActuator::tick(uint32_t nowMs) {
  if (!running_) return ActuatorProgress::IDLE;
  if (static_cast<int32_t>(nowMs - closeAtMs_) < 0) return ActuatorProgress::RUNNING;
  forceClosed();
  return ActuatorProgress::COMPLETE;
}
void ServoActuator::forceClosed() { servo_.write(ACCESS_SERVO_CLOSED_DEGREES); running_ = false; }
#endif

#if defined(ACCESS_DOOR_SENSOR_REED)
void ReedSwitchSensor::begin() { pinMode(ACCESS_PIN_DOOR_SENSOR, INPUT_PULLUP); }
bool ReedSwitchSensor::openedDuringActuation() const {
  return digitalRead(ACCESS_PIN_DOOR_SENSOR) == (ACCESS_SENSOR_OPEN_HIGH ? HIGH : LOW);
}
#endif

void SerialIndicator::show(Signal signal, const std::string& detail) {
  Serial.printf("SIGNAL=%d", static_cast<int>(signal));
  if (!detail.empty()) Serial.printf(" detail=%s", detail.c_str());
  Serial.println();
}

#if defined(ACCESS_INDICATOR_LED) || defined(ACCESS_INDICATOR_BUZZER)
void GpioIndicator::begin() {
#if defined(ACCESS_INDICATOR_LED)
  pinMode(ACCESS_PIN_LED, OUTPUT);
#endif
#if defined(ACCESS_INDICATOR_BUZZER)
  pinMode(ACCESS_PIN_BUZZER, OUTPUT);
#endif
}
void GpioIndicator::show(Signal signal, const std::string&) {
  const bool success = signal == Signal::ALLOWED || signal == Signal::READY;
  const bool alert = signal == Signal::DENIED || signal == Signal::COMMAND_REJECTED ||
                     signal == Signal::ACTUATION_FAILED;
#if defined(ACCESS_INDICATOR_LED)
  digitalWrite(ACCESS_PIN_LED, success ? HIGH : LOW);
#endif
#if defined(ACCESS_INDICATOR_BUZZER)
  digitalWrite(ACCESS_PIN_BUZZER, alert ? HIGH : LOW);
#endif
}
#endif

NvsCommandStore::NvsCommandStore() { healthy_ = preferences_.begin("access-device", false); }
NvsCommandStore::~NvsCommandStore() { preferences_.end(); }

bool NvsCommandStore::loadPendingRequest(PendingRequest& request) {
  const String value = preferences_.getString("request", "");
  return splitPair(value, request.uid, request.requestId);
}
bool NvsCommandStore::savePendingRequest(const PendingRequest& request) {
  const String value = String(request.uid.c_str()) + '|' + request.requestId.c_str();
  return preferences_.putString("request", value) == value.length();
}
void NvsCommandStore::clearPendingRequest() { preferences_.remove("request"); }

bool NvsCommandStore::reserveCommand(const ActuationCommand& command) {
  String seen = preferences_.getString("seen", "|");
  const String marker = String("|") + command.commandId.c_str() + '|';
  if (seen.indexOf(marker) >= 0) return false;
  seen += command.commandId.c_str();
  seen += '|';
  if (seen.length() > 1500) seen.remove(0, seen.indexOf('|', 500));
  if (preferences_.putString("seen", seen) != seen.length()) return false;
  const String active = String(command.commandId.c_str()) + '|' + command.sessionId.c_str();
  return preferences_.putString("active", active) == active.length();
}

bool NvsCommandStore::queueAcknowledgement(const Acknowledgement& acknowledgement) {
  JsonDocument document;
  document["commandId"] = acknowledgement.commandId;
  document["sessionId"] = acknowledgement.sessionId;
  document["status"] = executionStatusName(acknowledgement.executionStatus);
  document["timestamp"] = acknowledgement.timestampEpochMs;
  document["errorCode"] = acknowledgement.errorCode;
  String value;
  serializeJson(document, value);
  return preferences_.putString("ack", value) == value.length();
}

bool NvsCommandStore::loadPendingAcknowledgement(Acknowledgement& acknowledgement) {
  const String value = preferences_.getString("ack", "");
  if (value.isEmpty()) return false;
  JsonDocument document;
  if (deserializeJson(document, value)) return false;
  acknowledgement.commandId = jsonString(document["commandId"]);
  acknowledgement.sessionId = jsonString(document["sessionId"]);
  const char* status = document["status"] | "UNKNOWN";
  acknowledgement.executionStatus = strcmp(status, "CONFIRMED") == 0
                                        ? ExecutionStatus::CONFIRMED
                                    : strcmp(status, "APPLIED_UNCONFIRMED") == 0
                                        ? ExecutionStatus::APPLIED_UNCONFIRMED
                                    : strcmp(status, "FAILED") == 0 ? ExecutionStatus::FAILED
                                                                    : ExecutionStatus::UNKNOWN;
  acknowledgement.timestampEpochMs = document["timestamp"] | 0ULL;
  acknowledgement.errorCode = jsonString(document["errorCode"]);
  return !acknowledgement.commandId.empty() && !acknowledgement.sessionId.empty();
}

void NvsCommandStore::markAcknowledged(const std::string&) {
  preferences_.remove("ack");
  preferences_.remove("active");
}

void NvsCommandStore::recoverInterrupted(uint64_t nowEpochMs) {
  if (preferences_.isKey("ack")) return;
  std::string commandId;
  std::string sessionId;
  if (!splitPair(preferences_.getString("active", ""), commandId, sessionId)) return;
  queueAcknowledgement(
      {commandId, sessionId, ExecutionStatus::UNKNOWN, nowEpochMs, "RESTART_DURING_ACTUATION"});
}

EspHttpNetworkClient::EspHttpNetworkClient(const char* ssid, const char* password,
                                           const char* baseUrl, const char* deviceCode,
                                           const char* token)
    : ssid_(ssid),
      password_(password),
      baseUrl_(baseUrl),
      deviceCode_(deviceCode),
      token_(token) {}

void EspHttpNetworkClient::begin() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid_, password_);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
}
bool EspHttpNetworkClient::connected() const { return WiFi.status() == WL_CONNECTED; }
void EspHttpNetworkClient::maintain(uint32_t nowMs) {
  if (connected()) {
    connectBackoffMs_ = 500;
    return;
  }
  if (nowMs < nextConnectAtMs_) return;
  WiFi.disconnect();
  WiFi.begin(ssid_, password_);
  nextConnectAtMs_ = nowMs + connectBackoffMs_;
  connectBackoffMs_ = std::min(connectBackoffMs_ * 2, 30000U);
}
bool EspHttpNetworkClient::clockSynchronized() const { return time(nullptr) > 1700000000; }
uint64_t EspHttpNetworkClient::epochMs() const {
  struct timeval value {};
  gettimeofday(&value, nullptr);
  return static_cast<uint64_t>(value.tv_sec) * 1000 + value.tv_usec / 1000;
}
int EspHttpNetworkClient::rssi() const { return connected() ? WiFi.RSSI() : -120; }

void EspHttpNetworkClient::addHeaders(HTTPClient& http) const {
  http.addHeader("Authorization", String("Bearer ") + token_);
  http.addHeader(access_contract::kDeviceCodeHeader, deviceCode_);
  http.addHeader(access_contract::kVersionHeader, access_contract::kVersion);
  http.addHeader("Content-Type", "application/json");
}
String EspHttpNetworkClient::endpoint(const char* path) const {
  return String(baseUrl_) + path;
}

bool EspHttpNetworkClient::sendHeartbeat(const Heartbeat& heartbeat) {
  HTTPClient http;
  http.begin(endpoint(access_contract::kHeartbeatPath));
  http.setTimeout(2000);
  addHeaders(http);
  const char* responseHeaders[] = {access_contract::kDeviceIdHeader};
  http.collectHeaders(responseHeaders, 1);
  JsonDocument document;
  document["deviceCode"] = heartbeat.deviceCode;
  document["timestamp"] = isoTimestamp(heartbeat.timestampEpochMs);
  document["firmwareVersion"] = heartbeat.firmwareVersion;
  document["uptimeSeconds"] = heartbeat.uptimeSeconds;
  document["rssi"] = heartbeat.rssi;
  document["resetReason"] = heartbeat.resetReason;
  document["capabilities"]["rfid"] = true;
  document["capabilities"]["actuator"] = actuatorCapability();
  document["capabilities"]["doorSensor"] = heartbeat.hasDoorSensor;
  document["capabilities"]["indicators"] = true;
  String body;
  serializeJson(document, body);
  const int status = http.POST(body);
  if (status == 204) deviceId_ = http.header(access_contract::kDeviceIdHeader).c_str();
  http.end();
  return status == 204 && !deviceId_.empty();
}

bool EspHttpNetworkClient::createSession(const PendingRequest& request,
                                         SessionResponse& response) {
  HTTPClient http;
  http.begin(endpoint(access_contract::kAccessSessionsPath));
  http.setTimeout(3000);
  addHeaders(http);
  JsonDocument document;
  document["deviceCode"] = deviceCode_;
  document["requestId"] = request.requestId;
  document["timestamp"] = isoTimestamp(epochMs());
  document["rfidUid"] = request.uid;
  document["firmwareVersion"] = FIRMWARE_VERSION;
  String body;
  serializeJson(document, body);
  const int status = http.POST(body);
  const String responseBody = http.getString();
  http.end();
  return status == 200 || status == 202 ? parseSession(responseBody, response) : false;
}

bool EspHttpNetworkClient::pollSession(const std::string& sessionId, SessionResponse& response) {
  String path = access_contract::kAccessSessionByIdPath;
  path.replace("{sessionId}", sessionId.c_str());
  HTTPClient http;
  http.begin(endpoint(path.c_str()));
  http.setTimeout(2000);
  addHeaders(http);
  const int status = http.GET();
  const String body = http.getString();
  http.end();
  return status == 200 && parseSession(body, response);
}

bool EspHttpNetworkClient::acknowledge(const Acknowledgement& acknowledgement) {
  String path = access_contract::kAcknowledgeCommandPath;
  path.replace("{sessionId}", acknowledgement.sessionId.c_str());
  HTTPClient http;
  http.begin(endpoint(path.c_str()));
  http.setTimeout(2000);
  addHeaders(http);
  JsonDocument document;
  document["commandId"] = acknowledgement.commandId;
  document["executionStatus"] = executionStatusName(acknowledgement.executionStatus);
  document["timestamp"] = isoTimestamp(acknowledgement.timestampEpochMs);
  if (!acknowledgement.errorCode.empty()) document["errorCode"] = acknowledgement.errorCode;
  String body;
  serializeJson(document, body);
  const int status = http.POST(body);
  http.end();
  return status == 204;
}

bool EspHttpNetworkClient::parseSession(const String& body, SessionResponse& response) const {
  JsonDocument document;
  if (deserializeJson(document, body)) return false;
  response.sessionId = jsonString(document["sessionId"]);
  response.correlationId = jsonString(document["correlationId"]);
  response.status = parseStatus(document["status"]);
  response.expiresAtEpochMs = parseTimestamp(document["expiresAt"]);
  response.reasonCode = jsonString(document["reasonCode"]);
  response.hasCommand = document["command"].is<JsonObject>();
  if (response.hasCommand) {
    const JsonObject command = document["command"];
    response.command.commandId = jsonString(command["commandId"]);
    response.command.sessionId = jsonString(command["sessionId"]);
    response.command.deviceId = jsonString(command["deviceId"]);
    response.command.expiresAtEpochMs = parseTimestamp(command["expiresAt"]);
    response.command.openDurationMs = command["openDurationMs"] | 0;
  }
  return !response.sessionId.empty() && response.status != SessionStatus::INVALID;
}

}  // namespace access_device
