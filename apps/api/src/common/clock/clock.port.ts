import { Injectable } from "@nestjs/common";

export const CLOCK_PORT = Symbol("CLOCK_PORT");

export interface ClockPort {
  now(): Date;
}

@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
