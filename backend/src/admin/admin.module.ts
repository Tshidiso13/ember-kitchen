import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { RolesGuard } from "../common/roles.guard";
@Module({ imports: [AuthModule], controllers: [AdminController], providers: [RolesGuard] })
export class AdminModule {}
