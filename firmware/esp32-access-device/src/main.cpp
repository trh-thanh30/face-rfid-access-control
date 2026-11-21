#include <Arduino.h>
#include <generated/access_contracts.h>

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "dev"
#endif

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.printf("Access device firmware %s\n", FIRMWARE_VERSION);
  Serial.printf("Access contract %s\n", access_contract::kVersion);
  Serial.println("Week 1 scaffold: no GPIO profile selected yet.");
}

void loop() {
  // Week 5 adds the non-blocking device state machine and hardware adapters.
  delay(1000);
}
