import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(tenant_id: number, user_id: number) {
    return `Hello World! tenant_id: ${tenant_id} user_id: ${user_id}`;
  }
}
