import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
};
const seedData = async () => {
  const categoryData = JSON.parse(
    await fs.readFile(path.join(__dirname, './data/categories.json'), 'utf-8'),
  );

  const productData = JSON.parse(
    await fs.readFile(path.join(__dirname, './data/products.json'), 'utf-8'),
  );

  const shipmentData = JSON.parse(
    await fs.readFile(path.join(__dirname, './data/shipments.json'), 'utf-8'),
  );

  const inventoryData = JSON.parse(
    await fs.readFile(path.join(__dirname, './data/inventory.json'), 'utf-8'),
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const new_account = await tx.auth.create({
        data: {
          email: 'lolaayinde@gmail.com',
          password: await hashPassword('Ayindeno1*'),
          email_verified: true,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          email: new_account.email,
          business: {
            create: {
              business_name: 'Example Business',
              business_type: 'PERSONAL',
              business_address: '123 Example St, City',
              country: 'Country',
            },
          },
        },
      });

      await Promise.all(
        categoryData.map(
          async (category) =>
            await tx.category.upsert({
              where: { id: category.id },
              update: {},
              create: {
                tenant: { connect: { id: tenant.id } },
                name: category.name,
                description: category.description,
              },
            }),
        ),
      );

      await Promise.all(
        productData.map(
          async (product) =>
            await tx.product.upsert({
              where: { id: product.id },
              update: {},
              create: {
                tenant: { connect: { id: tenant.id } },
                name: product.name,
                description: product.description,
              },
            }),
        ),
      );

      const expenseCategory = await tx.expenseCategory.create({
        data: {
          tenant: { connect: { id: tenant.id } },
          name: 'Expense Category 1',
          description: 'Description for Expense Category 1',
        },
      });

      await tx.expense.createMany({
        data: [
          {
            tenant_id: tenant.id,
            name: 'Expense 1',
            description: 'Description for Expense 1',
            amount: 100.0,
            date: new Date(),
            type: 'general',
            expense_categoryId: expenseCategory.id,
          },
          {
            tenant_id: tenant.id,
            name: 'Expense 2',
            description: 'Description for Expense 1',
            amount: 200.0,
            date: new Date(),
            type: 'product',

            productId: 1,
          },
          {
            tenant_id: tenant.id,
            name: 'Expense 3',
            description: 'Description for Expense 1',
            amount: 500.0,
            date: new Date(),
            type: 'product',
            productId: 2,
          },
        ],
      });

      await tx.fees.create({
        data: {
          tenant: { connect: { id: tenant.id } },
          fee_type: 'product',
          name: 'product 1',
          value: 200,
          value_type: 'fixed',
          products: {
            connect: productData.map(({ id }) => ({ id })),
          },
        },
      });

      await Promise.all(
        [1, 2, 3].map(
          async () =>
            await tx.fees.create({
              data: {
                tenant_id: tenant.id,
                fee_type: 'product',
                name: 'product 1',
                value: 200,
                value_type: 'fixed',
                products: {
                  connect: productData.map(({ id }) => ({ id })),
                },
              },
            }),
        ),
      );
      await tx.fees.createMany({
        data: [
          {
            tenant_id: tenant.id,
            fee_type: 'all',
            name: 'all%',
            value: 2.5,
            value_type: 'percentage',
          },
          {
            tenant_id: tenant.id,
            fee_type: 'all',
            name: 'all',
            value: 235,
            value_type: 'fixed',
          },
        ],
      });

      await tx.fees.create({
        data: {
          tenant_id: tenant.id,
          fee_type: 'product',
          name: 'product 1',
          value: 200,
          value_type: 'fixed',
          products: {
            connect: productData.map(({ id }, i) => {
              if (i !== 2) {
                return { id };
              }
            }),
          },
        },
      });

      await tx.customer.create({
        data: {
          tenant_id: tenant.id,
          name: 'John Doe',
          phone_number: '1234567890',
          email: 'john@example.com',
          address: '456 Main St, City',
        },
      });

      await Promise.all(
        shipmentData.map(async (shipment) =>
          tx.shipment.upsert({
            where: { id: shipment.id },
            update: {},
            create: {
              tenant: { connect: { id: tenant.id } },
              shipping_name: shipment.shipping_name,
              reference: shipment.reference,
              date: shipment.date,
              attachments: shipment.attachments,
              price: shipment.price,
              note: shipment.note,
              products: { connect: productData.map(({ id }) => ({ id })) },
            },
          }),
        ),
      );

      await Promise.all(
        inventoryData.map(
          async (inventory) =>
            await tx.inventory.upsert({
              where: { id: inventory.id },
              update: {},
              create: {
                note: inventory.note,
                prod_id: inventory.prod_id,
                serial_number: inventory.serial_number,
                name: inventory.name,
                attachments: inventory.attachments,
                pricing_type: inventory.pricing_type,
                price: inventory.price,
                quantity: inventory.quantity,
                status: inventory.status,
                quantity_threshold: inventory.quantity_threshold,

                product: { connect: { id: inventory.product_id } },
                tenant: { connect: { id: tenant.id } },
                shipment: {
                  connect: {
                    id: inventory.shipment_id,
                  },
                },
              },
            }),
        ),
      );
    });
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
};

seedData()
  .then(async (data) => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
