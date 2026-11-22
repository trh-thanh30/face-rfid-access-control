import { createHmac } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RfidIdentityService {
  private readonly key: string;

  constructor(config: ConfigService) {
    this.key = config.getOrThrow<string>("RFID_HASH_KEY");
  }

  canonicalize(uid: string): string {
    const canonical = uid.replace(/[\s:-]/g, "").toUpperCase();
    if (!/^[0-9A-F]{4,64}$/.test(canonical) || canonical.length % 2 !== 0) {
      throw new InvalidRfidUidError();
    }
    return canonical;
  }

  identify(uid: string) {
    const canonical = this.canonicalize(uid);
    return {
      uidHash: createHmac("sha256", this.key).update(canonical).digest("hex"),
      displayHint: `…${canonical.slice(-4)}`,
    };
  }
}

export class InvalidRfidUidError extends Error {
  constructor() {
    super("RFID UID must contain 2-32 hexadecimal bytes");
  }
}
