import { translateUI as t,useLocale } from "../../../runtime/i18n.js";
import { ListBulletIcon, Squares2X2Icon } from '../../../components/common/Icons';

export function CategoryBar({
  categories,
  activeCategory,
  onSelectCategory,
  viewMode = 'grid',
  onViewModeChange,
}) {
  useLocale();
  return (
    <div className="flex items-end gap-2 select-none">
      <div className="scrollbar-none flex flex-1 items-center gap-1.5 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-150 cursor-pointer active:scale-95 ${
                isActive
                  ? 'border-[#00236f] bg-[#00236f] text-white'
                  : 'border-[#c5c5d3]/70 bg-white text-gray-600 hover:border-[#00236f]/40 hover:bg-[#f0f3ff] hover:text-[#00236f]'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex shrink-0 items-center gap-0.5 rounded-full border border-[#c5c5d3]/70 bg-white p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange?.('grid')}
          aria-label={t("عرض شبكة")}
          aria-pressed={viewMode === 'grid'}
          title={t("عرض شبكة")}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-[#00236f] text-white'
              : 'text-gray-500 hover:bg-[#f0f3ff] hover:text-[#00236f]'
          }`}
        >
          <Squares2X2Icon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange?.('list')}
          aria-label={t("عرض قائمة")}
          aria-pressed={viewMode === 'list'}
          title={t("عرض قائمة")}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
            viewMode === 'list'
              ? 'bg-[#00236f] text-white'
              : 'text-gray-500 hover:bg-[#f0f3ff] hover:text-[#00236f]'
          }`}
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
