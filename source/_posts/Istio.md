---
title: Istio
excerpt: 云原生的Istio集成服务
categories:
  - 云原生
tags:
  - 云原生
  - Istio
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-qodana2022_1.png
abbrlink: 3498159868
date: 2020-06-18 12:12:13
---
# 服务网格

## 概念

服务网格是一个负责微服务之间网络通信的基础设施层，提供了管理、控制和监控网络通信的功能，本质上是Sidecar模式的网络拓扑形态

## 功能

* 动态路由
* 故障注入
* 熔断
* 安全
* 多语言支持
* 多协议支持
* 指标和分布式追踪

## 特性

*  可见性（Visibility）
   运行时指标**遥测**、分布式跟踪
*  可管理性（Manage Ability）
   服务发现、负载均衡、运行时动态路由
*  健壮性（Resilience）
   超时、重试、熔断等弹性能力
*  安全性（Security）
   服务间访问控制、TLS加密通信

>遥测（Telemetry）是工业上常用的一种术语，是指从远程设备中收集数据，并传输到接收设备进行监测。在软件开发中，遥测的含义引申为对各种指标（metric）数据进行收集，并监控、分析这些指标

# Istio架构
业务代码无侵入和网络层的全权代理是服务网格重要的优势，从逻辑上分成数据平面（Data Plane）和控制平面（Control Plane）

* 数据平面
  由一组和业务服务成对出现的Sidecar代理（Envoy）构成，它的主要功能是接管服务的进出流量，传递并控制服务和Mixer组件的所有网络通信（Mixer稍后会介绍）

* 控制平面
  主要包括Pilot、Mixer、Citadel和Galley4个组件，主要功能是通过配置和管理Sidecar代理来进行流量控制，并配置Mixer去执行策略和收集遥测数据

![架构图](img/istio/2ECC92ED-B776-4C12-B79F-B112C0995D7D.png)

Istio追求尽可能的透明，通过各种解耦设计让系统对内对外都没有依赖。同时，还提供了高度的扩展性。Istio认为随着应用的增长和服务的增多，**扩展策略系统是最主要的需求**，因此它被设计为以**增量**的方式进行扩展。可移植也是Istio在设计中充分考虑的因素，它被设计为支持多种平台，以便服务可以被方便地迁移到不同的云环境中

# 核心组件

## Envoy

Envoy作为Sidecar代理本质上是一个为面向服务的架构而设计的7层代理和通信总线。基于C++11开发而成。除了具有强大的网络控制能力外，Envoy还可以将流量行为和数据提取出来发送给Mixer组件，用以进行监控

 主要功能
* HTTP七层路由
* 支持gRPC、HTTP/2
* 服务发现和动态配置
* 健康检查

## Pilot

Pilot是Istio实现流量管理的核心组件
主要作用是配置和管理Envoy代理。比如可以为代理之间设置特定的流量规则，或者配置超时、重试、熔断这样的弹性能力。
Pilot会将控制流量行为的路由规则转换为Envoy的配置，并在运行时将它们广播到Envoy。
另外，Pilot还能够把服务发现机制抽象出来并转换成API分发给Envoy，使得后者具有服务发现的能力

 主要功能
* 从平台（如Kubernetes）获取服务信息，完成服务发现
* 获取Istio的各项配置，转换成Envoy代理可读的格式并分发

![架构图](img/istio/43520D0D-3D2F-44BA-8DE9-46256242EA07.png)

维护一套独立于平台的服务规则，并提供了一个平台适配器，以便接入各种不同的平台。规则API对运维人员开放，使得他们可以设置想要的流量规则，Pilot会把这些配置好的规则通过Envoy API分发给Envoy代理，以使其执行指定的规则，还公开了用于服务发现并且可以动态更新负载均衡和路由表的API

## Mixer

主要功能是提供策略控制，并从Envoy代理收集遥测数据。
每次网络通信时Envoy都会向Mixer发出预检要求，用来检测调用者的合法性。调用之后Envoy代理会发送遥测数据供Mixer收集。一般情况下Envoy可以缓存这些数据，不需要频繁地调用Mixer。

