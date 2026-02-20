import { getRequiredEnv } from "../utils/env";

export type Credentials = {
  username: string;
  password: string;
};

export function getTestUser(): Credentials {
  return {
    username: getRequiredEnv("PW_USERNAME"),
    password: getRequiredEnv("PW_PASSWORD"),
  };
}
