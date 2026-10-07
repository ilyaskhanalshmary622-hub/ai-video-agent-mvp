# 像素、事件与数据回传诊断
版本：2026-10-07；适用：TikTok、Meta/Shopify、Google；字段实现必须遵循各平台文档。
性质：以下为原创运营诊断建议，引用资料仅支持相关机制或约束，不代表官方逐条推荐或真实投放案例。

## TRACKING-01 店铺有订单，广告后台没有购买怎么办？
适用：TikTok、Meta/Shopify、Google；字段实现必须遵循各平台文档；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：订单时间与时区、支付状态、同意状态、事件诊断、广告点击标识、归因窗口。
排查与解决：先区分事件未收到与收到但未归因；用测试订单追踪浏览器及服务器事件；核对订单状态与回传触发条件；再看延迟和窗口。
判断与验收：事件到达不保证归因给广告；不要为追数字扩大无依据的数据共享。
参考依据：[S04 TikTok：事件去重](https://ads.tiktok.com/help/article/event-deduplication?lang=en)；[S05 TikTok：网站数据连接](https://ads.tiktok.com/help/article/website-data-connection-setup-methods?lang=en)；[S08 Google Ads：增强型转化](https://support.google.com/google-ads/answer/9888656?hl=en)；[S12 Shopify：Meta 数据共享](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-data-sharing)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## TRACKING-02 购买事件比真实订单多一倍怎么办？
适用：TikTok、Meta/Shopify、Google；字段实现必须遵循各平台文档；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：订单ID、事件ID、事件名、像素来源、重试记录、感谢页刷新行为。
排查与解决：按订单逐条比对；检查重复安装与浏览器/服务器重复上报；同一业务事件沿用同一去重ID；不同订单不能复用ID。
判断与验收：相同业务事件只计一次；按平台字段核验，不能把 TikTok 参数名无修改套到 Meta。
参考依据：[S04 TikTok：事件去重](https://ads.tiktok.com/help/article/event-deduplication?lang=en)；[S05 TikTok：网站数据连接](https://ads.tiktok.com/help/article/website-data-connection-setup-methods?lang=en)；[S08 Google Ads：增强型转化](https://support.google.com/google-ads/answer/9888656?hl=en)；[S12 Shopify：Meta 数据共享](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-data-sharing)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## TRACKING-03 回传的购买金额不对怎么办？
适用：TikTok、Meta/Shopify、Google；字段实现必须遵循各平台文档；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：currency、value、折扣、运费、税费、退款口径、金额单位。
排查与解决：选几笔不同币种与折扣订单对账；确认整数分与元的单位；检查事件触发前金额是否最终确定；与报表收入定义统一。
判断与验收：金额和币种都正确才使用价值优化；不能让加购金额作为购买金额。
参考依据：[S04 TikTok：事件去重](https://ads.tiktok.com/help/article/event-deduplication?lang=en)；[S05 TikTok：网站数据连接](https://ads.tiktok.com/help/article/website-data-connection-setup-methods?lang=en)；[S08 Google Ads：增强型转化](https://support.google.com/google-ads/answer/9888656?hl=en)；[S12 Shopify：Meta 数据共享](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-data-sharing)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## TRACKING-04 换主题或插件后数据突然掉了怎么办？
适用：TikTok、Meta/Shopify、Google；字段实现必须遵循各平台文档；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：变更时间、主题版本、标签清单、同意管理、结账路径及移动端错误。
排查与解决：对齐数据下降和发布时点；检查标签是否重复或消失；逐步走完购买事件；必要时回滚单一变更并保留记录。
判断与验收：先恢复可观测性再改投放；不要同时重装多个跟踪插件。
参考依据：[S04 TikTok：事件去重](https://ads.tiktok.com/help/article/event-deduplication?lang=en)；[S05 TikTok：网站数据连接](https://ads.tiktok.com/help/article/website-data-connection-setup-methods?lang=en)；[S08 Google Ads：增强型转化](https://support.google.com/google-ads/answer/9888656?hl=en)；[S12 Shopify：Meta 数据共享](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-data-sharing)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)

## TRACKING-05 事件质量分高但投放效果差怎么办？
适用：TikTok、Meta/Shopify、Google；字段实现必须遵循各平台文档；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：实际购买真实性、优化目标、事件金额、流量质量、退款率。
排查与解决：把匹配质量与事件正确性分开；检查是否把浅层事件当购买；核对真实完成订单和贡献；再诊断素材与需求。
判断与验收：高匹配分不是盈利证明，也不是归因完整性保证。
参考依据：[S04 TikTok：事件去重](https://ads.tiktok.com/help/article/event-deduplication?lang=en)；[S05 TikTok：网站数据连接](https://ads.tiktok.com/help/article/website-data-connection-setup-methods?lang=en)；[S08 Google Ads：增强型转化](https://support.google.com/google-ads/answer/9888656?hl=en)；[S12 Shopify：Meta 数据共享](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-data-sharing)；[S29 TikTok：事件监测与诊断](https://ads.tiktok.com/resources/help/article/tiktok-events-manager-monitor-and-diagnose?lang=en)
