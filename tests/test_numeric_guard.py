import math
import unittest

from finance_agent import FinanceValidationError, finite_number, safe_div, validate_ohlcv


class NumericGuardTest(unittest.TestCase):
    def test_finite_number_accepts_string_numbers(self):
        self.assertEqual(finite_number("123.45", "price"), 123.45)

    def test_finite_number_rejects_nan(self):
        with self.assertRaises(FinanceValidationError):
            finite_number(float("nan"), "price")

    def test_finite_number_rejects_infinity(self):
        with self.assertRaises(FinanceValidationError):
            finite_number(float("inf"), "price")

    def test_safe_div_rejects_zero_denominator(self):
        with self.assertRaises(FinanceValidationError):
            safe_div(1, 0, "return")

    def test_validate_ohlcv_rejects_missing_close(self):
        rows = [{"date": "2026-01-01", "open": 10, "high": 11, "low": 9, "volume": 1000}]
        with self.assertRaises(FinanceValidationError):
            validate_ohlcv(rows)

    def test_validate_ohlcv_rejects_invalid_range(self):
        rows = [{"date": "2026-01-01", "open": 10, "high": 9, "low": 11, "close": 10, "volume": 1000}]
        with self.assertRaises(FinanceValidationError):
            validate_ohlcv(rows)

    def test_validate_ohlcv_accepts_extreme_but_finite_values(self):
        rows = [{"date": "2026-01-01", "open": 1e9, "high": 1.1e9, "low": 9e8, "close": 1.05e9, "volume": 1e12}]
        clean = validate_ohlcv(rows)
        for field in ("open", "high", "low", "close", "volume"):
            self.assertTrue(math.isfinite(clean[0][field]))


if __name__ == "__main__":
    unittest.main()
