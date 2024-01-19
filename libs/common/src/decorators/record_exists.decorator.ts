import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaClient } from '@prisma/client';

export function RecordExists(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: RecordExistsInDbConstraint,
    });
  };
}
@ValidatorConstraint({ name: 'RecordExists' })
export class RecordExistsInDbConstraint
  implements ValidatorConstraintInterface
{
  async validate(value: any, args: ValidationArguments) {
    if (!value) return false;
    const [modelName, field] = String(args.constraints).split('.');
    const queryConstraintDataBag = new Object();
    queryConstraintDataBag[field] = value;

    const prisma = new PrismaClient();
    const record = await prisma[modelName].findFirst({
      where: queryConstraintDataBag,
    });
    await prisma.$disconnect();

    if (record && record.email_verified) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    // here you can provide default error message if validation failed
    return `${args.property} already exists!`;
  }
}
