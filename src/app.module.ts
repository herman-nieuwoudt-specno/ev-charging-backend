import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OcppGateway } from './ocpp/ocpp.gateway';
import { ChargingController } from './charging/charging.controller';

@Module({
  imports: [],
  controllers: [AppController, ChargingController],
  providers: [AppService, OcppGateway],
})
export class AppModule {}
