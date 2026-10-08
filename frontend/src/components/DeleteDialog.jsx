import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteDialog({ isOpen, onClose, onConfirm, product }) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Xác Nhận Xóa</h3>
            <p className="text-xs text-slate-400">Hành động này không thể hoàn tác.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-6">
          Bạn có chắc chắn muốn xóa sản phẩm <span className="font-semibold text-white">"{product.name}"</span> (ID: #{product.id}) khỏi kho hàng không?
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700 transition text-sm font-medium"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition text-sm font-medium shadow-lg shadow-rose-600/25"
          >
            Xác Nhận Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
