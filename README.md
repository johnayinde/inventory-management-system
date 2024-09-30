# Inventory Management System

An inventory management system designed to help businesses efficiently manage and track their stock levels, orders, sales, and deliveries. Built with scalability and multi-tenancy in mind, this system provides a seamless experience for managing multiple organizations using the same set of credentials.

## Table of Contents

- [Inventory Management System](#inventory-management-system)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Technologies Used](#technologies-used)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Usage](#usage)
  - [Project Structure](#project-structure)
  - [Multi-Tenancy Support](#multi-tenancy-support)
  - [Future Enhancements](#future-enhancements)
  - [Contributing](#contributing)
  - [License](#license)

## Features

- **Multi-Tenancy Support:** Allows users to manage multiple organizations using a single account.
- **Inventory Tracking:** Keep track of stock levels in real-time.
- **Order Management:** Manage incoming and outgoing orders effectively.
- **Role-Based Access Control:** Define roles (e.g., Admin, Manager, Staff) for different levels of access.
- **Reporting:** Generate detailed reports on stock levels, order histories, and more.
- **Email Notifications:** Notify users about important events like low stock levels or order statuses.

## Technologies Used

- **Backend:** NestJS, PostgreSQL, Prisma, SendGrid
- **Authentication:** JWT for secure user authentication.
- **Database:** PostgreSQL with Prisma ORM for data management.

## Getting Started

To get a local copy up and running, follow these simple steps:

### Prerequisites

- Node.js and yarn
- PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/johnayinde/inventory-management-system.git
   ```
2. Navigate to the project directory:

   ```bash
   cd inventory-management-system
   ```

3. Set up environment variables by creating renaming `.env-example` file to `.env`:

4. Start service containers:

   ```bash
   $ docker compose up -d
   ```

5. Start the server:

   ```bash
   $ yarn install
   $ yarn run prisma:postgres:dbpush  # syncs the postgres with the Prisma schema
   $ yarn run start:dev
   ```

6. Stop service containers:

   ```bash
   $ docker compose down
   ```

## Usage

- To access the system, register a new account or use an existing one.
- Users can create, update, and delete inventory items based on their roles.
- Use the multi-tenancy feature to switch between different organizations.

## Project Structure

Here's a brief overview of the project's structure:

```inventory-management-system/
.
├── libs
│   └── common
│    ├── constants
│    ├── decorators
│    ├── exceptions
│    ├── guards
│    ├── helpers
│    ├── interceptors
│    ├── pagination
│    ├── types
│    ├── common.module.ts
│    ├── common.service.spec.ts
│    ├── common.service.ts
│    └── index.ts
├── logger
│   └── winston.logger.ts
├── prisma
│   ├── migrations
│   └── schema.prisma
├── src
│   ├── database
│   │   ├── db.module.ts
│   │   └── db.service.ts
│   ├── modules
│   │   ├── auth
│   │   ├── cache
│   │   ├── category
│   │   ├── customer
│   │   ├── dashboard
│   │   ├── email
│   │   ├── expense
│   │   ├── fees
│   │   ├── inventory
│   │   ├── mfa
│   │   ├── notification
│   │   ├── product
│   │   ├── report
│   │   ├── sale
│   │   ├── shipment
│   │   ├── tenant
│   │   └── user
│   ├── app.controller.spec.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts

```

## Multi-Tenancy Support

The system is designed to support multiple organizations using the same user account. Users can switch between different organizations they have access to, and manage inventories accordingly. This is particularly useful for businesses with multiple branches or departments.

## Future Enhancements

- **Mobile App:** A mobile-friendly version to manage inventories on the go.
- **API Integration:** Integration with third-party logistics and accounting software.
- **Advanced Analytics:** More detailed analytics for stock trends, sales forecasting, etc.

## Contributing

Contributions are welcome! Please fork this repository and open a pull request to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
