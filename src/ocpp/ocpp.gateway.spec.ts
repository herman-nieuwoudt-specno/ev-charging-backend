import { Test, TestingModule } from '@nestjs/testing';
import { OcppGateway } from './ocpp.gateway';

describe('OcppGateway', () => {
  let gateway: OcppGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OcppGateway],
    }).compile();

    gateway = module.get<OcppGateway>(OcppGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
