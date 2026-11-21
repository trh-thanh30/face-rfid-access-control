import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { LoginUseCase } from "./use-cases/login.use-case";

@Controller("auth")
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }
}
