---
title: Dubbo
excerpt: 框架介绍
categories:
  - 框架
tags:
  - 框架
  - Dubbo
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-pycharm2022_1.png
abbrlink: 4129633176
date: 2022-05-17 11:05:09
sticky: 400
---

# 工作原理

## 10层模型

1. service接口层: 给服务提供者和消费者实现
2. config配置层: 对 dubbo 进行各种配置
3. proxy服务代理层: 无论是服务提供者还是消费者，dubbo 都会生成代理，代理之间进行网络通信
4. registry服务注册层: 负责服务注册与发现
5. cluster集群层: 封装多个服务提供者的路由以及负载均衡，将多个实例组合成一个服务
6. monitor监控层: 对 rpc 接口的调用次数和调用时间进行监控
7. protocal远程调用层: 封装 rpc 调用
8. exchange信息交换层: 封装请求响应模式，同步转异步
9. transport网络传输层: 抽象 mina 和 netty 为统一接口
10. serialize数据序列化层: 可复用的一些序列化和反序列化工具，支持5种方式（fastjson、Hessian2、Kryo、fst 及 Java原生支持）。也可扩展自定义的序列化和反序列化工具

![10层模型](img/dubbo/2A4D159B-9474-499A-9552-D22CADEBD9D0.png)

## 流程
1. provider向注册中心去注册
2. consumer从注册中心订阅服务
3. 注册中心会通知consumer注册好的服务
4. consumer调用provider
5. consumer和provider每隔一段时间，都把各自的统计数据异步通知给监控中心

   ![流程](img/dubbo/4EC104FF-0A47-44D7-9000-5945490C3FEE.png)

>注册中心挂了可以继续通信吗？
>可以，因为初始化时候，消费者会将提供者的地址等元数据信息拉取到本地缓存，所以注册中心挂了还可以继续通信

dubbo10层每个层都有可以考核的面试知识点，以下按照我个人分析一一罗列出来

## dubbo负载均衡策略
* random loadbalance
  `dubbo`默认负载均衡策略是`random loadbalance`，即随机调用实现负载均衡，可对`provider`不同实例设置不同的权重，会按照权重来负载均衡，权重越大分配流量越高，一般默认这个就行

* round robin loadbalance
  这个负载均衡策略默认均匀地将流量打到各个服务器节点上，但如果各个服务器性能不一样，容易导致性能差的服务器负载过高。所以需要调整权重，让性能差的服务器承载权重小一些，流量少一些

* least active loadbalance
  自动感知，服务器性能越差，那么接收的请求越少，越不活跃，此时就会给不活跃，性能差的服务器更少的请求

* consistant hash loadbalance
  一致性`Hash`算法,相同参数的请求一定分发到同一个`provider`上,`provider`挂掉时,会基于虚拟节点均匀分配剩余的流量，抖动不会太大。如果需要的不是随机负载均衡，而是要同一类请求都到一个节点，那就使用这个一致性`Hash`策略

## dubbo集群容错策略

* failover cluster模式
  `dubbo`默认集群容错策略，请求失败就自动切换，自动重试其他服务器，常见于读操作。（失败重试其它机器）
  可通过以下几种方式配置重试次数

``` xml
<dubbo:service retries="2" />
```

``` xml
<dubbo:reference retries="2" />
```

``` xml
<dubbo:reference>
    <dubbo:method name="findFoo" retries="2" />
</dubbo:reference>
```

* failfast cluster模式
  一次调用失败就立即失败，常见于非幂等性的写操作，比如新增一条记录（调用失败就立即失败）
* failsafe cluster模式
  出现异常时忽略掉，常用于不重要的接口调用，比如记录日志
  配置示例如下

``` xml
<dubbo:service cluster="failsafe" />
```

``` xml
<dubbo:reference cluster="failsafe" />
```

* failback cluster模式
  失败了后台自动记录请求，然后定时重发，比较适合于写消息队列这种
* forking cluster模式
  并行调用多个`provider`，只要一个成功就立即返回。常用于实时性要求比较高的读操作，但会浪费更多的服务资源，可通过`forks="2"`来设置最大并行数
