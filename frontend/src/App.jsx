import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProductModal from './components/ProductModal';
import DeleteDialog from './components/DeleteDialog';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Layers, 
  DollarSign, 
  Box, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Terminal,
  Zap
} from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/products/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(['All', ...data.data]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async (keyword = searchQuery, cat = selectedCategory) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('search', keyword);
      if (cat && cat !== 'All') params.append('category', cat);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Truy vấn thất bại');
      }

      setProducts(data.data || []);
    } catch (err) {
      setErrorMsg(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts('', 'All');
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(searchQuery, selectedCategory);
  };

  const handleRecentClick = (kw) => {
    setSearchQuery(kw);
    fetchProducts(kw, selectedCategory);
  };

  const handleSaveProduct = async (productData) => {
    try {
      let res;
      if (editingProduct) {
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Thao tác không thành công');
      }

      showToast(editingProduct ? 'Cập nhật sản phẩm thành công!' : 'Tạo mới sản phẩm thành công!');
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchProducts(searchQuery, selectedCategory);
      fetchCategories();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Xóa sản phẩm thất bại');
      }

      showToast('Đã xóa sản phẩm khỏi kho hàng!');
      setDeletingProduct(null);
      fetchProducts(searchQuery, selectedCategory);
      fetchCategories();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Tính toán KPIs
  const totalStock = products.reduce((sum, p) => sum + (parseInt(p.stock, 10) || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.stock, 10) || 0)), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-bounce-short bg-slate-800/90 text-white border-slate-700">
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <Zap className="w-5 h-5 text-sky-400 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tổng Số Mục</p>
              <h3 className="text-2xl font-bold text-white mt-1">{products.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Box className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tổng Tồn Kho</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{totalStock.toLocaleString()} sp</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Giá Trị Tồn Kho</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search, Filter & Actions Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm theo tên hoặc mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
              >
                Tìm Kiếm
              </button>
            </form>

            <div className="flex items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  fetchProducts(searchQuery, e.target.value);
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-sky-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'Tất Cả Danh Mục' : c}</option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchProducts(searchQuery, selectedCategory)}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
              </button>

              {/* Create Product Button */}
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition shadow-lg shadow-sky-600/20 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Mới</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Box */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Hệ thống thông báo</span>
            </div>
            <p className="text-sm text-rose-300">
              {errorMsg}
            </p>
          </div>
        )}

        {/* Product Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16">#ID</th>
                  <th className="py-3.5 px-4">Tên Sản Phẩm</th>
                  <th className="py-3.5 px-4">Danh Mục</th>
                  <th className="py-3.5 px-4 text-right">Đơn Giá</th>
                  <th className="py-3.5 px-4 text-right">Tồn Kho</th>
                  <th className="py-3.5 px-4">Mô Tả</th>
                  <th className="py-3.5 px-4 text-center w-28">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {products.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      Không tìm thấy sản phẩm nào phù hợp.
                    </td>
                  </tr>
                )}
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition group">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">#{p.id}</td>
                    <td className="py-3 px-4 font-medium text-white group-hover:text-sky-400 transition">
                      {p.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-emerald-400">
                      ${parseFloat(p.price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.stock < 10 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate" title={p.description}>
                      {p.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Product Add/Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteConfirm}
        product={deletingProduct}
      />
    </div>
  );
}
