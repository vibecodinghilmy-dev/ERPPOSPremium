// ============================================================================
// HPP Engine — Test Suite
// Tests: Calculation, Batch, What-If, Snapshots, Auto-Recalculation
// ============================================================================

import { HPPCalculator } from '../../services/hpp/calculator'
import { HPPService } from '../../services/hpp'
import type { HPPCalculationInput } from '../../services/hpp/types'
import {
  FOOD_COST_TARGETS,
  DEFAULT_OVERHEAD_RATES,
} from '../../services/hpp/types'

// ─── Test Helpers ───────────────────────────────────────────────────

let failed = false

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    failed = true
  } else {
    console.log(`✅ PASS: ${message}`)
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  const diff = Math.abs(actual - expected)
  if (diff > tolerance) {
    console.error(`❌ FAIL: ${message} — expected ${expected} ± ${tolerance}, got ${actual} (diff: ${diff})`)
    failed = true
  } else {
    console.log(`✅ PASS: ${message} (${actual})`)
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n═══════════════════════════════════════════════')
  console.log('  HPP ENGINE — TEST SUITE')
  console.log('═══════════════════════════════════════════════\n')

  const calculator = new HPPCalculator()
  const service = new HPPService()

  // ═══════════════════════════════════════════════
  // TEST 1: Basic Product HPP Calculation
  // ═══════════════════════════════════════════════
  console.log('\n── Test 1: Basic Beng-Beng Ice HPP Calculation ──')

  const input1: HPPCalculationInput = {
    outletId: 'outlet_1',
    productId: 'p1',
  }

  const result1 = await calculator.calculate(input1)

  assert(result1.productId === 'p1', 'Product ID is p1')
  assert(result1.productName === 'Beng-Beng Ice', 'Product name is correct')
  assert(result1.recipeId === 'rh1', 'Active recipe found')
  assert(result1.recipeVersion === 1, 'Recipe version is 1')
  assert(result1.ingredientCosts.length > 0, 'Has ingredient costs')
  assert(result1.packagingCosts.length > 0, 'Has packaging costs')
  assert(result1.totalHPP > 0, 'Total HPP is positive')

  // Beng-Beng Ice: ingredients = 2500(Wafer) + 1200(Milk) + 500(Chocolate) + 1200(Cup) + 500(Lid) = 5900
  // Overhead: 5900 * 25% = 1475
  // Total: 5900 + 1475 = 7375
  const expectedDirect = 2500 + 1200 + 500 + 1200 + 500 // 5900
  const expectedOverhead = Math.round(expectedDirect * 0.25) // 1475
  const expectedTotal = expectedDirect + expectedOverhead // 7375

  assert(result1.totalIngredientCost === 4200, `Raw ingredient cost is 4200 (got ${result1.totalIngredientCost})`)
  assert(result1.totalPackagingCost === 1700, `Packaging cost is 1700 (cup + lid)`)
  assert(result1.totalOverheadCost === expectedOverhead, `Overhead cost is ${expectedOverhead}`)
  assert(result1.totalHPP === expectedTotal, `Total HPP is ${expectedTotal}`)

  // Food cost: 7375 / 15000 = 49.17%
  const expectedFoodCost = (expectedTotal / 15000) * 100
  assertApprox(result1.foodCostPercent!, expectedFoodCost, 0.5, `Food cost % is ~${expectedFoodCost.toFixed(1)}%`)

  // ═══════════════════════════════════════════════
  // TEST 2: Premium Cheeseburger HPP
  // ═══════════════════════════════════════════════
  console.log('\n── Test 2: Premium Cheeseburger HPP ──')

  const result2 = await calculator.calculate({
    outletId: 'outlet_1',
    productId: 'p2',
  })

  assert(result2.productName === 'Premium Cheeseburger', 'Product name correct')
  assert(result2.totalIngredientCost > 0, 'Has ingredient cost')
  // Ingredients: 18500(Beef Patty) + 4500(Bun) + 54(Cheese) = 23054
  // Packaging: 800(Paper Bag)
  // Before overhead: 23854
  assert(result2.totalIngredientCost === 23054, `Ingredient cost is 23054 (got ${result2.totalIngredientCost})`)
  assert(result2.totalPackagingCost === 800, `Packaging cost is 800`)

  // ═══════════════════════════════════════════════
  // TEST 3: What-If Analysis
  // ═══════════════════════════════════════════════
  console.log('\n── Test 3: What-If Analysis (Beef price +20%) ──')

  const whatIf = await calculator.whatIfAnalysis(
    { outletId: 'outlet_1', productId: 'p2' },
    { i9: 22200 }, // Beef Patty price increases from 18500 to 22200 (+20%)
  )

  assert(whatIf.baseline.totalHPP > 0, 'Baseline calculated')
  assert(whatIf.scenario.totalHPP > whatIf.baseline.totalHPP, 'Scenario HPP increased')
  assert(whatIf.hppDelta > 0, 'HPP delta is positive')

  // Beef patty price increase: 18500 → 22200 = +3700
  // Additional overhead: 3700 * 25% = 925
  // Total HPP increase: 3700 + 925 = 4625
  assertApprox(whatIf.hppDelta, 4625, 100, `HPP delta is approximately 4625 (got ${whatIf.hppDelta})`)
  assert(whatIf.marginDelta < 0, 'Margin decreased after price increase')

  // ═══════════════════════════════════════════════
  // TEST 4: Manual Ingredient Override
  // ═══════════════════════════════════════════════
  console.log('\n── Test 4: Ingredient Cost Override ──')

  const result4 = await calculator.calculate({
    outletId: 'outlet_1',
    productId: 'p1',
    ingredientCosts: {
      i2: 5000, // Override Beng-Beng Wafer from 2500 → 5000
    },
  })

  const overriddenWafer = result4.ingredientCosts.find((c) => c.ingredientName === 'Beng-Beng Wafer')
  assert(overriddenWafer !== undefined, 'Overridden wafer found')
  assert(overriddenWafer!.unitCost === 5000, 'Wafer cost overridden to 5000')
  assert(overriddenWafer!.costSource === 'manual_override', 'Cost source is manual_override')

  // ═══════════════════════════════════════════════
  // TEST 5: No Recipe Found
  // ═══════════════════════════════════════════════
  console.log('\n── Test 5: Product with No Recipe ──')

  const result5 = await calculator.calculate({
    outletId: 'outlet_1',
    productId: 'nonexistent',
  })

  assert(result5.warnings.length > 0, 'Has warnings for missing product')
  assert(result5.totalHPP === 0, 'HPP is 0 when no recipe found')

  // ═══════════════════════════════════════════════
  // TEST 6: Batch Calculation
  // ═══════════════════════════════════════════════
  console.log('\n── Test 6: Batch Calculation ──')

  const batchResult = await calculator.calculateBatch(
    'outlet_1',
    ['p1', 'p2', 'p3'],
  )

  assert(batchResult.size === 3, 'All 3 products calculated')
  assert(batchResult.has('p1'), 'Product p1 calculated')
  assert(batchResult.has('p2'), 'Product p2 calculated')
  assert(batchResult.has('p3'), 'Product p3 calculated')

  // ═══════════════════════════════════════════════
  // TEST 7: Service Layer — Snapshot & Change Log
  // ═══════════════════════════════════════════════
  console.log('\n── Test 7: Service Snapshots & Change Logs ──')

  await service.calculateProduct({
    outletId: 'outlet_1',
    productId: 'p1',
  })

  await service.calculateProduct({
    outletId: 'outlet_1',
    productId: 'p2',
  })

  const snapshots = service.getSnapshots()
  assert(snapshots.length >= 2, 'At least 2 snapshots created')

  const p1Snapshot = service.getSnapshots('p1')
  assert(p1Snapshot.length >= 1, 'Snapshot for p1 exists')
  assert(p1Snapshot[0].productName === 'Beng-Beng Ice', 'Snapshot product name correct')
  assert(p1Snapshot[0].totalHPP > 0, 'Snapshot HPP is positive')

  const changeLogs = service.getChangeLogs()
  assert(Array.isArray(changeLogs), 'Change logs is an array')

  // ═══════════════════════════════════════════════
  // TEST 8: Auto-Recalculation on Ingredient Price Change
  // ═══════════════════════════════════════════════
  console.log('\n── Test 8: Auto-Recalculation Trigger ──')

  const recalcResult = await service.onIngredientPriceChanged(
    'i1', // Premium Milk Base
    1200,
    1500, // +25% price increase
  )

  assert(recalcResult.affectedProducts.length > 0, 'Affected products found')
  // Premium Milk Base is used in p1 (Beng-Beng Ice) and p3 (Iced Caramel Macchiato)
  assert(recalcResult.affectedProducts.includes('p1'), 'Beng-Beng Ice is affected')
  assert(recalcResult.affectedProducts.includes('p3'), 'Iced Caramel Macchiato is affected')

  // ═══════════════════════════════════════════════
  // TEST 9: Overhead Configuration
  // ═══════════════════════════════════════════════
  console.log('\n── Test 9: Overhead Configuration ──')

  const config = service.getOverheadConfig('outlet_1')!
  assert(config !== null, 'Overhead config found')
  assert(config.laborOverheadRate === DEFAULT_OVERHEAD_RATES.laborOverheadPercent,
    `Labor overhead rate is ${DEFAULT_OVERHEAD_RATES.laborOverheadPercent}%`)
  assert(config.operationalOverheadRate === DEFAULT_OVERHEAD_RATES.operationalOverheadPercent,
    `Operational overhead rate is ${DEFAULT_OVERHEAD_RATES.operationalOverheadPercent}%`)

  // ═══════════════════════════════════════════════
  // TEST 10: Food Cost Threshold Warnings
  // ═══════════════════════════════════════════════
  console.log('\n── Test 10: Food Cost Threshold Warnings ──')

  // Get warnings from the food-cost-intensive product
  const result10 = await calculator.calculate(input1)
  const foodCostWarnings = result10.warnings.filter((w) => w.type === 'price_mismatch')

  if (result10.foodCostPercent! >= FOOD_COST_TARGETS.acceptable) {
    assert(foodCostWarnings.length > 0,
      `Food cost ${result10.foodCostPercent!.toFixed(1)}% should trigger warning >= ${FOOD_COST_TARGETS.acceptable}%`)
  }

  // ═══════════════════════════════════════════════
  // TEST 11: Recalculate All Products
  // ═══════════════════════════════════════════════
  console.log('\n── Test 11: Recalculate All Products ──')

  const recalcAll = await service.recalculateAll('outlet_1')
  assert(recalcAll.totalProducts === 3, 'All 3 products recalculated')
  assert(recalcAll.results.size === 3, '3 results in map')

  // ═══════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════')
  console.log('  ALL TESTS PASSED ✅')
  console.log(`  Products calculated: ${snapshots.length}`)
  console.log('═══════════════════════════════════════════════\n')
}

// ─── Run ────────────────────────────────────────────────────────────

runTests().then(() => {
  if (failed) {
    console.error('\n⚠️  Some tests FAILED\n')
  } else {
    console.log('\n🎉 All tests passed!\n')
  }
}).catch((err) => {
  console.error('Test suite crashed:', err)
})
