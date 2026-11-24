# WP09 fault matrix evidence

Ngày cập nhật: 2026-11-24. `Automated` nghĩa là test tái lập trong repo; không thay thế bench test ESP32/nguồn.

| Failure                               | Expected invariant                                     | Evidence                                                | Trạng thái                   |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | ---------------------------- |
| API/network unavailable               | Không actuation, `NETWORK_ERROR`                       | `apps/device-simulator/test/state-machine.test.mjs`     | Automated                    |
| Vision timeout/offline                | `DENIED/INTERNAL_ERROR`, không command                 | `create-session.spec.ts`, `fake-face-verifier.spec.ts`  | Automated                    |
| Camera concurrent/busy                | Một capture giữ camera; request cạnh tranh fail closed | `fake-face-verifier.spec.ts`                            | Automated                    |
| Duplicate create                      | Một session, một Vision call, một command              | `create-session.spec.ts`                                | Automated                    |
| Duplicate poll                        | Cùng command ID/payload                                | `create-session.spec.ts`                                | Automated                    |
| Duplicate/conflicting ACK             | Same payload idempotent; payload khác conflict         | `acknowledge-command.spec.ts` và repository transaction | Automated/unit + code review |
| Wrong-device/expired/replayed command | Không actuation                                        | simulator và firmware state-machine tests               | Automated                    |
| Restart sau reserve/actuating         | ACK `UNKNOWN`, không mở lại                            | simulator và firmware state-machine tests               | Automated                    |
| Heartbeat mất/recovery                | Offline theo server clock; heartbeat mới online lại    | `device-presence.spec.ts`                               | Automated                    |
| Không door sensor                     | Chỉ `APPLIED_UNCONFIRMED`                              | API ACK và firmware tests                               | Automated                    |
| Actuator/power/brownout thật          | Decision không đổi; actuation failed/unknown           | `docs/hardware/hardware-selection-and-wiring.md`        | Pending hardware             |

## TC mapping

- TC-06: network-unavailable test của simulator.
- TC-07: Vision timeout/infrastructure và camera-busy tests.
- TC-08: concurrent create, duplicate poll, duplicate ACK và command replay tests.
- TC-09: virtual actuator failure/reboot recovery được tự động hóa; door feedback và power thật vẫn pending.

Không đánh dấu WP09 hoàn tất hoàn toàn cho tới khi TC-09 được chạy trên phần cứng thật và lưu log/video/power evidence.
