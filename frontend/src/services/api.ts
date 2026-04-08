import axios from "axios";

const gateway = axios.create({ baseURL: "http://localhost:8000" });

// Add auth header interceptor
gateway.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
gateway.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await gateway.post("/auth/login", { email, password });
    return res.data;
  },

  signup: async (email: string, password: string, client_slug: string) => {
    const res = await gateway.post("/auth/signup", { email, password, client_slug });
    return res.data;
  },

  createClient: async (company_name: string, email: string, password: string) => {
    const res = await gateway.post("/clients", { company_name, email, password });
    return res.data;
  },

  getMe: async (token: string) => {
    const res = await gateway.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  logout: async (token: string) => {
    await gateway.post("/auth/logout", null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Products
  getClientProducts: async (slug: string) => {
    const res = await gateway.get(`/clients/${slug}/products`);
    return res.data;
  },

  createProduct: async (name: string, sku: string, category: string) => {
    const res = await gateway.post("/products", { name, sku, category });
    return res.data;
  },

  getProductScore: async (productId: number) => {
    const res = await gateway.get(`/products/${productId}/score`);
    return res.data;
  },

  getProductMetrics: async (productId: number) => {
    const res = await gateway.get(`/products/${productId}/metrics`);
    return res.data;
  },

  getProductOverview: async (productId: number) => {
    const res = await gateway.get(`/products/${productId}/overview`);
    return res.data;
  },

  getAspectDetail: async (productId: number, aspect: string) => {
    const res = await gateway.get(`/products/${productId}/aspects/${aspect}`);
    return res.data;
  },

  // Upload
  uploadReviews: async (productId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await gateway.post(`/products/${productId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // Query (proxied through gateway)
  getSummary: async (productId: number) => {
    const res = await gateway.get(`/summary/${productId}`);
    return res.data;
  },

  getReviews: async (productId: number, limit = 10) => {
    const res = await gateway.get(`/reviews/${productId}?limit=${limit}`);
    return res.data;
  },

  // Causal inference
  getCausalGraph: async (productId: number) => {
    const res = await gateway.get(`/products/${productId}/causal-graph`);
    return res.data;
  },

  simulateFix: async (productId: number, aspect: string) => {
    const res = await gateway.post(`/products/${productId}/fix-simulation`, { aspect });
    return res.data;
  },

  getFixRankings: async (productId: number) => {
    const res = await gateway.get(`/products/${productId}/fix-rankings`);
    return res.data;
  },

  validateCausalEdges: async (productId: number) => {
    const res = await gateway.post(`/products/${productId}/causal-validate`);
    return res.data;
  },

  askQuery: async (question: string, productId: number, aspect?: string) => {
    const body: Record<string, unknown> = {
      question,
      product_id: productId,
      top_k: 5,
    };
    if (aspect) body.aspect = aspect;
    const res = await gateway.post("/query", body);
    return res.data;
  },
};
