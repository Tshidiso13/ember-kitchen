import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Controller("settings")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() get() {
    return this.prisma.restaurantSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });
  }
}
