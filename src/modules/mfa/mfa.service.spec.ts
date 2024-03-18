import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MfaService],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
