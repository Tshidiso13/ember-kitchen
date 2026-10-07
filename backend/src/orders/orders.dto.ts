import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from "class-validator";

enum FulfillmentModeDto { DELIVERY = "DELIVERY", COLLECTION = "COLLECTION" }
class CreateOrderItemDto {
  @IsString() menuItemId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsBoolean() extra?: boolean;
  @IsOptional() @IsString() @MaxLength(160) note?: string;
}
export class CreateOrderDto {
  @IsEnum(FulfillmentModeDto) fulfillment!: "DELIVERY" | "COLLECTION";
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
