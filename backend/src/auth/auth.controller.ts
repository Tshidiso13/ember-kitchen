import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, SessionUser } from "../common/current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto, RegisterDto } from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register") register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post("login") login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Post("refresh") refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: SessionUser) { return this.auth.logout(user.id); }
}
