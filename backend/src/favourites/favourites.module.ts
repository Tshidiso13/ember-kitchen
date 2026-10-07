import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FavouritesController } from "./favourites.controller";
@Module({ imports: [AuthModule], controllers: [FavouritesController] })
export class FavouritesModule {}
