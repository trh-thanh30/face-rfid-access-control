#include <Arduino.h>
#include <esp_system.h>
#include <generated/access_contracts.h>

#include "device_state_machine.h"
#include "esp_adapters.h"

#if __has_include("secrets.local.h")
#include "secrets.local.h"
#else
#define ACCESS_WIFI_SSID ""
#define ACCESS_WIFI_PASSWORD ""
#define ACCESS_API_BASE_URL ""
#define ACCESS_DEVICE_CODE ""
#define ACCESS_DEVICE_TOKEN ""
#endif

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "dev"
#endif

using namespace access_device;

DeviceStateMachine* machine = nullptr;

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(25);
  Serial.printf("\nAccess device %s; contract %s\n", FIRMWARE_VERSION, access_contract::kVersion);
  Serial.println("Reliability profile wp09-v1");
  if (strlen(ACCESS_WIFI_SSID) == 0 || strlen(ACCESS_API_BASE_URL) == 0 ||
      strlen(ACCESS_DEVICE_CODE) == 0 || strlen(ACCESS_DEVICE_TOKEN) == 0) {
    Serial.println("FAIL_CLOSED: configure include/secrets.local.h");
    return;
  }
#if defined(ACCESS_RFID_MFRC522)
  static Mfrc522Reader rfid;
#else
  static SerialRfidReader rfid;
#endif
#if defined(ACCESS_ACTUATOR_RELAY)
  static RelayActuator actuator;
#elif defined(ACCESS_ACTUATOR_SERVO)
  static ServoActuator actuator;
#else
  static TimedFakeActuator actuator;
#endif
#if defined(ACCESS_DOOR_SENSOR_REED)
  static ReedSwitchSensor sensor;
#else
  static NoDoorSensor sensor;
#endif
#if defined(ACCESS_INDICATOR_LED) || defined(ACCESS_INDICATOR_BUZZER)
  static GpioIndicator indicator;
#else
  static SerialIndicator indicator;
#endif
  static NvsCommandStore store;
  static EspHttpNetworkClient network(ACCESS_WIFI_SSID, ACCESS_WIFI_PASSWORD,
                                      ACCESS_API_BASE_URL, ACCESS_DEVICE_CODE,
                                      ACCESS_DEVICE_TOKEN);
  // Timing values are locked by reliability profile wp09-v1.
  static DeviceConfig config{ACCESS_DEVICE_CODE, FIRMWARE_VERSION, 10000, 250, 1000,
                             2000, 500, 30000, 1000};
  config.resetReason = std::to_string(static_cast<int>(esp_reset_reason()));
  static DeviceStateMachine runtime(config, rfid, actuator, sensor, indicator, store, network);
  machine = &runtime;
  machine->begin(millis());
}

void loop() {
  if (machine != nullptr) machine->tick(millis());
  yield();
}
