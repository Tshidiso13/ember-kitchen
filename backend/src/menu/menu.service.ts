import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}
  async list() {
    const [categories, items] = await Promise.all([
      this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      this.prisma.menuItem.findMany({ where: { isAvailable: true, category: { isActive: true } }, include: { category: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    ]);
    return { categories, items };
  }
}
