import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OcppGateway } from './ocpp/ocpp.gateway';
import { ChargingController } from './charging/charging.controller';
import { ClientGateway } from './client/client.gatway';

@Module({
  imports: [],
  controllers: [AppController, ChargingController],
  providers: [AppService, OcppGateway, ClientGateway],
})
export class AppModule {}
