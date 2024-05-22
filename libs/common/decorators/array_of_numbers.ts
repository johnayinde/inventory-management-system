import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsArrayOfNumbers(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isArrayOfNumbers',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          return value.every((item) => typeof item === 'number');
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an array of numbers`;
        },
      },
    });
  };
}
