# 库存、物流、税费与履约
版本：2026-10-07；适用：跨境实物商品；目的地规则、商品分类及承运能力逐单确认。
性质：以下为原创运营诊断建议，引用资料仅支持相关机制或约束，不代表官方逐条推荐或真实投放案例。

## FULFILLMENT-01 广告爆量但库存快断了怎么办？
适用：跨境实物商品；目的地规则、商品分类及承运能力逐单确认；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：可售库存、未履约订单、补货交期、日销量、退货可再售量。
排查与解决：计算库存覆盖天数与补货提前期；扣除已承诺订单；按可交付SKU调整广告；页面只展示真实时效。
判断与验收：已有订单优先履约；不能继续用现货承诺卖无确定交期商品。
参考依据：[S21 Shopify：库存分析](https://help.shopify.com/en/manual/products/analytics)；[S22 Shopify：关税与进口税](https://help.shopify.com/en/manual/international/duties-and-import-taxes/charging-duties)；[S23 Stripe：争议预防](https://docs.stripe.com/disputes/prevention/best-practices)

## FULFILLMENT-02 物流慢导致退款增加怎么办？
适用：跨境实物商品；目的地规则、商品分类及承运能力逐单确认；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：下单到出库、首扫、清关、末端签收各段时长和异常率。
排查与解决：区分仓库延迟与承运延迟；按线路及批次定位；主动提供准确更新；修正页面承诺和备货。
判断与验收：以实际签收与投诉下降验收，不以仅生成运单号当发货完成。
参考依据：[S21 Shopify：库存分析](https://help.shopify.com/en/manual/products/analytics)；[S22 Shopify：关税与进口税](https://help.shopify.com/en/manual/international/duties-and-import-taxes/charging-duties)；[S23 Stripe：争议预防](https://docs.stripe.com/disputes/prevention/best-practices)

## FULFILLMENT-03 客户收到包裹还被收税怎么办？
适用：跨境实物商品；目的地规则、商品分类及承运能力逐单确认；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：HS分类、原产地、目的地、结账预收、DDP标签和承运账单。
排查与解决：核对是否重复或遗漏征收；联系承运商说明费用构成；按真实责任解决；修复结账和物流配置。
判断与验收：不能把平台税费估算保证为最终税单；不建议低报价值或伪造原产地。
参考依据：[S21 Shopify：库存分析](https://help.shopify.com/en/manual/products/analytics)；[S22 Shopify：关税与进口税](https://help.shopify.com/en/manual/international/duties-and-import-taxes/charging-duties)；[S23 Stripe：争议预防](https://docs.stripe.com/disputes/prevention/best-practices)

## FULFILLMENT-04 海外仓还是直发更适合？
适用：跨境实物商品；目的地规则、商品分类及承运能力逐单确认；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：需求稳定性、仓储与尾程、头程、滞销、退货、资金和交期。
排查与解决：用保守销量分别建成本表；小量不稳定SKU评估直发，成熟需求评估备仓；纳入滞销与资金成本。
判断与验收：不是只比较单件运费；总现金暴露、交付质量和库存风险一起决定。
参考依据：[S21 Shopify：库存分析](https://help.shopify.com/en/manual/products/analytics)；[S22 Shopify：关税与进口税](https://help.shopify.com/en/manual/international/duties-and-import-taxes/charging-duties)；[S23 Stripe：争议预防](https://docs.stripe.com/disputes/prevention/best-practices)

## FULFILLMENT-05 如何设置补货点？
适用：跨境实物商品；目的地规则、商品分类及承运能力逐单确认；整理日期：2026-10-07。
依据类型：运营推导；需要用真实业务数据验证。
先收集：平均需求、波动、采购生产运输周期、可售库存、未到货量。
排查与解决：基础补货点=提前期需求+安全库存；安全库存按波动与服务目标设定；节日与新品单独预测；定期回看预测误差。
判断与验收：库存天数是历史速度估计；突发需求和供应延迟需情景修正。
参考依据：[S21 Shopify：库存分析](https://help.shopify.com/en/manual/products/analytics)；[S22 Shopify：关税与进口税](https://help.shopify.com/en/manual/international/duties-and-import-taxes/charging-duties)；[S23 Stripe：争议预防](https://docs.stripe.com/disputes/prevention/best-practices)
