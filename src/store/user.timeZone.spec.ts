import { api } from "@common";
import { Settings } from "luxon";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserStore } from "@/store/user";

vi.mock("@common", () => ({ api: vi.fn(), commonUtil: { getErrorMessage: () => "", showToast: vi.fn() }, logger: { error: vi.fn() }, translate: (key: string) => key, useEmbeddedAppStore: () => ({}), useNotificationStore: () => ({}) }));
vi.mock("@/router", () => ({ default: { currentRoute: { value: { query: {} } } } }));
vi.mock("@/utils/firebaseUtil", () => ({ firebaseUtil: {} }));
vi.mock("@/db/receivingClient", () => ({}));
vi.mock("@/db/receivingSession", () => ({}));
vi.mock("@/store/transferorder", () => ({}));

// Saving a time zone in Settings must change how dates show right away, not after a reload (#750).
describe("setUserTimeZone", () => {
  const initialZone = Settings.defaultZone;
  beforeEach(() => {
    setActivePinia(createPinia());
    Settings.defaultZone = "America/New_York";
    vi.mocked(api).mockReset();
  });
  afterEach(() => { Settings.defaultZone = initialZone; });

  it("applies the saved zone to date formatting", async () => {
    vi.mocked(api).mockResolvedValue({ data: {} } as any);
    const user = useUserStore();
    user.current = { userId: "U1", timeZone: "America/New_York" };

    await user.setUserTimeZone("America/Los_Angeles");

    expect(user.current.timeZone).toBe("America/Los_Angeles");
    expect(Settings.defaultZone.name).toBe("America/Los_Angeles");
  });

  it("keeps the previous zone when the save fails", async () => {
    vi.mocked(api).mockRejectedValue(new Error("save failed"));
    const user = useUserStore();
    user.current = { userId: "U1", timeZone: "America/New_York" };

    await user.setUserTimeZone("America/Los_Angeles");

    expect(user.current.timeZone).toBe("America/New_York");
    expect(Settings.defaultZone.name).toBe("America/New_York");
  });
});
