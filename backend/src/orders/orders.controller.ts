import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, SessionUser } from "../common/current-user.decorator";
import { CreateOrderDto } from "./orders.dto";
import { OrdersService } from "./orders.service";
@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() list(@CurrentUser() user: SessionUser) { return this.orders.listForUser(user.id); }
  @Post() create(@CurrentUser() user: SessionUser, @Body() dto: CreateOrderDto) { return this.orders.create(user.id, dto); }
}
