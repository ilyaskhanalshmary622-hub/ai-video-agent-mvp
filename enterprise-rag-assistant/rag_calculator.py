"""Narrow, deterministic unit economics calculator. No eval, no FX assumptions."""
from decimal import Decimal, InvalidOperation
import re


def calculation_evidence(query):
    revenue = re.search(r"(?:每单(?:净)?收入|每单实收|同一口径(?:每单)?净收入)\s*([0-9]+(?:\.[0-9]+)?)", query)
    cost = re.search(r"(?:全部)?非广告变动成本\s*([0-9]+(?:\.[0-9]+)?)", query)
    if not revenue or not cost:
        return None
    currencies = set(re.findall(r"人民币|美元|欧元|英镑|USD|EUR|GBP|CNY", query, re.I))
    if len(currencies) > 1:
        return None
    try:
        r, c = Decimal(revenue[1]), Decimal(cost[1])
        if r <= 0 or c < 0 or r > Decimal("1e12") or c > Decimal("1e12"):
            return None
        contribution = r-c
        def fmt(n):
            return format(n.quantize(Decimal(".01")), "f")
        text = f"计算输入来自用户，尚未独立核实：每单同口径收入{r}，全部非广告变动成本{c}。假设币种、订单口径与ROAS收入分子一致，不含固定费用。\n"
        text += f"广告前贡献={r}−{c}={fmt(contribution)}；保本CPA={fmt(contribution)}。\n"
        if contribution > 0:
            text += f"保本ROAS={r}÷{fmt(contribution)}≈{fmt(r/contribution)}。\n"
        else:
            text += "广告前贡献小于或等于0，正广告费下没有有限的保本ROAS，先调整价格或成本。\n"
        actual = re.search(r"ROAS\s*(?:是|为|=|：)?\s*([0-9]+(?:\.[0-9]+)?)", query, re.I)
        if actual and Decimal(actual[1]) > 0:
            ad = r/Decimal(actual[1])
            text += f"按当前ROAS={actual[1]}，每单广告费={fmt(ad)}，广告后贡献={fmt(contribution-ad)}；未计固定费用。\n"
        text += "计算规则为经营恒等式，不是模型自由推算；假设不成立时应先统一口径。"
        return {"source":"本次单位经济性计算", "chunk_id":"calculation-unit-economics", "category":"本次计算",
                "heading":"按用户数字计算", "text":text, "body":text, "version":"2026-10-12.2"}
    except (InvalidOperation, ArithmeticError):
        return None