个人理解就是在网络通信之前提供API网关作用，通信之后，提供服务监控功能。并且有自己的缓存，不需要Enovy频繁调用它

![和Envoy交互图](img/istio/02621BB7-1FF4-48F7-8AE3-747D6D97B549.png)

适配器是Mixer的重要组成部分，本质上是一个插件模型，每个插件叫作适配器。这项特性使得Mixer可以接入几乎任意的（只要定义好接口）后端基础设施。比如可以选择接入不同的日志收集器、监控工具和授权工具等；可以在运行时切换不同的适配器或者是打开（关闭）它们；还可以自定义适配器以满足特定需求。适配器极大提高了Mixer的扩展性，它让Istio的功能拥有了更多可能性

## Citadel

与安全相关的组件，主要负责密钥和证书的管理。它可以提供服务间和终端用户的身份认证，还可以加密服务网格中的流量（不是Istio重点）

## Galley
2019年3月份发布的1.1版本中的新组件，现在是Istio主要的配置管理组件。

负责配置的获取、处理和分发。使用了一种叫作MCP（Mesh Configuration Protocol，网格配置协议）的协议与其他组件进行通信

## 总结

Istio架构分为数据平面和控制平面，使各个组件充分解耦，各司其职，这就是被称为第二代服务网格产品的原因。
数据平面即Envoy代理，负责流量的接管；
控制平面包含了Pilot、Mixer、Citadel和Galley，它们分别负责流量控制、策略控制、安全加固和数据收集。

通过这些组件的协同工作，Istio顺利地完成了**流量管理、策略和遥测、可视化和安全**这4大功能

# Pilot流量管理配置

| 配置资源                     | 说明                    |
|:-------------------------|:----------------------|
| 虚拟服务<br/>VirtualService  | 用来定义路由规则，控制请求如何被路由的服务 |
| 目标规则<br/>DestinationRule | 用来配置请求的策略             |
| 服务入口<br/>ServiceEntry    | 主要用来定义从外部如何访问服务网格     |
| 网关<br/>Gateway           | 在网格入口设置负载、控制流量等       |

## VirtualService
 主要功能
定义路由规则，使请求（流量）可以依据这些规则被分发到对应的服务。路由的方式也有很多种，可以根据请求的源或目标地址路由，也可以根据路径、头信息，或者服务版本进行路由

下面介绍一下一些配置
* 目标主机
  VirtualService中的目标主机定义使用hosts关键字。除了定义域名外，也可以直接定义可路由的服务

  ![目标主机配置](img/istio/826A6A8F-7A86-426A-957A-F46D3975C516.png)

* 根据不同的版本对服务流量进行拆分
  在Istio中服务版本依靠标签进行区分，可以定义不同种类的标签（如版本号、平台），对流量以不同的维度进行灵活的分配。拆分流量使用weight关键字来设置

  ![流量拆分](img/istio/A6196787-6DC5-4160-81BC-13E431E25C2B.png)

* subset（子集）关键字
  subset其实就是特定版本的标签，它和标签的映射关系定义在DestinationRule里。比如在subset中设置标签为“version:v1”，代表只有附带这个标签的Pod才能接受流量。Istio强制要求Pod设置带有version的标签，以此来实现流量控制和指标收集等功能
* timeout关键字设置请求的超时时间

  ![timeout关键字设置请求的超时时间](img/istio/5D702153-3D34-4F5E-887C-95DCCD30C081.png)

  访问ratings服务的请求设置10s超时
* retries关键字设置重试

  ![retries关键字设置重试](img/istio/5AA48379-D969-4479-AE99-CCA0B84071DE.png)

  表示最多重试3次，每次的超时时间为2s
* fault关键字来设置故障注入

  ![fault关键字来设置故障注入](img/istio/B8FAD230-AA64-4940-A943-E680B10D7F0B.png)

  注入了一个延迟故障，使得ratings服务10%的响应会出现5s的延迟。除了延迟，还可以设置终止或者返回HTTP故障码
