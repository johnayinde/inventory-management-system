import { PricingType } from '@prisma/client';

export const exampleCreateInventoryDto = [
  {
    pid: 1,
    pricing_type: PricingType.bulk,
    quantity: 100,
    selling_price: 10,
    cost_price: 10,
    note: 'Bulk pricing for product 1',
    attachments: ['Base64'],
  },
  {
    pid: 1,
    pricing_type: PricingType.individual,
    quantity: 100,
    individual_items: [
      {
        note: 'Individual pricing for product 2, variant 1',
        selling_price: 30,
        cost_price: 30,
        name: 'Variant 1',
        serial_number: 'SN789',
        attachments: ['Base64'],
      },
      {
        note: 'Individual pricing for product 2, variant 2',
        selling_price: 30,
        cost_price: 30,
        name: 'Variant 1',
        serial_number: 'SN789',
        attachments: ['Base64'],
      },
    ],
  },
];
