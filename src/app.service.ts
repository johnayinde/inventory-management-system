import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(tenantId) {
    console.log(tenantId);
    console.log(tenantId + tenantId);
    return 'Hello World!';
  }
}
