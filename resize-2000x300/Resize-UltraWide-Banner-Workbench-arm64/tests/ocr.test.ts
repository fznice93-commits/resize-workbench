import test from"node:test";import assert from"node:assert/strict";import{criticalTokens,missingCriticalTokens,textConsistency,type OCRObservation}from"../src/server/ocr.js";
const item=(text:string,height=.08,confidence=.9):OCRObservation=>({text,confidence,x:.1,y:.1,width:.3,height});

test("critical OCR normalizes punctuation but preserves numeric identity",()=>{assert.deepEqual([...criticalTokens([item("100,000 mAh"),item("100%"),item("2026"),item("drc-store.tecno.com")])].sort(),["num:100","num:100000","num:2026","url:drc-store.tecno.com"].sort());assert.deepEqual(missingCriticalTokens([item("100,000 mAh")],[item("10,000 mAh")]),["num:100000"])});

test("critical OCR ignores small low-priority copy and accepts exact normalized values",()=>{assert.deepEqual([...criticalTokens([item("1 Year",.019),item("100W Max",.021),item("2026",.03),item("100, 000 mAh",.2,.3)])].sort(),["num:100000","num:2026"].sort());assert.deepEqual(missingCriticalTokens([item("100,000 mAh"),item("2026")],[item("100000 mAh"),item("2026")]),[])});

test("semantic OCR detects a missing independent brand occurrence",()=>{const source=[item("TECNO",.08),item("La Boutique TECNO",.08),item("accessible en ligne",.07)],output=[item("La Boutique TECNO",.08),item("accessible en ligne",.07)],check=textConsistency(source,output);assert.deepEqual(check.missingWords,["tecno"]);assert.deepEqual(check.duplicateWords,[])});

test("semantic OCR requires multiple excess words before runtime rejects a duplicated group",()=>{const source=[item("Profitez des Meilleures Offres",.04)],output=[item("Profitez des Meilleures Offres",.04),item("Profitez des Meilleures Offres",.04)],check=textConsistency(source,output);assert.deepEqual(check.missingWords,[]);assert.deepEqual(check.duplicateWords.sort(),["meilleures","offres","profitez"].sort())});
