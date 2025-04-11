import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { OcppGateway } from 'src/ocpp/ocpp.gateway';

@Controller('charging')
export class ChargingController {
  constructor(private readonly ocppGateway: OcppGateway) {}

  @Post(':id/start')
  startCharging(
    @Param('id') id: string,
    @Body() data: { idTag: string; connectorId: number },
  ) {
    const messageId = 'start_' + Date.now();
    const command = [
      2,
      messageId,
      'RemoteStartTransaction',
      {
        connectorId: data.connectorId,
        idTag: data.idTag,
      },
    ];

    this.ocppGateway.sendMessageToCharger(JSON.stringify(command), id);
    return {
      message: `▶️ Sent RemoteStartTransaction to charger ${id}`,
      messageId,
    };
  }

  @Post(':id/stop')
  stopCharging(
    @Param('id') id: string,
    @Body() body: { transactionId: string },
  ) {
    const { transactionId } = body;

    if (!transactionId) {
      return { error: `⚠️ No active transaction found for charger ${id}` };
    }

    const messageId = 'stop_' + Date.now();
    const command = [2, messageId, 'RemoteStopTransaction', { transactionId }];

    this.ocppGateway.sendMessageToCharger(JSON.stringify(command), id);
    return {
      message: `⛔️ Sent RemoteStopTransaction to charger ${id}`,
      transactionId,
      messageId,
    };
  }

  @Get(':id/diagnose')
  diagnoseCharger(@Param('id') id: string) {
    const trigger = [
      2,
      'trigger_' + Date.now(),
      'TriggerMessage',
      {
        requestedMessage: 'StatusNotification',
        connectorId: 2,
      },
    ];
    this.ocppGateway.sendMessageToCharger(JSON.stringify(trigger), id);

    const status = this.ocppGateway.getStatusForCharger(id);
    return {
      ...status,
      diagnosis: this.getDiagnosis(status),
    };
  }

  private getDiagnosis(state: any) {
    if (!state) return 'No connection';
    switch (state.chargerStatus) {
      case 'Available':
        return 'Vehicle not connected';
      case 'Preparing':
        return 'Waiting to start charging';
      case 'Charging':
        return 'Charging in progress';
      case 'Finishing':
        return 'Charge complete, waiting for disconnect';
      case 'SuspendedEV':
        return 'Suspended by EV';
      case 'SuspendedEVSE':
        return 'Suspended by charger';
      default:
        return `State: ${state.chargerStatus}`;
    }
  }

  @Get(':id/meters')
  getMeterValues(@Param('id') id: string) {
    const values = this.ocppGateway.getMeterValuesForCharger(id);
    return values || { message: '⚠️ No recent meter values reported.' };
  }

  @Post(':id/ocpp')
  sendRawOcppMessage(@Param('id') id: string, @Body() data: { message: any }) {
    const raw = JSON.stringify(data.message);
    this.ocppGateway.sendMessageToCharger(raw, id);
    return { message: '📤 Sent raw OCPP message', raw: data.message };
  }

  @Post(':id/trigger/meter')
  triggerMeterValues(@Param('id') id: string) {
    const message = [
      2,
      'trigger_' + Date.now(),
      'TriggerMessage',
      {
        requestedMessage: 'MeterValues',
        connectorId: 2, // adjust if needed
      },
    ];

    this.ocppGateway.sendMessageToCharger(JSON.stringify(message), id);

    return {
      message: `📡 Triggered MeterValues for charger ${id}`,
      messageId: message[1],
    };
  }
}
