import unittest

from finance_agent import Asset, analyze, build_father_reply


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


MENTOR_CONTEXT = {
    "dateKey": "2026-07-05",
    "rubricSummary": "今日重點：數值安全、資料限制、風險邊界。",
    "directives": [
        "回覆開頭先說資料來源、時間點與可能延遲，再談解讀。",
        "結尾必須包含「僅供陪伴聊天參考，非投資建議」。",
    ],
    "errorList": [],
    "improvements": [],
}


class FinanceMentorContextTest(unittest.TestCase):
    def test_analyze_with_mentor_context_keeps_no_nan(self):
        result = analyze(
            {
                "userId": "u1",
                "message": "NVDA RSI KDJ 怎麼看？",
                "history": [],
                "mentorContext": MENTOR_CONTEXT,
            },
            providers=[MockProvider(valid_rows())],
        )
        self.assertTrue(result["numericValidation"]["noNaN"])
        self.assertIn("非投資建議", result["reply"])

    def test_mentor_context_adds_structure_sections(self):
        asset = Asset("US:NVDA", "US", "NVDA", "NVIDIA", "stock", "USD")
        quote = {"price": 120.5, "changePct": 1.2, "currency": "USD", "source": "mock", "asOf": "2026-07-05"}
        indicators = {
            "rsi14": {"valid": True, "value": 55.0},
            "kdj9": {"valid": False},
            "ma20": {"valid": True, "value": 118.0},
        }
        reply = build_father_reply(asset, quote, indicators, [], MENTOR_CONTEXT)
        self.assertIn("【資料限制】", reply)
        self.assertIn("【重點解讀】", reply)
        self.assertIn("【風險提醒】", reply)
        self.assertIn("非投資建議", reply)

    def test_mentor_context_does_not_remove_disclaimer_on_bad_data(self):
        rows = valid_rows(20)
        rows[-1] = {**rows[-1], "close": float("nan")}
        result = analyze(
            {
                "userId": "u1",
                "message": "NVDA 技術指標？",
                "history": [],
                "mentorContext": MENTOR_CONTEXT,
            },
            providers=[MockProvider(rows)],
        )
        self.assertTrue(result["numericValidation"]["noNaN"])
        self.assertIn("非投資建議", result["reply"])


if __name__ == "__main__":
    unittest.main()
