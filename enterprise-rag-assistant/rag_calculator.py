"""Strict decimal quantities; ambiguous input never produces partial math."""
from decimal import Decimal, InvalidOperation
import re
LABELS = (r'(?:每单(?:净)?收入|每单实收|同一口径(?:每单)?净收入)', r'(?:全部)?非广告变动成本')
NUMBER = r'[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?'
CURRENCY = r'人民币|美元|欧元|英镑|美金|USD|EUR|GBP|CNY|RMB|元'
UNITS = {'千':Decimal(1000),'万':Decimal(10000),'亿':Decimal(100000000),'':Decimal(1)}
ALIASES = {'人民币':'CNY','元':'CNY','RMB':'CNY','美金':'USD','美元':'USD','欧元':'EUR','英镑':'GBP'}
def evidence(text,error=False):
    return {'source':'本次单位经济性计算','chunk_id':'calculation-unit-economics','category':'本次计算','heading':'按用户数字计算','text':text,'body':text,'version':'2026-10-12.3','inputError':error}
def read_amount(query,label):
    occurrences=list(re.finditer(label,query))
    if len(occurrences)!=1: raise ValueError('同一字段出现多个值，请只保留一组每单收入和成本。')
    tail=query[occurrences[0].end():].lstrip(' :=：是为')
    match=re.match(rf'({NUMBER})\s*([千万亿]?)\s*({CURRENCY})?',tail,re.I)
    if not match: raise ValueError('金额格式未识别，请使用阿拉伯数字和明确币种。')
    remaining=tail[match.end():]
    if re.match(r'(?:[\d.%％eE+\-]|[百十]|[,，]\d)',remaining) or (remaining and remaining[0] not in ' ，,、。；;！!？?\n\r)）'):
        raise ValueError('金额格式或单位不明确，请使用如1,000元、2.5万元的写法。')
    value=Decimal(match[1].replace(',',''))*UNITS[match[2]]
    currency=(match[3] or '').upper()
    return value,ALIASES.get(currency,currency)
def calculation_evidence(query):
    if not all(re.search(label,query) for label in LABELS): return None
    try:
        (r,rc),(c,cc)=[read_amount(query,label) for label in LABELS]
        if rc!=cc: raise ValueError('收入与成本币种不一致或有一项未注明，请先确认并统一换算，不直接相减。')
        if r<=0 or c<0 or max(r,c)>Decimal('1e12'): raise ValueError('收入须大于零、成本不能为负，金额须在支持范围内。')
        actual=None
        found=list(re.finditer(r'(?<![A-Za-z])ROAS\s*(?:是|为|=|：)?\s*(?=[+\-\d])',query,re.I))
        if found:
            if len(found)!=1: raise ValueError('出现多个ROAS值，请明确当前实际ROAS。')
            tail=query[found[0].end():]
            m=re.match(rf'({NUMBER})\s*([%％倍]?)',tail)
            if not m or re.match(r'[\d.eE+\-千万亿]|[,，]\d',tail[m.end():]): raise ValueError('ROAS格式未识别，请写成2倍或200%。')
            actual=Decimal(m[1].replace(',',''))/(100 if m[2] in ('%','％') else 1)
            if actual<=0: raise ValueError('收入大于零但ROAS不大于零，无法反推广告费，请先核对口径。')
        def fmt(n): return format(n.quantize(Decimal('.01')),'f')
        contribution=r-c
        currency=rc or '未注明，暂按同一币种假设'
        text=f'计算输入来自用户，未独立核实：每单收入{fmt(r)}，全部非广告变动成本{fmt(c)}；币种：{currency}。\n'
        text+='适用条件：相同订单口径、币种及ROAS收入分子，未计固定费用；条件不成立时不可采用结果。\n'
        text+=f'广告前贡献={fmt(r)}−{fmt(c)}={fmt(contribution)}。\n'
        if contribution>0: text+=f'保本CPA={fmt(contribution)}；保本ROAS≈{fmt(r/contribution)}。\n'
        else: text+='广告前贡献小于或等于零，无法承担正广告费，不存在有限的保本ROAS。\n'
        if actual is not None:
            ad=r/actual
            text+=f'当前ROAS={fmt(actual)}倍，每单广告费={fmt(ad)}，广告后贡献={fmt(contribution-ad)}；未计固定费用。\n'
        return evidence(text)
    except (ValueError,InvalidOperation,ArithmeticError) as exc:
        message=str(exc) if isinstance(exc,ValueError) else '数字超出支持的精度或范围，请检查输入。'
        return evidence('暂不能计算：'+message,True)
