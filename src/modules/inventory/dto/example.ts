import { PricingType } from '@prisma/client';

export const exampleCreateInventoryDto = {
  '1': {
    pricing_type: PricingType.bulk,
    quantity: 100,
    bulk_pricing: {
      price: 10,
      quantity_threshold: 50,
      note: 'Bulk pricing for product 1',
    },
  },
  '2': {
    pricing_type: PricingType.individual,
    quantity: 2,
    individual_pricing: [
      {
        note: 'Individual pricing for product 2, variant 1',
        price: 30,
        name: 'Variant 1',
        serial_number: 'SN789',
      },
      {
        note: 'Individual pricing for product 2, variant 2',
        price: 30,
        name: 'Variant 1',
        serial_number: 'SN789',
      },
    ],
  },
};