* 通过match关键字定义匹配条件。

  ![通过match关键字定义匹配条件](img/istio/4FF20965-52D8-4134-9204-4FA1AF75955F.png)

  对特定的URL进行匹配
  可以同时设置多个匹配项。匹配的策略有很多，比如头信息、标签等
  如图

  ![对特定的URL进行匹配](img/istio/78D21B51-361D-4FAD-9372-82A5DC5A925D.png)

  VirtualService的路由配置规则有优先级。如果配置中定义了多条规则，则按照顺序优先匹配第一条，但是Header条件除外。如果匹配规则中设置了Header，则它具有最高优先级

## DestinationRule
DestinationRule通常都和VirtualService成对出现

 主要功能
当VirtualService的路由生效后，配置一些策略并应用到请求中。

另外，subset和标签的对应关系也被定义在DestinationRule中

* DestinationRule的配置，除定义VirtualService中要用的两个subset外，还设置以随机的方式对reviews服务进行负载均衡

  ![DestinationRule的配置](img/istio/CFFE16FE-82E7-42E6-9F8E-13A08589CFAA.png)

* 熔断（Circuit Breaker），一种服务降级处理的方式。当某个服务出现故障后，为了不影响下游服务而对其设置断流操作。可以在DestinationRule中实现这个功能

![熔断](img/istio/D10657FE-1FE8-45F7-8900-B83B7D20C36B.png)

对reviews服务的最大连接只能有100个，如果超过这个数字就会熔断

>如果特定的subset定义了策略，但没有定义对应的VirtualService，则该策略并不会执行。此时，Istio会以默认的方式（轮询）将请求发送给目标服务的全部版本。因此官方推荐方式是给每个服务都定义路由规则，避免这种情况发生

## ServiceEntry
如果有需求让服务能够访问外部系统，就需要用到ServiceEntry。它也是一种配置资源，用来给服务网格内的服务提供访问外部URL的能力。
Istio中的服务发现功能主要是依靠服务注册表实现的，ServiceEntry能够在注册表中添加外部服务，使得内部服务可以访问这些被添加的URL。所以，通过ServiceEntry就可以实现访问外部服务的能力。
个人理解就是流量对外的网关

![ServiceEntry](img/istio/3E1513EE-ED49-44F6-90F7-35F3CD99DBE7.png)

如图，配置一个外部的URL“*.foo.com”，使得网格内部的服务可以通过HTTP协议的80端口来访问它

## Gateway
和ServiceEntry相反，外部请求想要访问网格内的服务就要用到Gateway。Gateway为进入网格的请求配置了一个负载均衡器，把VirtualService绑定到Gateway，这样就可以设置规则来控制进入的流量。
个人理解就是springcloud体系里的zuul和gateway，是个对内网关

![Gateway](img/istio/17ADD6E9-4C10-4D38-A6F9-36404547B65F.png)

如图，为从外部进入Bookinfo网站的HTTPS流量配置了一个Gateway

要实现路由，还要定义一个VirtualService与网关绑定。

![VirtualService](img/istio/3855240D-C58A-46A2-9205-5954CAA31056.png)

如图，在hosts中对之前定义的bookinfo-gateway的Gateway进行绑定

## 流程
Istio中流量控制主要是由这4个配置资源共同协作完成。

1. 确认请求的主机（host）在VirtualService中是否有路由规则，
2. 若有，则将请求发往对应的subset。
3. 如果发现当前的subset在DestinationRule中定义了策略，则执行此策略。
4. 同时，设置Gateway负责负载均衡以及为服务定义出口

## 总结
Istio的流量管理功能主要是依靠Pilot组件和Envoy代理协作完成。

流量管理的规则配置由4个配置资源完成

* VirtualService定义路由规则
* DestinationRule在路由生效后定义对于请求的策略
* ServiceEntry提供了网格内服务访问外界服务的能力
* Gateway让外部服务调用网格内服务

# Mixer

## 功能

* 先决条件检查
  可简单地理解为是对服务调用者的权限检查，比如调用者的身份验证是否正确、调用者是否在白名单里和是否达到了调用限制等
