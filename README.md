# Next.js SaaS Starter

A production-ready starter template for building SaaS applications with Next.js, Clerk authentication, Stripe payments, AI integration, and modern UI components.

## 🚀 Features

- **Authentication**: Clerk integration with social login providers
- **Payments**: Stripe subscription management with webhooks
- **AI Integration**: Vercel AI SDK and LangChain for AI features
- **Database**: PostgreSQL with Prisma ORM for type-safe queries
- **API Layer**: tRPC for end-to-end type safety and RPC-style APIs
- **Data Fetching**: TanStack React Query for server state management
- **State Management**: Zustand for lightweight client-side state management
- **UI Components**: Shadcn UI with Tailwind CSS and dark mode
- **Analytics**: Vercel Analytics and Speed Insights
- **Developer Experience**: TypeScript, ESLint, Prettier, and more

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Clerk
- **Payments**: Stripe
- **Database**: PostgreSQL + Prisma ORM
- **API**: tRPC for type-safe APIs
- **Data Fetching**: TanStack React Query
- **State Management**: Zustand
- **AI**: Vercel AI SDK + LangChain
- **UI**: Shadcn UI + Tailwind CSS
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel (recommended)

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd nextjs-saas-starter
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   - `DATABASE_URL` or `DATABASE_URL_DEV`: PostgreSQL connection string for your development database
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
   - `CLERK_SECRET_KEY`: Clerk secret key
   - `CLERK_WEBHOOK_SECRET`: Clerk webhook secret
   - `STRIPE_SECRET_KEY`: Stripe secret key
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
   - `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
   - `OPENAI_API_KEY`: OpenAI API key

   **Note**: Prisma CLI reads from `.env` file, while Next.js reads from `.env.local`. Make sure to create a `.env` file for Prisma to work correctly:

   ```bash
   cp .env.local .env
   ```

4. **Set up the database**

   ```bash
   pnpm run db:push:dev
   ```

5. **Run the development server**
   ```bash
   pnpm run dev
   ```

## 🔧 Configuration

### Clerk Setup

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable key and secret key to `.env.local`
4. Set up webhooks pointing to `/api/webhooks/clerk`

### Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard
3. Create products and prices for your subscription plans
4. Set up webhooks pointing to `/api/webhooks/stripe`
5. Update the `PLANS` configuration in `src/lib/stripe.ts`

### Database Setup

1. Set up a PostgreSQL database (recommended: [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres))
2. Copy your connection string to `DATABASE_URL` in `.env.local` and `.env`
3. Run `pnpm run db:push:dev` to create tables in your database
4. (Optional) Run `pnpm run db:studio:dev` to open Prisma Studio and inspect your database

### OpenAI Setup

1. Get an API key from [OpenAI](https://platform.openai.com)
2. Add it to your `.env.local` file

### tRPC Setup

tRPC is already configured and ready to use:

1. **API Routes**: Located in `src/app/api/trpc/[trpc]/route.ts`
2. **Client Configuration**: Set up in `src/lib/trpc/client.ts`
3. **Server Routers**: Defined in `src/server/trpc/routers/`
4. **Context**: Authentication context in `src/server/trpc/context.ts`
5. **Provider**: React Query integration in `src/lib/trpc/Provider.tsx`

### TanStack React Query

React Query is integrated with tRPC for optimal data fetching:

1. **Provider Setup**: Configured in the tRPC Provider component
2. **Automatic Caching**: Built-in caching and background updates
3. **Optimistic Updates**: Support for optimistic UI updates
4. **Error Handling**: Comprehensive error handling and retry logic

### Zustand State Management

Zustand stores are located in `src/stores/`:

1. **Sidebar Store**: `use-sidebar.ts` for managing sidebar state
2. **Custom Stores**: Create new stores as needed for your application state

### Prisma Database ORM

Prisma is configured and ready to use:

1. **Schema**: Defined in `prisma/schema.prisma`
2. **Database Connection**: Configured in `src/db/index.ts`
3. **Generated Client**: Run `pnpm prisma generate` to regenerate after schema changes
4. **Migrations**: Use `pnpm run db:migrate` for production migrations or `pnpm run db:push` for quick development changes

**Environment Setup**:

- Create a `.env` file for Prisma CLI commands
- Application code uses `DATABASE_URL_DEV` from `.env.local` via the custom connection setup in `src/db/index.ts`

## 📁 Project Structure

```
project-root/
├── prisma/              # Prisma schema and migrations
│   └── schema.prisma
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   └── trpc/         # tRPC API endpoints
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── sign-in/           # Auth pages
│   │   └── sign-up/
│   ├── components/            # React components
│   │   └── ui/               # Shadcn UI components
│   ├── db/                   # Database connection
│   │   └── index.ts
│   ├── lib/                  # Utility functions
│   │   └── trpc/             # tRPC client configuration
│   ├── server/               # Server-side code
│   │   └── trpc/             # tRPC routers and context
│   ├── services/             # Business logic services
│   ├── stores/               # Zustand state stores
│   └── middleware.ts         # Clerk middleware
└── ...
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The starter is compatible with any platform that supports Next.js:

- Netlify
- Railway
- Render
- DigitalOcean App Platform

## 📝 Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- `pnpm run db:push:dev` - Push schema changes to dev database
- `pnpm run db:push:prod` - Push schema changes to production database
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:studio:dev` - Open Prisma Studio for dev database
- `pnpm run db:studio:prod` - Open Prisma Studio for production database

## 🔄 Database Management

### Schema Changes

1. Modify `prisma/schema.prisma`
2. Run `pnpm run db:push:dev` to apply changes to dev
3. Run `pnpm run db:push:prod` to apply changes to production

### Prisma Studio

Run `pnpm run db:studio:dev` to open a visual database editor for development. Prisma Studio allows you to:

- Browse and edit database records
- Test queries visually
- Inspect table schemas and relationships

**Important**: Make sure you have a `.env` file (separate from `.env.local`) for Prisma CLI commands to work properly.

## 🎨 Customization

### UI Components

The starter uses Shadcn UI components. You can:

- Add more components: `npx shadcn-ui@latest add [component]`
- Customize themes in `tailwind.config.ts`
- Modify component styles in `src/components/ui/`

### Branding

1. Update the app name in `src/app/layout.tsx`
2. Replace the logo and favicon
3. Customize colors in `tailwind.config.ts`

### Subscription Plans

Modify the `PLANS` object in `src/lib/stripe.ts` to match your pricing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - React framework
- [Clerk](https://clerk.com) - Authentication
- [Stripe](https://stripe.com) - Payments
- [Prisma](https://www.prisma.io) - Database ORM
- [tRPC](https://trpc.io) - End-to-end typesafe APIs
- [TanStack React Query](https://tanstack.com/query) - Data fetching and caching
- [Zustand](https://zustand-demo.pmnd.rs) - State management
- [Shadcn UI](https://ui.shadcn.com) - UI components
- [Vercel](https://vercel.com) - Deployment platform
