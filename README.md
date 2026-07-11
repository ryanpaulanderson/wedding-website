# Wedding Website

Empty project foundation for development in Cursor.

## What exists

- Dependency manifests for Next.js, React, TypeScript, ESLint, and Prisma
- TypeScript, Next.js, ESLint, pnpm, Git, and Docker configuration
- A Node development container
- A local PostgreSQL container

## What does not exist

There are no source directories, placeholder files, routes, components, styles, database schemas, migrations, or application behavior.

## Start the environment

With Docker Desktop running in Linux container mode:

```powershell
docker compose up --build -d
docker compose exec development sh
```

Stop it with:

```powershell
docker compose down
```

The database is available to containers at `database:5432`. `.env.example` documents the equivalent local connection string.
