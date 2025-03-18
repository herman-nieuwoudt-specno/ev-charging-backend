import { Test, TestingModule } from '@nestjs/testing';
import { ChargingController } from './charging.controller';

describe('ChargingController', () => {
  let controller: ChargingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChargingController],
    }).compile();

    controller = module.get<ChargingController>(ChargingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
