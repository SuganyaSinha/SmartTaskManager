import api from "./api";
import { DashboardSnapshot } from "../types/common";

export const getDashboardSnapshot = async (timeZone: string): Promise<DashboardSnapshot> => {
  const response = await api.get<DashboardSnapshot>("/api/dashboard/snapshot", {
    headers: { "Content-Type": "application/json" },
    params: { timeZone },
  });

  return response.data;
};
