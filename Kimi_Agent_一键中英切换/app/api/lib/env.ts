import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};

const appSecret = env.appSecret;
if (process.env.NODE_ENV === "production" && appSecret.length < 32) {
  throw new Error(
    "APP_SECRET must be at least 32 characters long in production",
  );
}

const requiredSecrets = [env.appSecret, env.databaseUrl, env.kimiAuthUrl];
if (process.env.NODE_ENV === "production") {
  for (const secret of requiredSecrets) {
    if (!secret || secret.length < 8) {
      throw new Error("A required secret is missing or too short");
    }
  }
}
