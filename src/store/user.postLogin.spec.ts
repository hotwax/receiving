import { api } from "@common";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProductStore } from "@/store/productStore";
import { useUserStore } from "@/store/user";

vi.mock("@common", () => ({ api: vi.fn(), commonUtil: { isAppEmbedded: () => false }, logger: { error: vi.fn() }, translate: (key: string) => key, useEmbeddedAppStore: () => ({}), useNotificationStore: () => ({ fetchAllNotificationPrefs: vi.fn() }) }));
vi.mock("@/router", () => ({ default: { currentRoute: { value: { query: {} } } } }));
vi.mock("@/utils/firebaseUtil", () => ({ firebaseUtil: { initialiseFirebaseMessaging: vi.fn() } }));
vi.mock("@/db/receivingClient", () => ({}));
vi.mock("@/db/receivingSession", () => ({ beginReceivingLogin: vi.fn(), finishReceivingLogin: vi.fn() }));
vi.mock("@/store/transferorder", () => ({}));

// Receiving is a facility function: login must not depend on a product store (GOR-444, #763).
describe("postLogin for a facility with no product store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("logs in, keeps the facility selected and makes no product store request", async () => {
    // The OMS knows one facility and every other lookup, including the facility's product stores, comes back empty.
    vi.mocked(api).mockImplementation(({ url }: any) => Promise.resolve({ data: url === "oms/facilities" ? [{ facilityId: "C", facilityName: "Store C" }] : [] } as any));
    const user = useUserStore();
    vi.spyOn(user, "fetchUserProfile").mockResolvedValue(undefined as any);
    vi.spyOn(user, "fetchPermissions").mockResolvedValue(undefined as any);

    await user.postLogin();

    expect(useProductStore().getCurrentFacility.facilityId).toBe("C");
    expect(vi.mocked(api).mock.calls.filter(([request]: any) => /productStore/i.test(request.url))).toEqual([]);
  });
});
