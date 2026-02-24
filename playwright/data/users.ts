export type Credentials = {
  username: string;
  password: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getTestUser(): Credentials {
  return {
    username: getRequiredEnv("PW_USERNAME"),
    password: getRequiredEnv("PW_PASSWORD"),
  };
}
