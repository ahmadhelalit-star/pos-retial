import { translateUI as t,useLocale } from "../../runtime/i18n.js";
import { tracksInventory } from '../../domain/products';
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
  serverTotal,
  taxRatePercent = 15,
  onSaveProduct,
  onLoadVariantBalances,
  onDeleteProduct,
  onAdjustStock,
  serverQuery,
  onServerQueryChange,
  permissions,
  ledgerMode = false,
  financialOptions,
  onPrepareLabels,
  onOpenCategories,
}) {
  useLocale();
  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState('all');
  const searchQuery = serverQuery?.q ?? localSearch;
  const categoryFilter = serverQuery?.category ?? localCategory;
  const setSearchQuery = value => serverQuery ? onServerQueryChange({ q: value }) : setLocalSearch(value);
  const setCategoryFilter = value => serverQuery ? onServerQueryChange({ category: value }) : setLocalCategory(value);
  const headerSearchSlot = useHeaderSearchSlot();
  const [localStock, setLocalStock] = useState('all');
  const stockFilter = serverQuery?.stock ?? localStock;
  const setStockFilter = value => serverQuery ? onServerQueryChange({ stock: value }) : setLocalStock(value);
  const allowed = permission => !permissions || permissions.includes(permission);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(Boolean(initialLabelsOpen));

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (serverQuery) return products;
    return products.filter((prod) => {
      // 1. Search Query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        (prod.barcode || '').toLowerCase().includes(q);

      // 2. Category Filter
      const matchesCategory =
        categoryFilter === 'all' || prod.category === categoryFilter;

      // 3. Stock Status Filter
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = tracksInventory(prod) && prod.stock > 10;
      if (stockFilter === 'low_stock') matchesStock = tracksInventory(prod) && prod.stock > 0 && prod.stock <= 10;
      if (stockFilter === 'out_of_stock') matchesStock = tracksInventory(prod) && prod.stock <= 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockFilter, serverQuery]);

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
      `هل تريد ${ledgerMode ? 'أرشفة' : 'حذف'} المنتج "${target ? target.name : ''}" من الكتالوج؟`
    );
    if (confirmed && onDeleteProduct) {
      onDeleteProduct(productId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-y-auto font-sans pb-10">
      {/* Top Metrics Cards */}
      {serverQuery && <p className="px-4 pt-3 text-xs text-gray-500">{t("ملخص الصفحة الحالية / Current page summary")}</p>}
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
        canCreate={allowed('catalog.create')}
        onOpenCategories={onOpenCategories}
      />

      {/* Products Table */}
      <div className="flex-1">
        <ProductListTable
          products={filteredProducts}
          onEditProduct={handleOpenEdit}
          onDeleteProduct={handleDeleteWithConfirm}
          onAdjustStock={onAdjustStock}
          onOpenBarcodeModal={(prod) => onPrepareLabels ? onPrepareLabels(prod) : setBarcodeProduct(prod)}
          canEdit={allowed('catalog.update')}
          canArchive={allowed('catalog.archive')}
          canStock={allowed('stock.post')}
          ledgerMode={ledgerMode}
        />
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        productToEdit={productToEdit}
        onSaveProduct={onSaveProduct}
        onLoadVariantBalances={onLoadVariantBalances}
        canDistributeStock={allowed('stock.post')}
        stockReadOnly={ledgerMode&&(Boolean(productToEdit)||!allowed('stock.post'))}
        financialOptions={financialOptions}
      />

      {/* Barcode Label Picker */}
      <BarcodeLabelPickerModal
        isOpen={isLabelPickerOpen}
        onClose={() => setIsLabelPickerOpen(false)}
        products={products}
        serverQuery={serverQuery}
        serverTotal={serverTotal}
        onServerQueryChange={onServerQueryChange}
        onSelectProduct={(product) => {
          setIsLabelPickerOpen(false);
          if(onPrepareLabels)onPrepareLabels(product);else setBarcodeProduct(product);
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
