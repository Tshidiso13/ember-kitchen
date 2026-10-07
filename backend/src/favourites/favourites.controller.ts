import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, SessionUser } from "../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
@Controller("favourites")
@UseGuards(JwtAuthGuard)
export class FavouritesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.favourite.findMany({ where: { userId: user.id }, include: { menuItem: { include: { category: true } } }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => row.menuItem);
  }
  @Post(":menuItemId") add(@CurrentUser() user: SessionUser, @Param("menuItemId") menuItemId: string) {
    return this.prisma.favourite.upsert({ where: { userId_menuItemId: { userId: user.id, menuItemId } }, update: {}, create: { userId: user.id, menuItemId } });
  }
  @Delete(":menuItemId") remove(@CurrentUser() user: SessionUser, @Param("menuItemId") menuItemId: string) {
    return this.prisma.favourite.deleteMany({ where: { userId: user.id, menuItemId } }).then(() => ({ success: true }));
  }
}
