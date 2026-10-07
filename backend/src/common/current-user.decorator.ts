import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type SessionUser = { id: string; email: string; role: "CUSTOMER" | "ADMIN" };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser =>
    context.switchToHttp().getRequest<{ user: SessionUser }>().user,
);
