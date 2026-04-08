import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import AddProduct from "./AddProduct";
import UploadReviews from "./UploadReviews";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Product, ProductScore, StatusLevel } from "../types";

const SideIcon = ({ d }: { d: string }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
);

const Dashboard = () => {
  const { user }                           = useAuth();
  const [products, setProducts]            = useState<Product[]>([]);
  const [scores, setScores]                = useState<Record<number, ProductScore>>({});
  const [loading, setLoading]              = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [uploadTarget, setUploadTarget]    = useState<Product | null>(null);
  const navigate                           = useNavigate();

  const loadProducts = async () => {
    if (!user) return;
    try {
      const prods = await api.getClientProducts(user.client_slug);
      setProducts(prods);
      const scoreMap: Record<number, ProductScore> = {};
      await Promise.all(
        prods.map(async (p: Product) => {
          try { scoreMap[p.id] = await api.getProductScore(p.id); } catch {}
        })
      );
      setScores(scoreMap);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, [user]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-transparent">
      <Navbar />
      <div className="flex max-w-[1600px] mx-auto">
        {/* Sidebar */}
        <aside className="w-64 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-r border-gray-100/60 dark:border-slate-700/40 min-h-screen pt-8 flex flex-col">
          <div className="px-6 pb-6 border-b border-gray-100/60 dark:border-slate-700/40 mb-2">
            <p className="section-label">Client Space</p>
            <p className="text-sm font-semibold dark:text-slate-100 truncate">{user?.client_name || '—'}</p>
          </div>
          <div className="flex-1 px-3 py-2 space-y-1">
            {[
              { label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", active: true },
              { label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", active: false },
              { label: "Reports", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", active: false },
            ].map((item, i) => (
              <div key={i} className={`nav-item ${item.active ? 'nav-item-active' : 'nav-item-inactive'}`}>
                <SideIcon d={item.icon} />
                {item.label}
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-10">
          <div className="flex items-start justify-between mb-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold mb-1 dark:text-slate-100 tracking-tight">Products</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">{products.length} SKU{products.length !== 1 ? 's' : ''} tracked</p>
            </div>
            <button onClick={() => setShowAddProduct(true)} className="btn-primary px-5 py-2.5 text-sm">
              + Add product
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="glass-panel rounded-2xl px-6 py-5 animate-pulse">
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-48 mb-2.5" />
                      <div className="h-3 bg-gray-50 dark:bg-slate-700/50 rounded w-32" />
                    </div>
                    <div className="h-8 w-16 bg-gray-100 dark:bg-slate-700 rounded-lg" />
                    <div className="h-6 w-20 bg-gray-100 dark:bg-slate-700 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold dark:text-slate-100 mb-1">No products yet</h3>
              <p className="text-sm text-gray-400 dark:text-slate-500 mb-5">Add your first product and upload reviews to get started</p>
              <button onClick={() => setShowAddProduct(true)} className="btn-primary px-6 py-2.5 text-sm">
                + Add your first product
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product, idx) => {
                const scoreData = scores[product.id];
                const score   = scoreData?.score ?? 0;
                const reviews = scoreData?.review_count ?? 0;
                const status  = (scoreData?.status ?? 'Moderate') as StatusLevel;
                return (
                  <div key={product.id}
                    onClick={() => navigate("/product/" + product.id)}
                    className="group glass-panel rounded-2xl px-6 py-5 flex items-center gap-6 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary-200/80 dark:hover:border-primary-500/40 transition-all duration-300 cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/30 flex items-center justify-center flex-shrink-0 group-hover:from-primary-100 group-hover:to-primary-200 dark:group-hover:from-primary-900/60 dark:group-hover:to-primary-800/50 transition-all">
                      <svg className="w-5 h-5 text-primary-500 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">{product.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {product.sku}
                        <span className="mx-1.5 opacity-40">·</span>
                        {product.category}
                      </p>
                    </div>
                    <div className="text-center min-w-[4.5rem]">
                      <div className="text-2xl font-semibold tabular-nums text-primary-600 dark:text-primary-400">{score > 0 ? score.toFixed(1) : '—'}</div>
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">score</div>
                    </div>
                    <div className="text-center min-w-[5rem]">
                      <div className="text-sm font-medium text-gray-600 dark:text-slate-300 tabular-nums">{reviews.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">reviews</div>
                    </div>
                    {score > 0 ? <StatusBadge status={status} /> : <span className="text-xs text-gray-300 dark:text-slate-600 italic">No data</span>}
                    <button onClick={(e) => { e.stopPropagation(); setUploadTarget(product); }} className="btn-secondary px-3.5 py-2 text-xs">
                      Upload
                    </button>
                    <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-primary-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {showAddProduct && <AddProduct onClose={() => setShowAddProduct(false)} onCreated={loadProducts} />}
      {uploadTarget && (
        <UploadReviews productId={uploadTarget.id} productName={uploadTarget.name}
          onClose={() => setUploadTarget(null)} onUploaded={loadProducts} />
      )}
    </div>
  );
};

export default Dashboard;
