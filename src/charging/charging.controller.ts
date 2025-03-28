import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { OcppGateway } from 'src/ocpp/ocpp.gateway';

@Controller('charging')
export class ChargingController {
  constructor(private readonly ocppGateway: OcppGateway) {}

  @Post(':id/start')
  startCharging(@Param('id') id: string, @Body() data: { idTag: string }) {
    const command = JSON.stringify([
      2,
      'start_' + Date.now(),
      'RemoteStartTransaction',
      { idTag: data.idTag },
    ]);
    this.ocppGateway.sendMessageToCharger(command, id);
    return { message: `Start command sent to ${id}` };
  }

  @Post(':id/stop')
  stopCharging(
    @Param('id') id: string,
    @Body() data: { transactionId: string },
  ) {
    const command = JSON.stringify([
      2,
      'stop_' + Date.now(),
      'RemoteStopTransaction',
      { transactionId: data.transactionId },
    ]);
    this.ocppGateway.sendMessageToCharger(command, id);
    return { message: `Stop command sent to ${id}` };
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.ocppGateway.getStatusForCharger(id);
  }
}
