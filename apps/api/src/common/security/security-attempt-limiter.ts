import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type Scope = "ADMIN_LOGIN" | "DEVICE_AUTH";
type AttemptState = { failures: number[] };

@Injectable()
export class SecurityAttemptLimiter {
  private readonly logger = new Logger(SecurityAttemptLimiter.name);
  private readonly states = new Map<string, AttemptState>();
  private readonly windowMs: number;
  private readonly limits: Record<Scope, number>;

  constructor(config: ConfigService) {
    this.windowMs =
      config.get<number>("SECURITY_ATTEMPT_WINDOW_SECONDS", 60) * 1000;
    this.limits = {
      ADMIN_LOGIN: config.get<number>("ADMIN_LOGIN_MAX_FAILURES", 5),
      DEVICE_AUTH: config.get<number>("DEVICE_AUTH_MAX_FAILURES", 10),
    };
  }

  assertAllowed(scope: Scope, identifier: string, now = Date.now()): void {
    const failures = this.currentFailures(scope, identifier, now);
    if (failures.length >= this.limits[scope]) {
      throw new HttpException(
        `${scope}_RATE_LIMITED`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(scope: Scope, identifier: string, now = Date.now()): void {
    const key = this.key(scope, identifier);
    if (!this.states.has(key) && this.states.size >= 10_000) {
      this.prune(now);
      const oldestKey = this.states.keys().next().value as string | undefined;
      if (this.states.size >= 10_000 && oldestKey)
        this.states.delete(oldestKey);
    }
    const failures = this.currentFailures(scope, identifier, now);
    failures.push(now);
    this.states.set(key, { failures });
    if (failures.length >= this.limits[scope]) {
      this.logger.warn({
        event: "security_attempt_limit_reached",
        scope,
        failureCount: failures.length,
      });
    }
  }

  recordSuccess(scope: Scope, identifier: string): void {
    this.states.delete(this.key(scope, identifier));
  }

  private currentFailures(scope: Scope, identifier: string, now: number) {
    const key = this.key(scope, identifier);
    const failures = (this.states.get(key)?.failures ?? []).filter(
      (value) => now - value < this.windowMs,
    );
    if (failures.length === 0) this.states.delete(key);
    else this.states.set(key, { failures });
    return failures;
  }

  private key(scope: Scope, identifier: string): string {
    return `${scope}:${identifier.trim().toLowerCase()}`;
  }

  private prune(now: number): void {
    for (const [key, state] of this.states) {
      if (state.failures.every((value) => now - value >= this.windowMs)) {
        this.states.delete(key);
      }
    }
  }
}
