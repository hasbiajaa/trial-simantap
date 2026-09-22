import { api } from "./api";

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  localStorage.setItem("spi_token", data.token);
  return data.user;
}
