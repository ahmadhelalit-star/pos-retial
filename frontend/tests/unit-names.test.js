import test from 'node:test';
import assert from 'node:assert/strict';
import {unitName,unitLabelReplacer} from '../../shared/unitNames.js';
import {normalizeProduct} from '../../shared/catalog.js';
test('legacy unit labels display as pieces without changing IDs, conversion, stock or source data',()=>{
 const old='حبة',piece='قطعة';
 const source={id:old,name:old,unit:old,stock:12,units:[{id:old,name:old,factor:1,price:3}]},before=structuredClone(source);
 const result=JSON.parse(JSON.stringify(source,unitLabelReplacer));assert.equal(result.unit,piece);assert.equal(result.units[0].name,piece);assert.equal(result.id,old);assert.equal(result.name,old);assert.equal(result.units[0].id,old);assert.equal(result.units[0].factor,1);assert.equal(result.stock,12);
 const normalized=normalizeProduct(source);assert.equal(normalized.unit,piece);assert.equal(normalized.units[0].name,piece);assert.equal(normalized.units[0].id,old);assert.deepEqual(source,before);assert.equal(unitName('kg'),'kg');assert.equal(normalizeProduct({}).unit,piece);
});
