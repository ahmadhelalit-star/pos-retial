// Display alias only: identifiers, factors and stored document snapshots stay intact.
export const unitName=value=>value==='حبة'?'قطعة':value;
export function unitLabelReplacer(key,value){
  return key==='unit'||(key==='name'&&this?.factor!==undefined)?unitName(value):value;
}
