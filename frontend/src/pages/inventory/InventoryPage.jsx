import { useState, useMemo } from 'react';
import { useHeaderSearchSlot } from '../../components/layout/headerSearchSlot';
import { InventorySummaryCards } from './components/InventorySummaryCards';
import { InventoryFilterBar } from './components/InventoryFilterBar';
import { ProductListTable } from './components/ProductListTable';
import { ProductFormModal } from './components/ProductFormModal';
import { BarcodeLabelModal } from './components/BarcodeLabelModal';
import { BarcodeLabelPickerModal } from './components/BarcodeLabelPickerModal';

export function InventoryPage({
  products = [],
  initialLabelsOpen = false,
  taxRatePercent = 15,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const headerSearchSlot = useHeaderSearchSlot();
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(Boolean(initialLabelsOpen));

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // 1. Search Query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.barcode.toLowerCase().includes(q);

      // 2. Category Filter
      const matchesCategory =
        categoryFilter === 'all' || prod.category === categoryFilter;

      // 3. Stock Status Filter
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = prod.stock > 10;
      if (stockFilter === 'low_stock') matchesStock = prod.stock > 0 && prod.stock <= 10;
      if (stockFilter === 'out_of_stock') matchesStock = prod.stock <= 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockFilter]);

  const isFiltered =
    Boolean(searchQuery.trim()) ||
    categoryFilter !== 'all' ||
    stockFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStockFilter('all');
  };

  const handleOpenAdd = () => {
    setProductToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setProductToEdit(prod);
    setIsFormOpen(true);
  };

  const handleDeleteWithConfirm = (productId) => {
    const target = products.find((p) => p.id === productId);
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المنتج "${target ? target.name : ''}" من الكتالوج؟`
    );
    if (confirmed && onDeleteProduct) {
      onDeleteProduct(productId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-y-auto font-sans pb-10">
      {/* Top Metrics Cards */}
      <InventorySummaryCards products={products} />

      {/* Filter and Search Bar */}
      <InventoryFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        onOpenAddModal={handleOpenAdd}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
        searchPortalTarget={headerSearchSlot}
      />

      {/* Products Table */}
      <div className="flex-1">
        <ProductListTable
          products={filteredProducts}
          onEditProduct={handleOpenEdit}
          onDeleteProduct={handleDeleteWithConfirm}
          onAdjustStock={onAdjustStock}
          onOpenBarcodeModal={(prod) => setBarcodeProduct(prod)}
        />
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        productToEdit={productToEdit}
        onSaveProduct={onSaveProduct}
      />

      {/* Barcode Label Picker */}
      <BarcodeLabelPickerModal
        isOpen={isLabelPickerOpen}
        onClose={() => setIsLabelPickerOpen(false)}
        products={products}
        onSelectProduct={(product) => {
          setIsLabelPickerOpen(false);
          setBarcodeProduct(product);
        }}
      />

      {/* Barcode Shelf Label Modal */}
      <BarcodeLabelModal
        isOpen={Boolean(barcodeProduct)}
        onClose={() => setBarcodeProduct(null)}
        product={barcodeProduct}
        taxRatePercent={taxRatePercent}
      />
    </div>
  );
}

export default InventoryPage;
