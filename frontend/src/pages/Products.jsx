import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { SkeletonTableRows } from '../components/ui/Skeleton';
import { formatCurrency } from '../utils/formatCurrency';
import { notifySuccess } from '../utils/notify';

const PAGE_SIZE = 10;
const CATEGORY_OPTIONS = ['Mobile', 'TV', 'AC', 'Laptop', 'Kitchen', 'Other'];

const emptyForm = {
  name: '',
  category: CATEGORY_OPTIONS[0],
  serialNumber: '',
  imei: '',
  costPrice: '',
  salePrice: '',
  stockQuantity: '',
};

const fetchProducts = async ({ queryKey }) => {
  const [, category] = queryKey;
  const params = { category: category === 'All' ? undefined : category };
  const { data } = await api.get('/products', { params });
  return data || [];
};

function computeMargin(cost, sale) {
  const c = Number(cost || 0);
  const s = Number(sale || 0);
  if (c <= 0) return 0;
  return ((s - c) / c) * 100;
}

function stockTone(qty) {
  if (qty > 5) return 'badge-success';
  if (qty >= 1) return 'badge-warning';
  return 'badge-danger';
}

export default function Products() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues: emptyForm });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category],
    queryFn: fetchProducts,
  });

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.name?.toLowerCase().includes(q) || p.serialNumber?.toLowerCase().includes(q) || p.imei?.toLowerCase().includes(q)
    );
  }, [products, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const liveCostPrice = watch('costPrice');
  const liveSalePrice = watch('salePrice');
  const liveMargin = computeMargin(liveCostPrice, liveSalePrice);

  const mutation = useMutation({
    mutationFn: (payload) => (editingProduct ? api.put(`/products/${editingProduct.id}`, payload) : api.post('/products', payload)),
    onSuccess: () => {
      notifySuccess(editingProduct ? 'Product updated!' : 'Product added!');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  function openAddModal() {
    setEditingProduct(null);
    reset(emptyForm);
    setPhotoPreview('');
    setModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    reset({
      name: product.name,
      category: product.category || CATEGORY_OPTIONS[0],
      serialNumber: product.serialNumber || '',
      imei: product.imei || '',
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      stockQuantity: product.stockQuantity,
    });
    setPhotoPreview(product.photoPath || '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    reset(emptyForm);
    setPhotoPreview('');
  }

  function handlePhotoChange(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  const onSubmit = (values) => {
    const payload = {
      name: values.name,
      category: values.category,
      serialNumber: values.serialNumber || undefined,
      imei: values.imei || undefined,
      costPrice: Number(values.costPrice),
      salePrice: Number(values.salePrice),
      stockQuantity: Number(values.stockQuantity),
    };

    if (editingProduct) {
      payload.isActive = editingProduct.isActive ?? true;
    }

    mutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">Manage inventory, pricing, and stock levels.</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name / serial / IMEI"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="All">All Categories</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button onClick={openAddModal} className="btn btn-primary shrink-0">
            Add Product
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="table-container">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Name', 'Category', 'Serial / IMEI', 'Cost Price', 'Sale Price', 'Margin %', 'Stock', 'Actions'].map((header) => (
                  <th
                    key={header}
                    className={`px-4 py-3 text-left text-sm font-semibold text-slate-600 ${['Serial / IMEI', 'Cost Price'].includes(header) ? 'hidden md:table-cell' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <SkeletonTableRows columns={8} rows={6} />
              ) : visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-sm text-slate-500">No products found for the chosen filters.</td>
                </tr>
              ) : (
                visibleProducts.map((product) => {
                  const margin = computeMargin(product.costPrice, product.salePrice);
                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="max-w-[180px] truncate px-4 py-3 text-sm font-medium text-slate-900" title={product.name}>{product.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="badge badge-info">{product.category || '—'}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                        <div>{product.serialNumber || '—'}</div>
                        {product.imei && <div className="text-xs text-slate-400">IMEI: {product.imei}</div>}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">{formatCurrency(product.costPrice)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(product.salePrice)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {margin.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`badge ${stockTone(product.stockQuantity)}`}>
                          {product.stockQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => openEditModal(product)} className="btn btn-outline btn-sm">
                            Edit
                          </button>
                          <button onClick={() => navigate(`/sales?productId=${product.id}`)} className="btn btn-primary btn-sm">
                            Sell
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm text-slate-500">
          Showing {filteredProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length} products
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="btn btn-outline btn-sm">
            Prev
          </button>
          <span className="text-sm text-slate-700">{currentPage} / {totalPages}</span>
          <button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="btn btn-outline btn-sm">
            Next
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
                <p className="text-sm text-slate-500">Keep pricing and stock details up to date.</p>
              </div>
              <button onClick={closeModal} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Product Name *</label>
                  <input {...register('name', { required: 'Product name is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
                  <select {...register('category', { required: true })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Serial Number</label>
                  <input {...register('serialNumber')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">IMEI</label>
                  <input {...register('imei')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cost Price *</label>
                  <input type="number" step="0.01" min="0" {...register('costPrice', { required: 'Cost price is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.costPrice && <p className="mt-1 text-xs text-rose-600">{errors.costPrice.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sale Price *</label>
                  <input type="number" step="0.01" min="0" {...register('salePrice', { required: 'Sale price is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.salePrice && <p className="mt-1 text-xs text-rose-600">{errors.salePrice.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Stock Quantity *</label>
                  <input type="number" min="0" {...register('stockQuantity', { required: 'Stock quantity is required' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {errors.stockQuantity && <p className="mt-1 text-xs text-rose-600">{errors.stockQuantity.message}</p>}
                </div>
                <div className="flex items-end">
                  <div className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${liveMargin >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    Margin: {liveMargin.toFixed(1)}%
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Product Photo</label>
                  <input type="file" accept="image/*" onChange={(event) => handlePhotoChange(event.target.files?.[0])} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  {photoPreview && <img src={photoPreview} alt="Product preview" className="mt-2 h-20 w-20 rounded-lg object-cover" />}
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                  {mutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
