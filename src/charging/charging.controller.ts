import { Controller, Post, Body } from '@nestjs/common';
import { OcppGateway } from '../ocpp/ocpp.gateway';

@Controller('charging')
export class ChargingController {
  constructor(private readonly ocppGateway: OcppGateway) {} // Inject WebSocket Gateway

  @Post('start')
  startCharging(@Body() data: { idTag: string }) {
    const command = JSON.stringify([
      '2',
      '12345',
      'RemoteStartTransaction',
      { idTag: data.idTag },
    ]);
    this.ocppGateway.sendMessageToCharger(command);
    return { message: 'Start command sent' };
  }

  @Post('stop')
  stopCharging(@Body() data: { transactionId: string }) {
    const command = JSON.stringify([
      '2',
      '12346',
      'RemoteStopTransaction',
      { transactionId: data.transactionId },
    ]);
    this.ocppGateway.sendMessageToCharger(command);
    return { message: 'Stop command sent' };
  }
}
