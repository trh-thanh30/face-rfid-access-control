import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type AccessReasonCode,
  type CreateAccessGrantInput,
  type ListAccessGrantsQuery,
  type UpdateAccessGrantInput,
} from "@access/shared";
import {
  PERSON_REPOSITORY,
  type PersonRepository,
} from "../../people/repository/person.repository.interface";
import {
  isAccessWindowDefinitionValid,
  isAccessWindowOpen,
} from "../domain/access-window";
import {
  InvalidRfidUidError,
  RfidIdentityService,
} from "../domain/rfid-identity";
import {
  ACCESS_GRANT_REPOSITORY,
  ActiveRfidUidConflictError,
  RFID_CREDENTIAL_REPOSITORY,
  type AccessGrantRepository,
  type RfidCredentialRepository,
} from "../repository/access-management.repository.interface";

@Injectable()
export class AttachRfidCredentialUseCase {
  constructor(
    @Inject(PERSON_REPOSITORY) private readonly people: PersonRepository,
    @Inject(RFID_CREDENTIAL_REPOSITORY)
    private readonly credentials: RfidCredentialRepository,
    private readonly identity: RfidIdentityService,
  ) {}

  async execute(personId: string, uid: string, replaceExisting: boolean) {
    const person = await this.people.findById(personId);
    if (!person) throw new NotFoundException("PERSON_NOT_FOUND");
    if (person.status !== "ACTIVE") {
      throw new ConflictException("PERSON_DISABLED");
    }

    try {
      const identity = this.identity.identify(uid);
      return await this.credentials.attach({
        personId,
        ...identity,
        replaceExisting,
      });
    } catch (error) {
      if (error instanceof InvalidRfidUidError) {
        throw new BadRequestException("INVALID_RFID_UID");
      }
      if (error instanceof ActiveRfidUidConflictError) {
        throw new ConflictException("RFID_UID_ALREADY_ACTIVE");
      }
      throw error;
    }
  }

  async list(personId: string) {
    const person = await this.people.findById(personId);
    if (!person) throw new NotFoundException("PERSON_NOT_FOUND");
    return this.credentials.listForPerson(personId);
  }
}

@Injectable()
export class RevokeRfidCredentialUseCase {
  constructor(
    @Inject(RFID_CREDENTIAL_REPOSITORY)
    private readonly credentials: RfidCredentialRepository,
  ) {}
  async execute(id: string) {
    const credential = await this.credentials.revoke(id);
    if (!credential) throw new NotFoundException("RFID_CREDENTIAL_NOT_FOUND");
    return credential;
  }
}

abstract class AccessGrantUseCaseBase {
  constructor(
    protected readonly people: PersonRepository,
    protected readonly grants: AccessGrantRepository,
  ) {}

  protected async assertReferences(personId: string, accessPointId: string) {
    const [person, accessPointExists] = await Promise.all([
      this.people.findById(personId),
      this.grants.accessPointExists(accessPointId),
    ]);
    if (!person) throw new NotFoundException("PERSON_NOT_FOUND");
    if (!accessPointExists)
      throw new NotFoundException("ACCESS_POINT_NOT_FOUND");
  }
}

@Injectable()
export class CreateAccessGrantUseCase extends AccessGrantUseCaseBase {
  constructor(
    @Inject(PERSON_REPOSITORY) people: PersonRepository,
    @Inject(ACCESS_GRANT_REPOSITORY) grants: AccessGrantRepository,
  ) {
    super(people, grants);
  }
  async execute(input: CreateAccessGrantInput) {
    await this.assertReferences(input.personId, input.accessPointId);
    return this.grants.create(input);
  }
}

@Injectable()
export class UpdateAccessGrantUseCase extends AccessGrantUseCaseBase {
  constructor(
    @Inject(PERSON_REPOSITORY) people: PersonRepository,
    @Inject(ACCESS_GRANT_REPOSITORY) grants: AccessGrantRepository,
  ) {
    super(people, grants);
  }
  async execute(id: string, input: UpdateAccessGrantInput) {
    const current = await this.grants.findById(id);
    if (!current) throw new NotFoundException("ACCESS_GRANT_NOT_FOUND");
    if (current.status === "REVOKED") {
      throw new ConflictException("ACCESS_GRANT_REVOKED");
    }
    const merged = {
      validFrom: input.validFrom ?? current.validFrom,
      validUntil: input.validUntil ?? current.validUntil,
      timeFrom: input.timeFrom ?? current.timeFrom,
      timeUntil: input.timeUntil ?? current.timeUntil,
      timezone: input.timezone ?? current.timezone,
    };
    if (!isAccessWindowDefinitionValid(merged))
      throw new BadRequestException("INVALID_ACCESS_GRANT_WINDOW");
    return this.grants.update(id, input);
  }
}

