import { PaginatorDTO } from './pagination.dto';

export function page_generator(page: number, pageSize: number) {
  const hasPagination = page && pageSize;
  if (hasPagination) {
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    return { skip, take };
  }
  return { skip: undefined, take: undefined };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
}

export const inventoryFilters = (data: PaginatorDTO) => {
  const filter = { OR: [], AND: [] };

  if (data.catId) {
    filter.OR.push({
      category_id: Number(data.catId),
    });
  }

  if (data.sub_catId) {
    filter.OR.push({
      sub_category_id: Number(data.sub_catId),
    });
  }

  if (data.productId) {
    filter.OR.push({
      id: Number(data.productId),
    });
  }

  if (data.date) {
    filter.OR.push({
      created_at: data.date,
    });
  }

  if (data.search) {
    filter.OR.push({
      name: {
        contains: data.search,
        mode: 'insensitive',
      },
    });
  }
  const hasOtherFilters =
    filter.OR.length > 0 || filter.AND.length > 0 ? filter : null;
  console.log(hasOtherFilters);

  return hasOtherFilters;
};

export const salesFilters = (data: PaginatorDTO) => {
  const filter = { OR: [], AND: [] };

  if (data.customerId) {
    filter.OR.push({
      customerId: Number(data.customerId),
    });
  }

  if (data.invoiceId) {
    filter.OR.push({
      id: Number(data.invoiceId),
    });
  }

  if (data.date) {
    filter.OR.push({
      created_at: data.date,
    });
  }

  if (data.search) {
    filter.OR.push({
      customer: {
        name: {
          contains: data.search,
          mode: 'insensitive',
        },
      },
    });
  }
  const hasOtherFilters =
    filter.OR.length > 0 || filter.AND.length > 0 ? filter : null;

  return hasOtherFilters;
};

export const expenseFilters = (data: PaginatorDTO) => {
  const filter = { OR: [], AND: [] };

  if (data.catId) {
    filter.OR.push({
      category: { id: Number(data.catId) },
    });
  }

  if (data.expenseId) {
    filter.OR.push({
      id: Number(data.expenseId),
    });
  }

  if (data.date) {
    filter.OR.push({
      created_at: data.date,
    });
  }

  if (data.amount) {
    filter.OR.push({
      amount: data.amount,
    });
  }

  if (data.search) {
    filter.OR.push(
      {
        name: {
          contains: data.search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: data.search,
          mode: 'insensitive',
        },
      },
    );
  }
  const hasOtherFilters =
    filter.OR.length > 0 || filter.AND.length > 0 ? filter : null;

  return hasOtherFilters;
};
export const subCategoryFilters = (data: PaginatorDTO) => {
  const filter = { OR: [], AND: [] };

  if (data.date) {
    filter.OR.push({
      created_at: data.date,
    });
  }

  if (data.status) {
    filter.OR.push({
      products: { every: { status: data.status } },
    });
  }

  if (data.search) {
    filter.OR.push(
      {
        name: {
          contains: data.search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: data.search,
          mode: 'insensitive',
        },
      },
    );
  }
  const hasOtherFilters =
    filter.OR.length > 0 || filter.AND.length > 0 ? filter : null;

  return hasOtherFilters;
};

export const shipmentFilters = (data: PaginatorDTO) => {
  const filter = { OR: [], AND: [] };

  if (data.shipmentId) {
    filter.OR.push({
      id: Number(data.shipmentId),
    });
  }

  if (data.date) {
    filter.OR.push({
      created_at: data.date,
    });
  }

  if (data.search) {
    filter.OR.push({
      shipping_name: {
        contains: data.search,
        mode: 'insensitive',
      },
    });
  }
  const hasOtherFilters =
    filter.OR.length > 0 || filter.AND.length > 0 ? filter : null;

  return hasOtherFilters;
};
