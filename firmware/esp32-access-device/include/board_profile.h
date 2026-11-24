#pragma once

// Hardware GPIO must be supplied by a reviewed PlatformIO environment.
// This file intentionally contains no default pin numbers.
#if defined(ACCESS_RFID_MFRC522) && (!defined(ACCESS_PIN_RFID_SS) || !defined(ACCESS_PIN_RFID_RST))
#error "MFRC522 profile requires ACCESS_PIN_RFID_SS and ACCESS_PIN_RFID_RST"
#endif

#if defined(ACCESS_ACTUATOR_RELAY) && !defined(ACCESS_PIN_ACTUATOR)
#error "Relay profile requires ACCESS_PIN_ACTUATOR"
#endif

#if defined(ACCESS_ACTUATOR_SERVO) && !defined(ACCESS_PIN_ACTUATOR)
#error "Servo profile requires ACCESS_PIN_ACTUATOR"
#endif

#if defined(ACCESS_ACTUATOR_SERVO) && (!defined(ACCESS_SERVO_OPEN_DEGREES) || !defined(ACCESS_SERVO_CLOSED_DEGREES))
#error "Servo profile requires open and closed angles"
#endif

#if defined(ACCESS_ACTUATOR_RELAY) && !defined(ACCESS_RELAY_ACTIVE_HIGH)
#error "Relay profile requires ACCESS_RELAY_ACTIVE_HIGH"
#endif

#if defined(ACCESS_DOOR_SENSOR_REED) && !defined(ACCESS_PIN_DOOR_SENSOR)
#error "Door sensor profile requires ACCESS_PIN_DOOR_SENSOR"
#endif

#if defined(ACCESS_DOOR_SENSOR_REED) && !defined(ACCESS_SENSOR_OPEN_HIGH)
#error "Door sensor profile requires ACCESS_SENSOR_OPEN_HIGH"
#endif

#if defined(ACCESS_INDICATOR_LED) && !defined(ACCESS_PIN_LED)
#error "LED indicator profile requires ACCESS_PIN_LED"
#endif


#if defined(ACCESS_INDICATOR_BUZZER) && !defined(ACCESS_PIN_BUZZER)
#error "Buzzer indicator profile requires ACCESS_PIN_BUZZER"
#endif
