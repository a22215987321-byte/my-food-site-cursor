import math
import unittest

from finance_agent import Asset, analyze


class MockProvider:
    name = "mock-market"

    def __init__(self, rows):
        self.rows = rows

    def search_assets(self, query):
        return [Asset("US:NVDA", "US", "NVDA", "NVIDIA", "stock", "USD")]

    def get_quote(self, asset):
        last = self.rows[-1]
        prev = self.rows[-2]
        return {
            "assetId": asset.asset_id,
            "price": float(last["close"]),
            "changePct": (float(last["close"]) - float(prev["close"])) / float(prev["close"]) * 100,
            "currency": "USD",
            "source": self.name,
            "asOf": last["date"],
        }

    def get_ohlcv(self, asset, days=90):
        return self.rows[-days:]


def valid_rows(count=80):
    return [
        {
            "date": f"2026-02-{(i % 28) + 1:02d}",
            "open": 100 + i,
            "high": 101 + i,
            "low": 99 + i,
            "close": 100.5 + i,
            "volume": 10000 + i,
        }
        for i in range(count)
    ]


class FinanceAgentMockTest(unittest.TestCase):
    def test_analyze_returns_contract_with_no_nan(self):
        result = analyze(
            {"userId": "u1", "message": "NVDA RSI KDJ 怎麼看？", "history": []},
            providers=[MockProvider(valid_rows())],
        )
        self.assertIn("reply", result)
        self.assertIn("numericValidation", result)
        self.assertTrue(result["numericValidation"]["ok"])
        self.assertTrue(result["numericValidation"]["noNaN"])
        self.assertIn("US:NVDA", result["assetIds"])
        self.assertIn("非投資建議", result["reply"])

    def test_analyze_degrades_safely_on_bad_data(self):
        rows = valid_rows(20)
        rows[-1] = {**rows[-1], "close": float("nan")}
        result = analyze(
            {"userId": "u1", "message": "NVDA 技術指標？", "history": []},
            providers=[MockProvider(rows)],
        )
        self.assertFalse(result["numericValidation"]["ok"])
        self.assertTrue(result["numericValidation"]["noNaN"])
        self.assertGreater(len(result["warnings"]), 0)
        self.assertIn("非投資建議", result["reply"])

    def test_analyze_without_symbol_still_answers_safely(self):
        result = analyze({"userId": "u1", "message": "今天市場怎麼看？", "history": []}, providers=[MockProvider(valid_rows())])
        self.assertEqual(result["assetIds"], [])
        self.assertTrue(result["numericValidation"]["ok"])
        self.assertIsInstance(result["reply"], str)
        self.assertGreater(len(result["reply"]), 20)

    def test_mock_rows_are_finite(self):
        for row in valid_rows():
            for field in ("open", "high", "low", "close", "volume"):
                self.assertTrue(math.isfinite(float(row[field])))


if __name__ == "__main__":
    unittest.main()
