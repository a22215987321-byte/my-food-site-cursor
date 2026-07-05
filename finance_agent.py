"""
Finance AI Dad core service.

This module is intentionally dependency-free so it can run in local tests,
CI, or a small HTTP service. It provides:
- A stable analyze contract for Next.js to call.
- Free/low-cost provider adapters (Stooq, TWSE, TPEx, SEC EDGAR, CoinGecko).
- Strict numeric validation so NaN/Infinity never enter indicators or replies.
- Mock-friendly indicator and response logic for unit tests.
"""

from __future__ import annotations

import csv
import json
import math
import re
import statistics
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, Iterable, List, Optional, Protocol, Tuple


class FinanceValidationError(ValueError):
    """Raised when market data is malformed or unsafe to use."""


def finite_number(value: Any, field: str) -> float:
    """Convert value to finite float or raise a structured validation error."""
    if value is None or value == "":
        raise FinanceValidationError(f"{field} is missing")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise FinanceValidationError(f"{field} is not numeric: {value!r}") from exc
    if not math.isfinite(number):
        raise FinanceValidationError(f"{field} is not finite: {value!r}")
    return number


def safe_div(numerator: float, denominator: float, field: str) -> float:
    numerator = finite_number(numerator, f"{field}.numerator")
    denominator = finite_number(denominator, f"{field}.denominator")
    if denominator == 0:
        raise FinanceValidationError(f"{field} denominator is zero")
    result = numerator / denominator
    if not math.isfinite(result):
        raise FinanceValidationError(f"{field} result is not finite")
    return result


def normalize_asset_id(asset_id: str) -> str:
    return (asset_id or "").strip().upper()


@dataclass(frozen=True)
class Asset:
    asset_id: str
    market: str
    symbol: str
    name: str
    asset_type: str
    currency: str

    def as_dict(self) -> Dict[str, str]:
        return {
            "assetId": self.asset_id,
            "market": self.market,
            "symbol": self.symbol,
            "name": self.name,
            "type": self.asset_type,
            "currency": self.currency,
        }


class MarketDataProvider(Protocol):
    name: str

    def search_assets(self, query: str) -> List[Asset]:
        ...

    def get_quote(self, asset: Asset) -> Dict[str, Any]:
        ...

    def get_ohlcv(self, asset: Asset, days: int = 90) -> List[Dict[str, Any]]:
        ...


COMMON_ASSETS: Dict[str, Asset] = {
    "台積電": Asset("TW:2330", "TW", "2330", "台積電", "stock", "TWD"),
    "TSMC": Asset("TW:2330", "TW", "2330", "台積電", "stock", "TWD"),
    "2330": Asset("TW:2330", "TW", "2330", "台積電", "stock", "TWD"),
    "NVDA": Asset("US:NVDA", "US", "NVDA", "NVIDIA", "stock", "USD"),
    "AAPL": Asset("US:AAPL", "US", "AAPL", "Apple", "stock", "USD"),
    "TSLA": Asset("US:TSLA", "US", "TSLA", "Tesla", "stock", "USD"),
    "BTC": Asset("CRYPTO:bitcoin", "CRYPTO", "bitcoin", "Bitcoin", "crypto", "USD"),
    "BITCOIN": Asset("CRYPTO:bitcoin", "CRYPTO", "bitcoin", "Bitcoin", "crypto", "USD"),
    "比特幣": Asset("CRYPTO:bitcoin", "CRYPTO", "bitcoin", "Bitcoin", "crypto", "USD"),
    "ETH": Asset("CRYPTO:ethereum", "CRYPTO", "ethereum", "Ethereum", "crypto", "USD"),
    "以太幣": Asset("CRYPTO:ethereum", "CRYPTO", "ethereum", "Ethereum", "crypto", "USD"),
}


def resolve_assets(message: str) -> List[Asset]:
    """Resolve common Taiwan/US/crypto names from a user message."""
    text = (message or "").upper()
    found: Dict[str, Asset] = {}
    for alias, asset in COMMON_ASSETS.items():
        if alias.upper() in text:
            found[asset.asset_id] = asset
    for token in re.findall(r"\b[A-Z]{1,5}\b|\b\d{4}\b", text):
        asset = COMMON_ASSETS.get(token)
        if asset:
            found[asset.asset_id] = asset
        elif re.fullmatch(r"[A-Z]{1,5}", token):
            found[f"US:{token}"] = Asset(f"US:{token}", "US", token, token, "stock", "USD")
        elif re.fullmatch(r"\d{4}", token):
            found[f"TW:{token}"] = Asset(f"TW:{token}", "TW", token, token, "stock", "TWD")
    return list(found.values())