* 配额管理
  允许服务在多个维度上分配和释放配额
* 遥测报告
  生成日志记录、监控、追踪数据

个人理解有点像zuul、zipkin的结合体

## 如何实现功能？

Sidecar代理在每次发送请求时都会调用Mixer，此时Mixer可根据发送方的信息进行检查，确认它是否有权限进行下游服务的调用。
请求过后，Sidecar仍然会调用Mixer，将定义的遥测数据交给Mixer收集起来，Mixer再把收集到的数据交给后端接入的系统进行分析、监控。
这些由Sidecar发送给Mixer的数据被称作属性（Attribute），用来描述请求和与请求相关的环境或系统（如请求路径、目的服务和主机IP）

将收集的属性交给后端基础设施进行处理的流程图

![处理流程图](img/istio/A8F8FAED-07F1-4044-819A-6CEA256E66AF.png)

## 如何集成后端设施？
Mixer的一个重要特性: 配置模型。

配置模型基于以下两个部分

* 适配器（Adapter）
  后端设施的接口
* 模板（Template）
  定义了属性和适配器输入的映射关系

配置模型包括3种资源

* 处理器（Handler）
  用于确定正在使用的适配器及其操作方式
* 实例（Instance）
  描述如何将请求属性映射到适配器输入，实例表示一个或多个适配器将操作的各种数据
* 规则（Rule）
  定义了实例和处理器的映射关系，规则包含match表达式和action标签，match表达式控制何时调用适配器，而action决定了要提供给适配器的一组实例

## 流程

![流程](img/istio/54F893CE-75F5-42D8-B8D2-51DD69780A2B.png)

1. Envoy调用Mixer时，规则配置进行检查，确定调用哪个处理器，并将要处理的实例发送给处理器
2. 处理器确定对应的后端适配器以及操作方式，将解析实例中的数据作为适配器的输入
3. 适配器调用后端设施完成整个流程

# Citadel(安全)

Istio中的认证有两种

* 传输认证（Transport Authentication）
  也叫作服务到服务认证，验证直接客户端连接，提供双向TLS验证

* 身份认证（OriginAuthentication）
  也叫作终端用户认证，验证终端用户或设备，比较常见的是通过JWT验证

## TLS

TLS实现了将应用层的报文进行加密后再交由TCP进行传输的功能

该协议由两层组成

1. TLS记录（TLS Record）协议
2. TLS握手（TLS Handshake）协议

前身是SSL，即安全套接层（Secure Sockets Layer）

所谓的双向TLS（mutual TLS，mTLS）认证，是客户端和服务端都需要彼此进行验证

在Istio中，客户端和服务端的Envoy会建立一个双向TLS连接，由代理完成验证，授权后再转发到服务本身。它还提供了一个宽容模式的mTLS，即同时允许纯文本流量和加密流量验证。这个功能使得Istio的安全架构具有了极大的兼容性

## JWT

JWT是一种基于客户端的解决方案

 工作原理

用户登录后服务器生成一个令牌给客户端，由客户端保存；发送请求时带着令牌，服务器根据签名规则验证令牌的合法性和身份。一个完整的JWT包括3个部分：头部（Header）、负载（Payload）和签名（Signature）。头部负责定义JWT的元数据，负载存放实际需要传递的信息，签名是通过签名算法对前两部分进行编码而生成的字符串，可防止数据被篡改。这3部分组成一个Token，中间用点隔开，下图为示例

![工作原理](img/istio/2F113C67-23AB-40C8-80B3-3CFA9D3A2967.png)


使用的时候通常都被添加在请求头里，设置如下
![添加在请求头](img/istio/1C7120FD-3B5D-4FA6-B2F4-C0C6865249AA.png)

Istio的身份认证目前只支持JWT授权方式

# 参考资料

1. [华为云Istio入门教程](https://github.com/CNCF123/Document/tree/master/Istio/huaweicloud/pdf)

2. [Istio教程](https://www.bilibili.com/video/BV1vt411H755?from=search&seid=9658571065723447167)

# [推荐书单](/Istio)