* broadcacst cluster
  逐个调用所有的`provider`。任何一个`provider`出错则报错。通常用于通知所有提供者更新缓存或日志等本地资源信息

## dubbo动态代理策略
默认使用`javassist`动态字节码生成，创建代理类。但可通过`spi`扩展机制配置自己的动态代理策略

## SPI（Service Provider Interface）

### 概念
根据**指定的配置**或者**默认的配置**，找到对应的实现类并加载进系统，之后就可以用这个实现类的实例对象

举例:
有一个接口A。A1/A2/A3分别是接口A的不同实现。通过配置接口A=实现A2，那在系统实际运行时，会加载配置，用实现A2实例化一个对象来提供服务

spi使用场景？**插件扩展**场景，比如开发了一个给别人使用的开源框架，如果想让别人自己写个插件，插到你的开源框架里面，从而扩展某个功能，这个时候spi就有用武之地

### Java中SPI使用

* jdbc
  java定义了一套jdbc接口，但Java并没提供jdbc的实现类
  但实际项目运行时，要使用jdbc接口的哪些实现类呢？一般来说，我们要根据自己使用的数据库，比如`mysql`，将`mysql-jdbc-connector.jar`引入进来；`oracle`，就将`oracle-jdbc-connector.jar`引入进来
  在系统运行时，碰到使用jdbc的接口，spi会在底层使用引入的那个jar中提供的实现类

### Dubbo中SPI使用
dubbo也用了spi，不过没有用java的spi机制，而是自己实现了一套spi机制

举例

``` java
Protocol protocol = ExtensionLoader.getExtensionLoader(Protocol.class).getAdaptiveExtension();
```

对于这个`Protocol`接口，`dubbo`在系统运行时会判断一下应该选用这个`Protocol`接口的哪个实现类来实例化对象。需要配置文件配置一个`Protocol`实现类，加载到`jvm`，然后实例化对象，用这个`Protocol`实现类就行

在`dubbo`里`SPI`被大量使用，对很多组件都会保留一个接口和多个实现，然后在系统运行时，动态根据配置去找到对应的实现类。如果没配置，就走默认实现

在dubbo源码中，在`/META_INF/dubbo/internal/com.alibaba.dubbo.rpc.Protocol`下对`Protocol`接口做了配置

``` properties
dubbo=com.alibaba.dubbo.rpc.protocol.dubbo.DubboProtocol
```
如上，将`dubbo`作为默认key去配置文件里找，配置文件名称与接口全限定名一样，通过`dubbo`作为key找到默认的实现类`com.alibaba.dubbo.rpc.protocol.dubbo.DubboProtocol`

#### 自定义扩展dubbo组件的方法

![自定义扩展dubbo组件方法](img/dubbo/F4598D6B-0547-4618-9C5B-7536AB955CA4.png)

1. 把自定义扩展的组件写完代码，打成`jar`包，在里面的`src/main/resources`目录下，新建`META-INF/services`目录，增加文件: `com.alibaba.dubbo.rpc.Protocol`，文件内容为`my=com.bingo.MyProtocol`。然后把`jar`安装到`nexus`私服

2. 新建`dubbo provider`工程，在工程里面依赖自定义的组件包`jar`，然后在`spring`配置文件里配置
    ``` xml
    <dubbo:protocol name=”my” port=”20000” />
    ```

3. `provider`启动时，就会加载`jar`包里的`my=com.bingo.MyProtocol`这行配置，接着会根据配置使用自定义好的`MyProtocol`

通过上述方式，就可替换掉大量的`dubbo`内部的组件

## dubbo服务治理

### 服务链式追踪监控
基于`dubbo`做的分布式系统，自动记录各个服务之间的互相调用情况，然后自动将服务之间的依赖关系和调用链路生成出来。老实说，这一点`dubbo`原生做的不好，建议使用`skywalking`这种apm类型来监控

### 服务访问压力以及时长统计
自动统计各个接口和服务之间的**调用次数**以及**访问延时**

