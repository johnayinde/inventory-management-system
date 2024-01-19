/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PASSWORDREGEX } from '@app/common';

export function CheckPassword(
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
@ValidatorConstraint({ name: 'CheckPassword' })
export class RecordExistsConstraint implements ValidatorConstraintInterface {
  async validate(value: any, args: ValidationArguments) {
    if (!value) return false;

    return PASSWORDREGEX.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    // here you can provide default error message if validation failed
    return `Oops! Password must be 8+ characters with an uppercase, digit, and special character.`;
  }
}
