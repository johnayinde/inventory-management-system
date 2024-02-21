import { Test, TestingModule } from '@nestjs/testing';
import { FeesService } from './fees.service';

describe('FeesService', () => {
  let service: FeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeesService],
    }).compile();

    service = module.get<FeesService>(FeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