def http_get_text(url: str, timeout: int = 8, headers: Optional[Dict[str, str]] = None) -> str:
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "EvonVChatFinanceAgent/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


class StooqProvider:
    name = "stooq"

    def search_assets(self, query: str) -> List[Asset]:
        return resolve_assets(query)

    def _stooq_symbol(self, asset: Asset) -> str:
        if asset.market == "US":
            return asset.symbol.lower()
        if asset.market == "TW":
            return f"{asset.symbol}.tw"
        raise FinanceValidationError(f"Stooq does not support {asset.asset_id}")

    def get_quote(self, asset: Asset) -> Dict[str, Any]:
        rows = self.get_ohlcv(asset, days=5)
        last = rows[-1]
        prev = rows[-2] if len(rows) > 1 else None
        change_pct = None
        if prev:
            change_pct = safe_div(last["close"] - prev["close"], prev["close"], "quote.changePct") * 100
        return {
            "assetId": asset.asset_id,
            "price": last["close"],
            "changePct": change_pct,
            "currency": asset.currency,
            "source": self.name,
            "asOf": last["date"],
        }

    def get_ohlcv(self, asset: Asset, days: int = 90) -> List[Dict[str, Any]]:
        symbol = urllib.parse.quote(self._stooq_symbol(asset))
        url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
        text = http_get_text(url)
        rows = list(csv.DictReader(text.splitlines()))
        parsed = [
            {
                "date": r.get("Date"),
                "open": r.get("Open"),
                "high": r.get("High"),
                "low": r.get("Low"),
                "close": r.get("Close"),
                "volume": r.get("Volume", 0),
                "source": self.name,
            }
            for r in rows[-days:]
        ]
        return validate_ohlcv(parsed)


class CoinGeckoProvider:
    name = "coingecko"

    def search_assets(self, query: str) -> List[Asset]:
        return [a for a in resolve_assets(query) if a.market == "CRYPTO"]

    def get_quote(self, asset: Asset) -> Dict[str, Any]:
        if asset.market != "CRYPTO":
            raise FinanceValidationError("CoinGecko only supports crypto assets")
        coin_id = urllib.parse.quote(asset.symbol.lower())
        url = (
            "https://api.coingecko.com/api/v3/simple/price"
            f"?ids={coin_id}&vs_currencies=usd&include_24hr_change=true"
        )
        data = json.loads(http_get_text(url))
        raw = data.get(asset.symbol.lower()) or {}
        price = finite_number(raw.get("usd"), "crypto.price")
        change = raw.get("usd_24h_change")
        return {
            "assetId": asset.asset_id,
            "price": price,
            "changePct": finite_number(change, "crypto.changePct") if change is not None else None,
            "currency": "USD",
            "source": self.name,
            "asOf": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    def get_ohlcv(self, asset: Asset, days: int = 90) -> List[Dict[str, Any]]:
        if asset.market != "CRYPTO":
            raise FinanceValidationError("CoinGecko only supports crypto assets")
        coin_id = urllib.parse.quote(asset.symbol.lower())
        url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart?vs_currency=usd&days={days}"
        data = json.loads(http_get_text(url))
        prices = data.get("prices") or []
        volumes = data.get("total_volumes") or []
        rows = []
        for idx, point in enumerate(prices):
            ts_ms, close = point
            volume = volumes[idx][1] if idx < len(volumes) else 0
            date = time.strftime("%Y-%m-%d", time.gmtime(ts_ms / 1000))
            rows.append({"date": date, "open": close, "high": close, "low": close, "close": close, "volume": volume, "source": self.name})
        return validate_ohlcv(rows)


class TwseProvider:
    name = "twse"

    def search_assets(self, query: str) -> List[Asset]:
        return [a for a in resolve_assets(query) if a.market == "TW"]

    def get_quote(self, asset: Asset) -> Dict[str, Any]:
        rows = self.get_ohlcv(asset, days=30)
        last = rows[-1]
        return {"assetId": asset.asset_id, "price": last["close"], "currency": "TWD", "source": self.name, "asOf": last["date"]}

    def get_ohlcv(self, asset: Asset, days: int = 90) -> List[Dict[str, Any]]:
        # TWSE monthly endpoint is kept as adapter skeleton; production code should
        # page month-by-month. Tests use mocks to avoid network and date dependence.
        today = time.strftime("%Y%m%d")
        url = f"https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date={today}&stockNo={asset.symbol}"
        data = json.loads(http_get_text(url))
        rows = []
        for r in data.get("data", [])[-days:]:
            rows.append({
                "date": r[0],
                "open": r[3].replace(",", ""),
                "high": r[4].replace(",", ""),
                "low": r[5].replace(",", ""),
                "close": r[6].replace(",", ""),
                "volume": r[1].replace(",", ""),
                "source": self.name,
            })
        return validate_ohlcv(rows)


class TpexProvider(TwseProvider):
    name = "tpex"


class SecEdgarProvider:
    name = "sec-edgar"

    def get_companyfacts(self, cik: str) -> Dict[str, Any]:
        cik_padded = str(cik).zfill(10)
        url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_padded}.json"
        text = http_get_text(url, headers={"User-Agent": "EvonVChatFinanceAgent contact@example.com"})
        return json.loads(text)


