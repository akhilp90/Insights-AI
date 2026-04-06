import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import AddProduct from "./AddProduct";
import UploadReviews from "./UploadReviews";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Product, ProductScore, StatusLevel } from "../types";

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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <div className="flex">
        <aside className="w-52 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-700 min-h-screen pt-6">
          <div className="px-5 pb-4 border-b border-gray-100 dark:border-slate-700 mb-2">
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Client</p>
            <p className="text-sm font-medium dark:text-slate-100">{user?.client_name || '—'}</p>
          </div>
          {["Products", "Analytics", "Reports"].map((item, i) => (
            <div key={i} className={
              i === 0
                ? "px-5 py-2.5 text-sm cursor-pointer text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 font-medium"
                : "px-5 py-2.5 text-sm cursor-pointer text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
            }>{item}</div>
          ))}
        </aside>

        <main className="flex-1 p-7">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-medium mb-1 dark:text-slate-100">Products</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">{products.length} SKUs tracked</p>
            </div>
            <button onClick={() => setShowAddProduct(true)} className="btn-primary px-4 py-2 text-sm">
              + Add product
            </button>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-5 py-4 animate-pulse">
                  <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-50 dark:bg-slate-700/50 rounded w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {products.map((product) => {
                const scoreData = scores[product.id];
                const score   = scoreData?.score ?? 0;
                const reviews = scoreData?.review_count ?? 0;
                const status  = (scoreData?.status ?? 'Moderate') as StatusLevel;
                return (
                  <div key={product.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-5 py-4 flex items-center gap-5 hover:border-gray-300 dark:hover:border-slate-500 transition-colors">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate("/product/" + product.id)}>
                      <h3 className="text-sm font-medium mb-0.5 dark:text-slate-100">{product.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{product.sku} · {product.category}</p>
                    </div>
                    <div className="text-center min-w-16">
                      <div className="text-2xl font-medium text-primary-600 dark:text-primary-400">{score > 0 ? score.toFixed(1) : '—'}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500">score</div>
                    </div>
                    <div className="text-sm text-gray-400 dark:text-slate-500 min-w-24 text-center">{reviews} reviews</div>
                    {score > 0 ? <StatusBadge status={status} /> : <span className="text-xs text-gray-300 dark:text-slate-600">No data</span>}
                    <button onClick={(e) => { e.stopPropagation(); setUploadTarget(product); }} className="btn-secondary px-3 py-1.5 text-xs">
                      Upload
                    </button>
                    <svg onClick={() => navigate("/product/" + product.id)} className="w-4 h-4 text-gray-300 dark:text-slate-600 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
