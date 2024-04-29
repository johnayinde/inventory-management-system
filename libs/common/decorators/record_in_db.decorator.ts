import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaClient } from '@prisma/client';

export function RecordIsInDb(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: RecordExistsConstraint,
    });
  };
}
@ValidatorConstraint({ name: 'RecordIsInDb' })
export class RecordExistsConstraint implements ValidatorConstraintInterface {
  async validate(value: any, args: ValidationArguments) {
    if (!value) return false;
    const [modelName, field] = String(args.constraints).split('.');
    const queryConstraintDataBag = new Object();
    if (!isNaN(value)) {
      value = Number(value);
    }
    queryConstraintDataBag[field] = value;

    const prisma = new PrismaClient();
    const record = await prisma[modelName].findUnique({
      where: queryConstraintDataBag,
    });
    await prisma.$disconnect();

    if (record) {
      return true;
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    // here you can provide default error message if validation failed
    return `${
      args.property
    } with value ${args?.value?.toUpperCase()} does not exist!`;
  }
}
