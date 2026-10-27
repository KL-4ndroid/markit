import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductCoverPhotoField} from '../components/products/ProductCoverPhotoField';
import assert from 'node:assert/strict';
import {decodeProductPhotoImage,applyProductPhotoRead,canHideDisabledProductPhoto,classifyProductPhotoRead,mergeProductPhotoMetadata,parseProductPhotoMetadata} from '../lib/products/product-cover-photo-read';

assert.equal(classifyProductPhotoRead(404,'photo_empty'),'empty');
assert.equal(classifyProductPhotoRead(404,'disabled'),'disabled');
for(const [status,code] of [[404,'not_found'],[403,'permission_denied'],[401,'authentication_required'],[503,'unavailable'],[503,'photo_pending'],[500,null],[200,'photo_empty']] as const) {
 assert.equal(classifyProductPhotoRead(status,code),'unavailable');
}
const previous={productId:'a',url:'blob:existing',state:'existing' as const};
for(const state of ['unavailable','disabled'] as const) {
 assert.equal(applyProductPhotoRead(previous,'a',{state}).url,'blob:existing','read failures must retain a known image');
 assert.equal(applyProductPhotoRead(previous,'b',{state}).url,null,'a different product must never reuse the previous image');
}
assert.equal(applyProductPhotoRead(previous,'a',{state:'empty'}).url,null);
assert.equal(applyProductPhotoRead(previous,'a',{state:'existing',url:'blob:new'}).url,'blob:new');
assert.deepEqual(previous,{productId:'a',url:'blob:existing',state:'existing'});

assert.deepEqual(parseProductPhotoMetadata(200,{state:'ready',photos:{}}),{state:'ready',photos:{}});
assert.equal(parseProductPhotoMetadata(200,{photos:{}}).state,'unavailable','legacy empty map is not proof of absence');
assert.equal(parseProductPhotoMetadata(503,{code:'disabled'}).state,'disabled');
for(const body of [null,[],{state:'ready',photos:[]},{state:'ready',photos:{a:'1'}},{state:'ready',photos:{a:0}},{state:'ready',photos:{a:NaN}},{state:'ready',photos:{a:Number.MAX_SAFE_INTEGER+1}}]) assert.equal(parseProductPhotoMetadata(200,body).state,'unavailable');
assert.deepEqual(parseProductPhotoMetadata(200,{state:'ready',photos:{a:1793080565714}}),{state:'ready',photos:{a:1793080565714}});
assert.equal(parseProductPhotoMetadata(503,{state:'ready',photos:{}}).state,'unavailable');
const versions={a:5};
assert.deepEqual(mergeProductPhotoMetadata(versions,[{state:'unavailable'}]),{photos:{a:5},state:'unavailable'});
assert.deepEqual(mergeProductPhotoMetadata(versions,[{state:'disabled'}]),{photos:{a:5},state:'disabled'});
assert.deepEqual(mergeProductPhotoMetadata(versions,[{state:'ready',photos:{b:7}},{state:'unavailable'}]),{photos:{a:5,b:7},state:'unavailable'});
assert.deepEqual(mergeProductPhotoMetadata(versions,[{state:'ready',photos:{}}]),{photos:{},state:'ready'});
assert.deepEqual(versions,{a:5});

const emptyDisabled={disabled:true,productId:'a',hasSelection:false,presence:'empty' as const,pendingChecked:true,hasPending:false};
assert.equal(canHideDisabledProductPhoto(emptyDisabled),true);
for(const input of [{...emptyDisabled,presence:'existing' as const},{...emptyDisabled,presence:'unavailable' as const},{...emptyDisabled,presence:undefined},{...emptyDisabled,pendingChecked:false},{...emptyDisabled,hasPending:true},{...emptyDisabled,hasSelection:true},{...emptyDisabled,disabled:false}]) assert.equal(canHideDisabledProductPhoto(input),false);
assert.equal(canHideDisabledProductPhoto({...emptyDisabled,productId:undefined}),true);
console.log('PASS explicit photo states, stale-image preservation, scoped retries, partial metadata failure and pending-data visibility');

async function httpCases() {
 const uploaded=await decodeProductPhotoImage(new Response(new Blob(['image'],{type:'image/webp'})));
 assert.equal(uploaded.state,'existing');
 assert.equal((await decodeProductPhotoImage(new Response('html',{headers:{'Content-Type':'text/html'}}))).state,'unavailable');
 assert.equal((await decodeProductPhotoImage(new Response(new Blob([],{type:'image/jpeg'})))).state,'unavailable');
 for(const [status,code,state] of [[404,'photo_empty','empty'],[404,'disabled','disabled'],[404,'not_found','unavailable'],[503,'unavailable','unavailable'],[401,'authentication_required','unavailable']] as const) {
  assert.equal((await decodeProductPhotoImage(Response.json({code},{status}))).state,state);
 }
 assert.equal((await decodeProductPhotoImage(new Response('bad json',{status:503}))).state,'unavailable');
 console.log('PASS authenticated image HTTP decoding: valid binary, explicit absence, pause, auth, broken server response');
}
void httpCases().catch(error=>{console.error(error);process.exitCode=1;});

for(const productId of [undefined,'initial-product']) {
 const markup=renderToStaticMarkup(React.createElement(ProductCoverPhotoField,{productId,productName:'測試商品',value:null,onChange:()=>undefined}));
 assert.match(markup,/正在確認商品照片功能/);
 assert.doesNotMatch(markup,/aspect-\[4\/3\]/,'initial/empty state must not reserve a giant empty image');
}
console.log('PASS new/existing photo fields render safely before local pending storage is available');
