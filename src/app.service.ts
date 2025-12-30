import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { OrmService } from './database/orm.service';
import { hashPassword } from '../libs/common/helpers';

@Injectable()
export class AppService implements OnModuleInit {
  private logDir = path.join(process.cwd(), 'logs');

  constructor(private readonly ormService: OrmService) {}

  async onModuleInit() {
    await this.seedDemoData();
  }
  private logDir = path.join(process.cwd(), 'logs');

  async seedDemoData() {
    // Check if demo account exists
    const existingAuth = await this.ormService.auth.findUnique({
      where: { email: 'demo@invio.com' },
    });

    if (existingAuth) {
      console.log('Demo account already exists');
      return;
    }

    console.log('Creating demo account...');

    // Create demo auth
    const hashedPassword = await hashPassword('password123');
    const auth = await this.ormService.auth.create({
      data: {
        email: 'demo@invio.com',
        password: hashedPassword,
        is_super_admin: true,
        email_verified: true,
        first_name: 'Demo',
        last_name: 'User',
      },
    });

    // Create permission
    await this.ormService.permission.create({
      data: {
        dashboard: true,
        customers: true,
        expenses: true,
        inventory: true,
        report: true,
        sales: true,
        product: true,
        settings: true,
        shipment: true,
        auth_id: auth.id,
      },
    });

    // Create tenant
    const tenant = await this.ormService.tenant.create({
      data: {
        email: 'demo@invio.com',
      },
    });

    // Create business
    await this.ormService.business.create({
      data: {
        tenant_id: tenant.id,
        business_name: 'Demo Inventory Business',
        business_type: 'PERSONAL',
        business_address: '123 Demo Street',
        country: 'Demo Country',
      },
    });

    // Create user
    await this.ormService.user.create({
      data: {
        name: 'Demo User',
        email: 'demo@invio.com',
        status: 'active',
        tenant_id: tenant.id,
      },
    });

    // Create some categories
    const category1 = await this.ormService.category.create({
      data: {
        tenant_id: tenant.id,
        name: 'Electronics',
        description: 'Electronic products',
      },
    });

    const category2 = await this.ormService.category.create({
      data: {
        tenant_id: tenant.id,
        name: 'Clothing',
        description: 'Clothing items',
      },
    });

    // Create subcategories
    await this.ormService.subcategory.create({
      data: {
        name: 'Smartphones',
        description: 'Mobile phones',
        category_id: category1.id,
      },
    });

    await this.ormService.subcategory.create({
      data: {
        name: 'Laptops',
        description: 'Portable computers',
        category_id: category1.id,
      },
    });

    // Create products
    const product1 = await this.ormService.product.create({
      data: {
        tenant_id: tenant.id,
        name: 'iPhone 13',
        description: 'Latest smartphone',
        category_id: category1.id,
        status: 'in_stock',
        threshold: 10,
      },
    });

    const product2 = await this.ormService.product.create({
      data: {
        tenant_id: tenant.id,
        name: 'MacBook Pro',
        description: 'High-performance laptop',
        category_id: category1.id,
        status: 'in_stock',
        threshold: 5,
      },
    });

    const product3 = await this.ormService.product.create({
      data: {
        tenant_id: tenant.id,
        name: 'T-Shirt',
        description: 'Cotton t-shirt',
        category_id: category2.id,
        status: 'in_stock',
        threshold: 20,
      },
    });

    // Create inventory for products
    await this.ormService.inventory.create({
      data: {
        prod_id: 'IP13-001',
        name: 'iPhone 13',
        selling_price: 999.99,
        cost_price: 800.00,
        quantity: 50,
        tenant_id: tenant.id,
        product_id: product1.id,
        shipment_id: 1, // Need a shipment? Wait, maybe create a shipment first.
      },
    });

    // For simplicity, maybe skip inventory for now, or create a dummy shipment.

    // Actually, let me check if shipment is required. From the schema, Inventory has shipment_id, so I need to create a shipment first.

    // Let me create a shipment
    const shipment = await this.ormService.shipment.create({
      data: {
        tenant_id: tenant.id,
        shipping_name: 'Initial Stock Shipment',
        date: new Date(),
        note: 'Initial demo stock',
        is_in_inventory: true,
      },
    });

    await this.ormService.inventory.create({
      data: {
        prod_id: 'IP13-001',
        name: 'iPhone 13',
        selling_price: 999.99,
        cost_price: 800.00,
        quantity: 50,
        tenant_id: tenant.id,
        product_id: product1.id,
        shipment_id: shipment.id,
      },
    });

    await this.ormService.inventory.create({
      data: {
        prod_id: 'MBP-001',
        name: 'MacBook Pro',
        selling_price: 1999.99,
        cost_price: 1500.00,
        quantity: 20,
        tenant_id: tenant.id,
        product_id: product2.id,
        shipment_id: shipment.id,
      },
    });

    await this.ormService.inventory.create({
      data: {
        prod_id: 'TS-001',
        name: 'T-Shirt',
        selling_price: 19.99,
        cost_price: 10.00,
        quantity: 100,
        tenant_id: tenant.id,
        product_id: product3.id,
        shipment_id: shipment.id,
      },
    });

    console.log('Demo data seeded successfully');
  }

  private getMostRecentErrorLogFile(): string | null {
    const files = fs.readdirSync(this.logDir);
    const errorLogFiles = files.filter(
      (file) => file.startsWith('error.') && file.endsWith('.log'),
    );

    if (errorLogFiles.length === 0) {
      return null;
    }

    return path.join(this.logDir, errorLogFiles[0]);
  }

  async getErrorLogs() {
    const errorLogFile = this.getMostRecentErrorLogFile();

    if (!errorLogFile) {
      return 'No error logs found';
    }

    const data = fs.readFileSync(errorLogFile, 'utf8');

    const logEntries = data
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    return logEntries;
  }
}
