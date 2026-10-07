import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./orders.dto";
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}
  listForUser(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, include: { items: true }, orderBy: { createdAt: "desc" } });
  }
  async create(userId: string, dto: CreateOrderDto) {
    const [user, settings, menuItems] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.restaurantSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } }),
      this.prisma.menuItem.findMany({ where: { id: { in: dto.items.map((i) => i.menuItemId) }, isAvailable: true } }),
    ]);
    if (!user) throw new NotFoundException("User not found");
    if (!user.phone || user.phone.replace(/\D/g, "").length < 10) throw new BadRequestException("Add a valid phone number to your profile before ordering");
    if (!settings.acceptingOrders) throw new BadRequestException("Ember Kitchen is not accepting orders right now");
    if (dto.fulfillment === "DELIVERY" && (!dto.address || dto.address.trim().length < 8)) throw new BadRequestException("A delivery address is required");
    const byId = new Map(menuItems.map((item) => [item.id, item]));
    let subtotal = 0;
    const itemRows = dto.items.map((input) => {
      const item = byId.get(input.menuItemId);
      if (!item) throw new BadRequestException("One or more menu items are unavailable");
      const unit = Number(item.price);
      const extraPrice = input.extra ? Number(item.extraPrice) : 0;
      subtotal += (unit + extraPrice) * input.quantity;
      return { menuItemId: item.id, name: item.name, unitPrice: unit, quantity: input.quantity, extraName: input.extra ? item.extraName : null, extraPrice, note: input.note?.trim() || null };
    });
    if (subtotal < Number(settings.minimumOrder)) throw new BadRequestException(`Minimum order is R${Number(settings.minimumOrder).toFixed(2)}`);
    const deliveryFee = dto.fulfillment === "DELIVERY" ? Number(settings.deliveryFee) : 0;
    const total = subtotal + deliveryFee;
    const orderNumber = `EK-${Date.now().toString().slice(-6)}${randomBytes(1).toString("hex").toUpperCase()}`;
    return this.prisma.order.create({
      data: {
        orderNumber, userId, fulfillment: dto.fulfillment, subtotal, deliveryFee, total,
        deliveryName: user.name, deliveryPhone: user.phone ?? "Not provided", address: dto.fulfillment === "DELIVERY" ? dto.address!.trim() : null,
        notes: dto.notes?.trim() || null, items: { create: itemRows },
      },
      include: { items: true },
    });
  }
}