DEFAULT_PROVIDERS: List[MarketDataProvider] = [CoinGeckoProvider(), StooqProvider(), TwseProvider(), TpexProvider()]


def validate_ohlcv(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    clean: List[Dict[str, Any]] = []
    for idx, row in enumerate(rows):
        prefix = f"ohlcv[{idx}]"
        date = row.get("date")
        if not date:
            raise FinanceValidationError(f"{prefix}.date is missing")
        open_ = finite_number(row.get("open"), f"{prefix}.open")
        high = finite_number(row.get("high"), f"{prefix}.high")
        low = finite_number(row.get("low"), f"{prefix}.low")
        close = finite_number(row.get("close"), f"{prefix}.close")
        volume = finite_number(row.get("volume", 0), f"{prefix}.volume")
        if volume < 0:
            raise FinanceValidationError(f"{prefix}.volume is negative")
        if high < low:
            raise FinanceValidationError(f"{prefix}.high is lower than low")
        if not (low <= open_ <= high):
            raise FinanceValidationError(f"{prefix}.open is outside high-low range")
        if not (low <= close <= high):
            raise FinanceValidationError(f"{prefix}.close is outside high-low range")
        clean.append({
            "date": str(date),
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
            "source": row.get("source", "unknown"),
        })
    if not clean:
        raise FinanceValidationError("ohlcv is empty")
    return clean


def moving_average(values: List[float], window: int) -> Dict[str, Any]:
    if window <= 0:
        return {"valid": False, "reason": "window must be positive", "value": None}
    if len(values) < window:
        return {"valid": False, "reason": f"need at least {window} data points", "value": None, "dataPoints": len(values)}
    series = [finite_number(v, "ma.value") for v in values[-window:]]
    return {"valid": True, "value": sum(series) / window, "lookback": window, "dataPoints": len(values)}


def calculate_rsi(closes: List[float], period: int = 14) -> Dict[str, Any]:
    try:
        values = [finite_number(v, "rsi.close") for v in closes]
        if len(values) < period + 1:
            return {"valid": False, "reason": f"need at least {period + 1} closes", "value": None, "dataPoints": len(values)}
        gains, losses = [], []
        for prev, cur in zip(values[-period - 1:-1], values[-period:]):
            delta = cur - prev
            gains.append(max(delta, 0.0))
            losses.append(max(-delta, 0.0))
        avg_gain = sum(gains) / period
        avg_loss = sum(losses) / period
        if avg_loss == 0:
            value = 100.0 if avg_gain > 0 else 50.0
        else:
            rs = safe_div(avg_gain, avg_loss, "rsi.rs")
            value = 100 - (100 / (1 + rs))
        if not math.isfinite(value):
            raise FinanceValidationError("rsi value is not finite")
        return {"valid": True, "value": value, "lookback": period, "dataPoints": len(values)}
    except FinanceValidationError as exc:
        return {"valid": False, "reason": str(exc), "value": None, "dataPoints": len(closes)}


def calculate_kdj(rows: List[Dict[str, Any]], period: int = 9) -> Dict[str, Any]:
    try:
        clean = validate_ohlcv(rows)
        if len(clean) < period:
            return {"valid": False, "reason": f"need at least {period} OHLCV rows", "value": None, "dataPoints": len(clean)}
        window = clean[-period:]
        low_n = min(r["low"] for r in window)
        high_n = max(r["high"] for r in window)
        close = window[-1]["close"]
        if high_n == low_n:
            return {"valid": False, "reason": "high-low range is zero", "value": None, "dataPoints": len(clean)}
        rsv = safe_div(close - low_n, high_n - low_n, "kdj.rsv") * 100
        k = (2 / 3) * 50 + (1 / 3) * rsv
        d = (2 / 3) * 50 + (1 / 3) * k
        j = 3 * k - 2 * d
        for field, value in {"k": k, "d": d, "j": j}.items():
            finite_number(value, f"kdj.{field}")
        return {"valid": True, "value": {"k": k, "d": d, "j": j}, "lookback": period, "dataPoints": len(clean)}
    except FinanceValidationError as exc:
        return {"valid": False, "reason": str(exc), "value": None, "dataPoints": len(rows)}


def calculate_indicators(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    clean = validate_ohlcv(rows)
    closes = [r["close"] for r in clean]
    return {
        "ma20": moving_average(closes, 20),
        "ma60": moving_average(closes, 60),
        "rsi14": calculate_rsi(closes, 14),
        "kdj9": calculate_kdj(clean, 9),
    }


def classify_intent(message: str) -> str:
    text = message or ""
    if re.search(r"KDJ|RSI|均線|技術|指標|MA\\d*", text, re.I):
        return "technical_indicator"
    if re.search(r"財報|營收|EPS|本益比|現金流|fundamental|earnings", text, re.I):
        return "fundamentals"
    if re.search(r"比特|以太|crypto|bitcoin|ethereum|幣", text, re.I):
        return "crypto"
    if re.search(r"新聞|消息|市場|今天|看法|分析", text, re.I):
        return "news"
    return "general_finance"


def pick_provider(asset: Asset, providers: List[MarketDataProvider]) -> Optional[MarketDataProvider]:
    for provider in providers:
        if asset.market == "CRYPTO" and isinstance(provider, CoinGeckoProvider):
            return provider
        if asset.market == "US" and isinstance(provider, StooqProvider):
            return provider
        if asset.market == "TW" and isinstance(provider, (TwseProvider, TpexProvider, StooqProvider)):
            return provider
    return providers[0] if providers else None


def build_father_reply(
    asset: Optional[Asset],
    quote: Optional[Dict[str, Any]],
    indicators: Dict[str, Any],
    warnings: List[str],
    mentor_context: Optional[Dict[str, Any]] = None,
) -> str:
    mentor_directives = []
    if mentor_context and isinstance(mentor_context.get("directives"), list):
        mentor_directives = [str(d) for d in mentor_context["directives"] if d]

    if not asset:
        lines = ["孩子，這題我先用一般財經角度看：先確認標的、時間範圍和你想看的指標，再談判斷會比較準。"]
        if mentor_directives:
            lines.insert(0, "【資料限制】目前沒有鎖定單一標的，以下是一般性觀察。")
        lines.append("以上僅供陪伴聊天參考，非投資建議。")
        return "\n".join(lines)

    lines = []
    if mentor_directives or warnings:
        limit_bits = []
        if quote and quote.get("asOf"):
            limit_bits.append(f"報價時間約 {quote.get('asOf')}")
        if quote and quote.get("source"):
            limit_bits.append(f"來源 {quote.get('source')}")
        if warnings:
            limit_bits.append(warnings[0])
        if limit_bits:
            lines.append("【資料限制】" + "；".join(limit_bits) + "。")

    lines.append(f"孩子，爸爸先幫你看 {asset.name}（{asset.asset_id}）。")
    if quote:
        price = quote.get("price")
        change = quote.get("changePct")
        change_text = f"，日變動約 {change:.2f}%" if isinstance(change, (int, float)) and math.isfinite(change) else ""
        lines.append(f"最新可用價格約 {price:.2f} {quote.get('currency', asset.currency)}{change_text}。")
    valid_bits = []
    rsi = indicators.get("rsi14", {})
    kdj = indicators.get("kdj9", {})
    ma20 = indicators.get("ma20", {})
    if rsi.get("valid"):
        valid_bits.append(f"RSI14 約 {rsi['value']:.1f}")
    if kdj.get("valid"):
        kdj_v = kdj["value"]
        valid_bits.append(f"KDJ 約 K {kdj_v['k']:.1f} / D {kdj_v['d']:.1f} / J {kdj_v['j']:.1f}")
    if ma20.get("valid"):
        valid_bits.append(f"MA20 約 {ma20['value']:.2f}")
    if valid_bits:
        lines.append("【重點解讀】技術面參考：" + "；".join(valid_bits) + "。")
    elif warnings:
        lines.append("【重點解讀】部分指標因資料不足暫時無法計算。")
    if warnings and len(warnings) > 1:
        lines.append("資料提醒：" + "；".join(warnings[1:3]) + "。")
    lines.append("【風險提醒】爸爸看法：先把它當成風險觀察，不要因為單一指標就追高殺低；如果你要，我可以再幫你拆成基本面、技術面和新聞面三塊看。以上僅供陪伴聊天參考，非投資建議。")
    return "\n".join(lines)


def analyze(payload: Dict[str, Any], providers: Optional[List[MarketDataProvider]] = None) -> Dict[str, Any]:
    """Main finance-agent contract used by Next.js and tests."""
    providers = providers or DEFAULT_PROVIDERS
    message = str(payload.get("message") or "")
    user_id = str(payload.get("userId") or "anonymous")
    intent = classify_intent(message)
    assets = resolve_assets(message)
    warnings: List[str] = []
    citations: List[Dict[str, Any]] = []
    validation_errors: List[str] = []
    used_tools: List[str] = ["intent_classifier", "symbol_resolver"]
    quote = None
    indicators: Dict[str, Any] = {}

    asset = assets[0] if assets else None
    if asset:
        provider = pick_provider(asset, providers)
        if provider:
            used_tools.append(provider.name)
            try:
                quote = provider.get_quote(asset)
                citations.append({"type": "quote", "source": quote.get("source"), "assetId": asset.asset_id, "asOf": quote.get("asOf")})
            except Exception as exc:  # provider errors become warnings; agent still replies safely
                warnings.append(f"quote unavailable: {exc}")
                validation_errors.append(str(exc))
            try:
                rows = provider.get_ohlcv(asset, days=90)
                indicators = calculate_indicators(rows)
                used_tools.append("indicator_engine")
                citations.append({"type": "ohlcv", "source": rows[-1].get("source"), "assetId": asset.asset_id, "asOf": rows[-1].get("date")})
            except Exception as exc:
                warnings.append(f"indicators unavailable: {exc}")
                validation_errors.append(str(exc))

    reply = build_father_reply(asset, quote, indicators, warnings, payload.get("mentorContext"))
    return {
        "reply": reply,
        "intent": intent,
        "assetIds": [a.asset_id for a in assets],
        "citations": citations,
        "usedTools": used_tools,
        "warnings": warnings,
        "numericValidation": {
            "ok": len(validation_errors) == 0,
            "errors": validation_errors,
            "noNaN": True,
        },
        "audit": {
            "userId": user_id,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    }


class FinanceAgentHandler(BaseHTTPRequestHandler):
    def _json(self, status: int, body: Dict[str, Any]) -> None:
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler naming
        if self.path not in ("/finance-agent/analyze", "/finance-agent/test/mock-analyze"):
            self._json(404, {"error": "not_found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            self._json(200, analyze(payload))
        except Exception as exc:
            self._json(400, {"error": "bad_request", "message": str(exc)})


def run_server(host: str = "127.0.0.1", port: int = 8765) -> None:
    server = HTTPServer((host, port), FinanceAgentHandler)
    print(f"finance_agent listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        run_server()
    else:
        payload = json.loads(sys.stdin.read() or "{}")
        print(json.dumps(analyze(payload), ensure_ascii=False, indent=2))