@Injectable()
export class RevokeAccessGrantUseCase extends AccessGrantUseCaseBase {
  constructor(
    @Inject(PERSON_REPOSITORY) people: PersonRepository,
    @Inject(ACCESS_GRANT_REPOSITORY) grants: AccessGrantRepository,
  ) {
    super(people, grants);
  }
  async execute(id: string) {
    const grant = await this.grants.revoke(id);
    if (!grant) throw new NotFoundException("ACCESS_GRANT_NOT_FOUND");
    return grant;
  }
}

@Injectable()
export class GetAccessGrantUseCase extends AccessGrantUseCaseBase {
  constructor(
    @Inject(PERSON_REPOSITORY) people: PersonRepository,
    @Inject(ACCESS_GRANT_REPOSITORY) grants: AccessGrantRepository,
  ) {
    super(people, grants);
  }
  async execute(id: string) {
    const grant = await this.grants.findById(id);
    if (!grant) throw new NotFoundException("ACCESS_GRANT_NOT_FOUND");
    return grant;
  }
}

@Injectable()
export class ListAccessGrantsUseCase extends AccessGrantUseCaseBase {
  constructor(
    @Inject(PERSON_REPOSITORY) people: PersonRepository,
    @Inject(ACCESS_GRANT_REPOSITORY) grants: AccessGrantRepository,
  ) {
    super(people, grants);
  }
  execute(query: ListAccessGrantsQuery) {
    return this.grants.list(query);
  }
}

export type AccessEligibilityResult = {
  allowed: boolean;
  reasonCode?: AccessReasonCode;
  personId?: string;
  credentialId?: string;
  grantId?: string;
};

@Injectable()
export class CheckAccessEligibilityUseCase {
  constructor(
    @Inject(RFID_CREDENTIAL_REPOSITORY)
    private readonly credentials: RfidCredentialRepository,
    @Inject(ACCESS_GRANT_REPOSITORY)
    private readonly grants: AccessGrantRepository,
    private readonly identity: RfidIdentityService,
  ) {}

  async execute(input: {
    uid: string;
    accessPointId: string;
    occurredAt: Date;
  }): Promise<AccessEligibilityResult> {
    let uidHash: string;
    try {
      uidHash = this.identity.identify(input.uid).uidHash;
    } catch (error) {
      if (error instanceof InvalidRfidUidError) {
        return { allowed: false, reasonCode: "UNKNOWN_CARD" };
      }
      throw error;
    }
    const credential = await this.credentials.findLatestByUidHash(uidHash);
    if (!credential) return { allowed: false, reasonCode: "UNKNOWN_CARD" };
    if (credential.status !== "ACTIVE") {
      return {
        allowed: false,
        reasonCode: "CARD_DISABLED",
        credentialId: credential.id,
        personId: credential.personId,
      };
    }
    if (credential.personStatus !== "ACTIVE") {
      return {
        allowed: false,
        reasonCode: "PERSON_DISABLED",
        credentialId: credential.id,
        personId: credential.personId,
      };
    }
    const grants = await this.grants.findActiveForPersonAtPoint(
      credential.personId,
      input.accessPointId,
    );
    if (grants.length === 0) {
      return {
        allowed: false,
        reasonCode: "NO_PERMISSION",
        credentialId: credential.id,
        personId: credential.personId,
      };
    }
    const grant = grants.find((candidate) =>
      isAccessWindowOpen(candidate, input.occurredAt),
    );
    if (!grant) {
      return {
        allowed: false,
        reasonCode: "OUTSIDE_ALLOWED_TIME",
        credentialId: credential.id,
        personId: credential.personId,
      };
    }
    return {
      allowed: true,
      credentialId: credential.id,
      personId: credential.personId,
      grantId: grant.id,
    };
  }
}
