import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { flatten(): unknown } };

export type RuntimeSchema<T> = {
  safeParse(value: unknown): ParseResult<T>;
};

@Injectable()
export class SchemaValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: RuntimeSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Request validation failed",
        issues: result.error.flatten(),
      });
    }
    return result.data;
  }
}
