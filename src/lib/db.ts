import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL || "libsql://shopeev2-dbv001111.aws-ap-northeast-1.turso.io",
  authToken:
    process.env.TURSO_AUTH_TOKEN ||
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA4OTI4OTYsImlkIjoiMDE5ZWE1NzctMmYwMS03Njg5LTkzN2UtMWIxNWMwOGIwODM0IiwicmlkIjoiZGZhMTNjZjMtYzZhNy00YzhiLWExZGYtYjg4YmNmMjU0ZTliIn0.To9EYZ9AplPjNFwRrbA3bDBjVNzZqfHuRlm1i6qHEbTCnf29BeOJ_Q18cuXPtvN-0FYrK23dNZLjTbCoktljBQ",
});
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
