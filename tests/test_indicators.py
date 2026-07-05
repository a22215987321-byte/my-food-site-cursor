import math
import unittest

from finance_agent import calculate_indicators, calculate_kdj, calculate_rsi, moving_average


def make_rows(count=30, flat=False):
    rows = []
    for i in range(count):
        close = 100.0 if flat else 100.0 + i
        high = close if flat else close + 1
        low = close if flat else close - 1
        rows.append({
            "date": f"2026-01-{(i % 28) + 1:02d}",
            "open": close,
            "high": high,
            "low": low,
            "close": close,
            "volume": 1000 + i,
        })
    return rows


class IndicatorTest(unittest.TestCase):
    def test_rsi_has_no_nan_on_uptrend(self):
        result = calculate_rsi([100 + i for i in range(20)], 14)
        self.assertTrue(result["valid"])
        self.assertTrue(math.isfinite(result["value"]))
        self.assertEqual(result["value"], 100.0)

    def test_rsi_returns_neutral_on_flat_market_no_zero_division(self):
        result = calculate_rsi([100 for _ in range(20)], 14)
        self.assertTrue(result["valid"])
        self.assertTrue(math.isfinite(result["value"]))
        self.assertEqual(result["value"], 50.0)

    def test_rsi_reports_insufficient_data(self):
        result = calculate_rsi([100, 101, 102], 14)
        self.assertFalse(result["valid"])
        self.assertIn("need at least", result["reason"])

    def test_kdj_has_no_nan_with_valid_rows(self):
        result = calculate_kdj(make_rows(12), 9)
        self.assertTrue(result["valid"])
        for value in result["value"].values():
            self.assertTrue(math.isfinite(value))

    def test_kdj_reports_zero_range(self):
        result = calculate_kdj(make_rows(12, flat=True), 9)
        self.assertFalse(result["valid"])
        self.assertIn("range is zero", result["reason"])

    def test_moving_average_reports_insufficient_data(self):
        result = moving_average([1, 2, 3], 20)
        self.assertFalse(result["valid"])

    def test_calculate_indicators_never_returns_nan(self):
        indicators = calculate_indicators(make_rows(70))
        self.assertTrue(indicators["rsi14"]["valid"])
        self.assertTrue(indicators["kdj9"]["valid"])
        self.assertTrue(indicators["ma20"]["valid"])
        self.assertTrue(indicators["ma60"]["valid"])
        self.assertTrue(math.isfinite(indicators["rsi14"]["value"]))
        self.assertTrue(math.isfinite(indicators["ma20"]["value"]))
        self.assertTrue(math.isfinite(indicators["ma60"]["value"]))


if __name__ == "__main__":
    unittest.main()
