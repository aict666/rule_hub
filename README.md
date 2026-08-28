# AICT Ad Rules

面向 Surge、Loon、Quantumult X、Shadowrocket、Stash 和 Clash 的广告过滤规则，覆盖悬浮时钟、百度地图和高德地图。

## 安装

复写模块包含域名规则、URL Rewrite、脚本和 MITM 配置。安装后请启用 HTTPS 解密、脚本与复写功能。

| 客户端 | 订阅地址 |
| --- | --- |
| Surge | [Advertising.sgmodule](https://raw.githubusercontent.com/aict666/rule_hub/master/rewrite/Surge/Advertising/Advertising.sgmodule) |
| Loon | [Advertising.plugin](https://raw.githubusercontent.com/aict666/rule_hub/master/rewrite/Loon/Advertising/Advertising.plugin) |
| Quantumult X | [Advertising.conf](https://raw.githubusercontent.com/aict666/rule_hub/master/rewrite/QuantumultX/Advertising/Advertising.conf) |
| Shadowrocket | [Advertising.sgmodule](https://raw.githubusercontent.com/aict666/rule_hub/master/rewrite/Shadowrocket/Advertising/Advertising.sgmodule) |
| Stash | [Advertising.stoverride](https://raw.githubusercontent.com/aict666/rule_hub/master/rewrite/Stash/Advertising/Advertising.stoverride) |

## 规则集

独立规则集仅包含广告域名，适合按应用或客户端单独引用。

| 规则集 | Surge | Quantumult X | Clash / Stash |
| --- | --- | --- | --- |
| 合集 | [Advertising.list](rule/Surge/Advertising/Advertising.list) | [Advertising.list](rule/QuantumultX/Advertising/Advertising.list) | [Advertising.yaml](rule/Clash/Advertising/Advertising.yaml) |
| 悬浮时钟 | [FloatingClock.list](rule/Surge/FloatingClock/FloatingClock.list) | [FloatingClock.list](rule/QuantumultX/FloatingClock/FloatingClock.list) | [FloatingClock.yaml](rule/Clash/FloatingClock/FloatingClock.yaml) |
| 百度地图 | [BaiduMapAds.list](rule/Surge/BaiduMapAds/BaiduMapAds.list) | [BaiduMapAds.list](rule/QuantumultX/BaiduMapAds/BaiduMapAds.list) | [BaiduMapAds.yaml](rule/Clash/BaiduMapAds/BaiduMapAds.yaml) |
| 高德地图 | [AmapAds.list](rule/Surge/AmapAds/AmapAds.list) | [AmapAds.list](rule/QuantumultX/AmapAds/AmapAds.list) | [AmapAds.yaml](rule/Clash/AmapAds/AmapAds.yaml) |

Loon 与 Shadowrocket 规则集位于对应的 `rule` 目录。安装复写模块后无需重复添加合集规则。

## 功能

- 悬浮时钟：过滤常见广告与归因 SDK 域名。
- 百度地图：过滤开屏素材、投放接口和联盟广告。
- 高德地图：过滤开屏、归因、首页与信息流推广内容。

地图导航、系统服务和应用主站流量不在过滤范围内。部分开屏内容可能需要清理应用缓存后才会消失。

## 免责声明

本项目仅供学习与研究。规则可能随应用版本变化，请自行评估使用风险。

## 许可证

本项目采用 [0BSD](LICENSE) 许可证。
