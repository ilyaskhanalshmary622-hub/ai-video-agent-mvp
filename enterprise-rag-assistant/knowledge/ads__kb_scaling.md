# 预算扩量、止损与实验决策
知识编号：KB-C8AC0E9C85
整理日期：2026-10-12；整理版本：2026-10-12.2
核验状态：运营建议；待业务负责人复核
访问范围：共享工作空间；不代表部门权限已实现
版本：2026-10-07；适用：通用经营框架；平台学习与预算规则分别核实。
性质：以下为原创运营诊断建议，引用资料仅支持相关机制或约束，不代表官方逐条推荐或真实投放案例。

## SCALING-01 广告稳定后每次加多少预算？
适用：通用经营框架；平台学习与预算规则分别核实；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：成熟CPA、边际贡献、预算利用、库存、回款和可承受损失。
排查与解决：依据风险容量选择一个可观察的增量；保留其余主要变量；跨完整转化周期比较；设回滚条件。
判断与验收：没有统一20%或30%安全比例；不同平台与策略会有不同响应。
参考依据：[S02 AppLovin：网站广告优化](https://applovin.com/en/resources/optimizing-campaigns)；[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S20 Google Ads：实验](https://support.google.com/google-ads/answer/10682377?hl=en)

## SCALING-02 加预算后 CPA 上涨立刻降回去吗？
适用：通用经营框架；平台学习与预算规则分别核实；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：调整时间、转化延迟、受众扩张、CPM、CVR和成熟订单。
排查与解决：先排页面与回传故障；剔除未成熟时间窗；分清新流量探索和持续恶化；触发预设损失线才执行回滚。
判断与验收：不能被当天未回补数据带动来回修改，也不能忽略现金损失。
参考依据：[S02 AppLovin：网站广告优化](https://applovin.com/en/resources/optimizing-campaigns)；[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S20 Google Ads：实验](https://support.google.com/google-ads/answer/10682377?hl=en)

## SCALING-03 什么时候该停掉测试素材？
适用：通用经营框架；平台学习与预算规则分别核实；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：已花费、有效曝光与点击、购买成熟度、最大损失、明确技术故障。
排查与解决：技术或履约故障立即处理；达到损失上限暂停；数据不足标记未决；明显错意图的素材重新设计。
判断与验收：经营止损与统计证明不同；不设全品类统一曝光或点击关停数。
参考依据：[S02 AppLovin：网站广告优化](https://applovin.com/en/resources/optimizing-campaigns)；[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S20 Google Ads：实验](https://support.google.com/google-ads/answer/10682377?hl=en)

## SCALING-04 跨国家复制广告为何失效？
适用：通用经营框架；平台学习与预算规则分别核实；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：语言、支付、运费税费、季节、文化语境和竞争。
排查与解决：本地化人物场景与单位；重算该国利润；检查配送支付；从经过翻译审校的小样开始。
判断与验收：成熟国家表现不是新市场证据；不要把国家成本差异当素材好坏。
参考依据：[S02 AppLovin：网站广告优化](https://applovin.com/en/resources/optimizing-campaigns)；[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S20 Google Ads：实验](https://support.google.com/google-ads/answer/10682377?hl=en)

## SCALING-05 同时改素材、价格、页面后变好了能归功谁？
适用：通用经营框架；平台学习与预算规则分别核实；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：变更日志、对照组、同期流量组成和促销环境。
排查与解决：记录为组合变化；不能分离因果时明确不确定；下一轮拆分关键变量；有条件使用平台随机实验。
判断与验收：事后相关性不是因果结论；只确认组合可复现，不编造单项提升率。
参考依据：[S02 AppLovin：网站广告优化](https://applovin.com/en/resources/optimizing-campaigns)；[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S20 Google Ads：实验](https://support.google.com/google-ads/answer/10682377?hl=en)

## SCALING-06 调预算后成本变贵，观察与止损如何同时执行
依据类型：原创经营诊断，官方文档只支持转化周期影响学习的机制；整理日期：2026-10-12。
适用：昨天加钱、今天获客变贵、拉新变贵、每来一个买家花钱更多、扩量后成本上涨。
先查交易页面、支付和购买回传故障；有故障先限制受影响投放；已触发事先确定的现金损失线时执行止损，不为了学习期继续烧钱。
其余情况比较成熟转化窗口、订单质量和边际贡献；观察期由该业务的转化及报告延迟决定，没有跨平台统一的3至5天等待要求。
“每拉一个客户更贵”是单位获客成本描述，不说明总共只有一个客户；样本量需要实际订单数。
记录调整时间、预算、目标和其他变更，避免同一轮同时改素材、出价和页面。数据未成熟时结论标为暂不确定。
来源：https://support.google.com/google-ads/answer/10970825?hl=en
核对日期：2026-10-12；适用限制：Google智能出价学习机制不能当成其他平台的固定等待规则。
