# 指标口径、归因与增长诊断
知识编号：KB-6C949D87E5
整理日期：2026-10-12；整理版本：2026-10-12.2
核验状态：运营建议；待业务负责人复核
访问范围：共享工作空间；不代表部门权限已实现
版本：2026-10-07；适用：跨渠道统一经营账；平台归因不等于因果增量。
性质：以下为原创运营诊断建议，引用资料仅支持相关机制或约束，不代表官方逐条推荐或真实投放案例。

## ATTRIBUTION-01 Meta、TikTok、AppLovin 都认领同一笔订单怎么办？
适用：跨渠道统一经营账；平台归因不等于因果增量；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：订单总数、各平台归因窗口、浏览归因、时区和重复事件。
排查与解决：先去业务订单重复；保留各平台原生归因用于平台内优化；跨渠道预算用同口径店铺净销售和对照证据。
判断与验收：平台归因销售不可相加当店铺收入；一笔订单多个触点正常。
参考依据：[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S13 Shopify：行为报告](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports)；[S19 Google Analytics：归因入门](https://support.google.com/analytics/answer/10596866)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## ATTRIBUTION-02 广告点击比网站会话多很多怎么查？
适用：跨渠道统一经营账；平台归因不等于因果增量；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：点击定义、重复点击、页面加载、同意阻断、浏览器、UTM和统计过滤。
排查与解决：先使用外链或到站相关点击；检查重定向是否丢参数；比较网络失败和页面加载；确认会话定义。
判断与验收：点击与会话并非一一对应，差异本身不能证明流量造假。
参考依据：[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S13 Shopify：行为报告](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports)；[S19 Google Analytics：归因入门](https://support.google.com/analytics/answer/10596866)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## ATTRIBUTION-03 昨天 ROAS 很差，今天回升为什么？
适用：跨渠道统一经营账；平台归因不等于因果增量；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：按发生日与归因日的报表、转化延迟、数据处理和退款回补。
排查与解决：保存每日快照；用成熟窗口评价；分离新下单与历史回补；对比相同延迟后的 cohort。
判断与验收：评估周期至少容纳业务实际转化延迟；不以最近一天机械关停。
参考依据：[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S13 Shopify：行为报告](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports)；[S19 Google Analytics：归因入门](https://support.google.com/analytics/answer/10596866)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## ATTRIBUTION-04 CTR、CVR、CPA 怎么联系起来？
适用：跨渠道统一经营账；平台归因不等于因果增量；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：同一点击定义下的展示、点击、转化和花费。
排查与解决：CTR=点击/展示；CVR=转化/点击；CPC=花费/点击；CPA=CPC/CVR；同时CPC=CPM/(1000×CTR)，率用小数。
判断与验收：若CVR分母是会话或平台归因不同，不能直接套等式；先统一口径。
参考依据：[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S13 Shopify：行为报告](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports)；[S19 Google Analytics：归因入门](https://support.google.com/analytics/answer/10596866)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## ATTRIBUTION-05 怎样判断广告带来了真正新增销售？
适用：跨渠道统一经营账；平台归因不等于因果增量；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：可用随机实验、地区差异、历史趋势、同期促销、自然需求。
排查与解决：能随机时设置对照；不能随机时选尽量可比组并记录局限；统一净收入与时间窗；估计增量而非只读归因。
判断与验收：小样本和渠道外溢需标明不确定；不要承诺一张ROAS表能证明因果。
参考依据：[S09 Google Ads：出价算法学习](https://support.google.com/google-ads/answer/10970825?hl=en)；[S13 Shopify：行为报告](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports)；[S19 Google Analytics：归因入门](https://support.google.com/analytics/answer/10596866)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## ATTRIBUTION-06 三本账怎样对账：订单、支付、平台归因
依据类型：原创对账操作建议；官方来源仅支持归因和收付款口径机制。
适用：跨平台店铺分析；整理日期：2026-10-12。
订单账按唯一业务订单ID去重，标记取消、退款、税费和币种；支付账记录实际收款、退款、拒付与结算时间；平台归因账各自保留窗口、点击或浏览归因和模型设置。
同一订单可能被多个渠道记功；平台归因销售总和可以大于店铺真实收入，不应强行调成相等或设置必须小于等于店铺收入的验收条件。
教学示例：一笔100元订单分别被两个平台各计100元，平台合计200元，业务订单仍只有100元。
验收：业务订单不重复，金额计算可追溯，各系统差异能按时间、归因、退款及税费解释；未解释的差异保留待核查，不捏造归因。
机制摘要：Shopify有多种归因模型；Any click可对多个触点分别给足记功。销售报告与资金实际流动也不同。
来源：https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/marketing-reports
核对日期：2026-10-12；核对范围：归因模型和销售与收款差异，不代表上述操作建议全部来自官方。