两个级别
* 接口粒度
  每个服务的每个接口每天被调用多少次，`TP50/TP90/TP99`，三个档次的请求延时分别是多少
* 从调用源头开始
  一个完整的请求链路经过几十个服务之后，完成一次请求，每天全链路走多少次，全链路请求延时的`TP50/TP90/TP99`，分别是多少

### 其它
* 服务分层（避免循环依赖）
* 调用链路失败监控和报警
* 服务鉴权
* 每个服务的可用性的监控（接口调用成功率？几个9？`SLA`，这个在`SkyWalking`中已经可以实现）

## dubbo服务降级

配置文件举例

``` xml
<dubbo:reference id="fooService" interface="com.test.service.FooService"  timeout="10000" check="false" mock="return null">
```
调用接口失败时，可通过mock统一返回null
mock值也可修改为true，然后再接口同一个路径下实现一个Mock类，命名规则是“接口名称+Mock”后缀。在Mock类里实现自己的降级逻辑
代码示例
``` java
public class HelloServiceMock implements HelloService {
    public void sayHello() {
        // 降级逻辑
    }
}
```
## dubbo失败重试和超时重试

在配置文件中配置
* timeout
  一般设置为200ms，个人认为不能超过200ms还没返回
* retries
  设置retries，一般在读请求时，比如要查询数据，设置个retries，如果第一次没读到，报错，重试指定的次数，尝试再次读取
  举例如下
   ``` xml
   <dubbo:reference id="xxxx" interface="xx" check="true" async="false" retries="3" timeout="2000"/>
   ```
配置`timeout=“2000”`，意思就是等待2s后，要是还没返回，就撤了，不干等结果。

## dubbo通信协议

### 概念

* 序列化
  把数据结构或对象转换为二进制串的过程
* 反序列化
  在序列化过程中所生成的二进制串转换成数据结构或者对象的过程
  
![反序列化](img/dubbo/477EE8CB-C8B6-4349-80E2-A7F4B594506A.png)

### dubbo支持不同的通信协议
* dubbo协议
  默认协议，单一长连接，进行的是NIO异步通信，基于hessian作为序列化协议。使用的场景：传输数据量小（每次请求在100kb以内），但并发量高的场景。
  为了支持高并发场景，一般做法就是服务提供者只有几个服务器节点，但是服务消费者有上百个服务器节点，可能每天调用量就达到上亿次！此时用长连接是最合适的，只要跟每个服务消费者维持一个长连接就行，总共就100个左右连接。然后后面基于长连接NIO异步通信，支撑高并发请求长连接，简单说就是建立连接后可以持续发送请求，无须再建立连接
  ![长连接](img/dubbo/C5B04C1C-0A39-48DE-9FAD-BB718A5CBF4C.png)
  短连接就是每次要发送请求之前，需要先重新建立一次连接
  ![短连接](img/dubbo/9EFF8818-80CA-4B4D-83FF-B0B8C2262074.png)

* rmi 协议
  Java 二进制序列化，多个短连接，适合消费者和提供者数量差不多的情况，适用于文件的传输，一般较少用

* hessian 协议
  hessian 序列化协议，多个短连接，适用于提供者数量比消费者数量还多的情况，适用于文件的传输，一般较少用

* http 协议
  json 序列化

* webservice
  SOAP 文本序列化

## dubbo序列化协议

`dubbo`支持`hession`、`Java`二进制序列化、`json`、`SOAP`文本序列化多种序列化协议

`hessian`是其默认的序列化协议

现在还会有个`Protocol Buffer`数据存储格式，是Google出品的一种轻量且高效的结构化数据存储格式，性能比`JSON`、`XML`要高很多

性能高的原因有两个
1. 使用`proto`编译器，自动进行序列化和反序列化，速度非常快，应该比`XML`和`JSON`快上20~100倍
2. 数据压缩效果好，它序列化后的数据量体积小。因为体积小，传输起来带宽和速度上会有优化

# 参考资料

1. [中华石杉--互联网Java进阶面试训练营](https://gitee.com/shishan100/Java-Interview-Advanced)

# [推荐书单](/Dubbo)
