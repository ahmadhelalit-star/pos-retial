import {createContext,useContext,useMemo} from 'react';

export const CATEGORIES = [
  { id: 'all', name: 'جميع المنتجات', icon: '🏪' },
  { id: 'beverages', name: 'المشروبات والعصائر', icon: '🥤' },
  { id: 'dairy', name: 'الألبان والأجبان', icon: '🧀' },
  { id: 'bakery', name: 'المخبوزات والحلويات', icon: '🥐' },
  { id: 'canned', name: 'المعلبات والأغذية', icon: '🥫' },
  { id: 'snacks', name: 'سناكس وتسالي', icon: '🍫' },
  { id: 'cleaning', name: 'المنظفات والعناية', icon: '🧼' },
];

export const CategoryContext=createContext([]);
export function categoryOptions(rows){
  return [CATEGORIES[0],...rows.map(row=>{
    const original=CATEGORIES.find(value=>value.id===row.id);
    return {...row,name:row.name===row.id&&original?original.name:row.name,icon:original?.icon??'🏷️'};
  })];
}
export function useCategories(){const rows=useContext(CategoryContext);return useMemo(()=>categoryOptions(rows),[rows]);}
