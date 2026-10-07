import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class MenuItemDto {
  @IsString() @MaxLength(100) name!: string;
  @IsString() @MaxLength(1000) description!: string;
  @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @IsString() imageUrl!: string;
  @IsString() categoryId!: string;
  @IsOptional() @IsString() @MaxLength(80) tag?: string;
  @IsOptional() @IsString() @MaxLength(500) allergens?: string;
  @IsOptional() @IsString() @MaxLength(80) extraName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) extraPrice?: number;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}
class UpdateMenuItemDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(80) tag?: string;
  @IsOptional() @IsString() @MaxLength(500) allergens?: string;
  @IsOptional() @IsString() @MaxLength(80) extraName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) extraPrice?: number;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}
class CategoryDto {
  @IsString() @MaxLength(80) name!: string;
  @IsOptional() @Type(() => Number) @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
enum AdminOrderStatus { PENDING="PENDING", CONFIRMED="CONFIRMED", PREPARING="PREPARING", READY="READY", OUT_FOR_DELIVERY="OUT_FOR_DELIVERY", COMPLETED="COMPLETED", CANCELLED="CANCELLED" }
class OrderStatusDto {
  @IsEnum(AdminOrderStatus) status!: AdminOrderStatus;
}
class SettingsDto {
  @IsOptional() @IsString() @MaxLength(100) restaurantName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) deliveryFee?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumOrder?: number;
  @IsOptional() @IsBoolean() acceptingOrders?: boolean;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("dashboard")
  async dashboard() {
    const [orders, customers, menuItems, pending, revenue] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: "CUSTOMER" } }),
      this.prisma.menuItem.count(),
      this.prisma.order.count({ where: { status: { in: ["PENDING","CONFIRMED","PREPARING"] } } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: "COMPLETED" } }),
    ]);
    return { orders, customers, menuItems, pending, completedRevenue: Number(revenue._sum.total ?? 0) };
  }

  @Get("orders")
  orders() { return this.prisma.order.findMany({ include: { user: { select: { id: true, name: true, email: true, phone: true } }, items: true }, orderBy: { createdAt: "desc" } }); }
  @Patch("orders/:id/status")
  updateOrder(@Param("id") id: string, @Body() dto: OrderStatusDto) { return this.prisma.order.update({ where: { id }, data: { status: dto.status }, include: { items: true } }); }

  @Get("menu")
  menu() { return this.prisma.menuItem.findMany({ include: { category: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }); }
  @Post("menu")
  createMenu(@Body() dto: MenuItemDto) { return this.prisma.menuItem.create({ data: { ...dto, extraPrice: dto.extraPrice ?? 0, isAvailable: dto.isAvailable ?? true, isFeatured: dto.isFeatured ?? false } }); }
  @Patch("menu/:id")
  updateMenu(@Param("id") id: string, @Body() dto: UpdateMenuItemDto) { return this.prisma.menuItem.update({ where: { id }, data: dto }); }
  @Delete("menu/:id")
  removeMenu(@Param("id") id: string) { return this.prisma.menuItem.delete({ where: { id } }).then(() => ({ success: true })); }

  @Get("categories")
  categories() { return this.prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }); }
  @Post("categories") createCategory(@Body() dto: CategoryDto) { return this.prisma.category.create({ data: dto }); }
  @Patch("categories/:id") updateCategory(@Param("id") id: string, @Body() dto: CategoryDto) { return this.prisma.category.update({ where: { id }, data: dto }); }

  @Get("customers")
  customers() { return this.prisma.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" } }); }

  @Get("settings")
  settings() { return this.prisma.restaurantSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } }); }
  @Patch("settings")
  updateSettings(@Body() dto: SettingsDto) { return this.prisma.restaurantSettings.upsert({ where: { id: "main" }, create: { id: "main", ...dto }, update: dto }); }
}
