import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import api from "@common/core/remoteApi";
import { useProductStore } from "./product";

vi.mock("@common/core/remoteApi", () => ({ default: vi.fn() }));
vi.mock("@common/utils/commonUtil", () => ({
  commonUtil: { isMoqui: () => false, hasError: () => false },
}));
vi.mock("@common", async () => {
  const { useSolrSearch } = await import("@common/composables/useSolrSearch");
  return { api: vi.fn(), commonUtil: {}, emitter: {}, useSolrSearch };
});
vi.mock("@/store/productStore", () => ({ useProductStore: vi.fn() }));

describe("transfer product metadata", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("requests and caches standalone products alongside variants", async () => {
    const products = [
      { productId: "13824", productName: "Packaging", isVariant: true },
      { productId: "M117755", productName: "Gift Note Stationery - Blush Foldover", isVariant: false },
      { productId: "M117754", productName: "Large Ecomm Box - Blush & Palm", isVariant: false },
    ];
    vi.mocked(api).mockResolvedValue({
      status: 200,
      data: { response: { numFound: products.length, docs: products } },
    } as any);

    const store = useProductStore();
    await store.fetchProducts({ productIds: products.map((product) => product.productId) });

    const request = vi.mocked(api).mock.calls[0][0] as any;
    expect(request.data.json.filter).toContain("productId: (13824 OR M117755 OR M117754)");
    expect(request.data.json.filter).toContain("isVariant: (true OR false)");
    expect(request.data.json.filter).not.toContain("AND isVariant: true");
    expect(request.data.json.filter).toContain("isVirtual: false");
    for (const product of products) {
      expect(store.getProduct(product.productId).productName).toBe(product.productName);
    }
  });

  it("loads later pages when duplicate documents leave requested products missing", async () => {
    const box = { productId: "M100410", productName: "Gift Box" };
    const pouch = { productId: "M100411", productName: "Gift Pouch" };
    vi.mocked(api)
      .mockResolvedValueOnce({
        status: 200,
        data: { response: { numFound: 4, docs: [box, box] } },
      } as any)
      .mockResolvedValueOnce({
        status: 200,
        data: { response: { numFound: 4, docs: [pouch, pouch] } },
      } as any);

    const store = useProductStore();
    await store.fetchProducts({ productIds: [box.productId, pouch.productId] });

    expect(api).toHaveBeenCalledTimes(2);
    expect((vi.mocked(api).mock.calls[1][0] as any).data.json.params.start).toBe(2);
    expect(store.getProduct(box.productId).productName).toBe(box.productName);
    expect(store.getProduct(pouch.productId).productName).toBe(pouch.productName);
  });
});
