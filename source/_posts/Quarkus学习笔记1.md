---
title: Quarkus学习笔记1
excerpt: Quarkus基础、学习目的、架构介绍
categories:
  - Quarkus
tags:
  - Quarkus
comments: true
layout: post
index_img: /img/milan/14.png
sticky: 9999
abbrlink: 1146829303
date: 2022-06-22 17:04:20
---

# 概念


是一个全栈Kubernetes云原生Java开发框架，可以配合Java虚拟机做本地应用编译，它是专门针对容器进行优化的 Java 框架。可以促使 Java 成为 Serverless（无服务）、云原生和Kubernetes环境中的高效开发基础。

# 特点

* 容器优先
* 云原生
* 统一命令+响应式
* 基于java
* 微服务优先
* 开发乐趣

# 价值

* 节省资源和成本
* 技术优势明显
* 全面支持云原生和serverless
* 提高云原生开发生产力

# 场景

* 构建微服务体系
* 构建Serverless体系
* 响应式系统
* 物联网业务
* 单体转微服务

# 为啥要学习Quarkus?

* 技术优势
    * 比传统java应用内存消耗减少到十分之一
    * 比传统java应用启动速度加快300倍
* 开发体验
    * 易于使用
    * 运行模式可供选择，JVM or Native
    * 整合优化配置
    * 统一命令式和响应式两种编程方式
    * 阻塞和非阻塞结合在一起
* 扩展第三方框架
* 社区活跃

# 架构

三大部分
* JVM平台层
* Quarkus 核心框架
* Quarkus Extensions框架

![架构图](img/quarkus/architecture.png)

* JVM平台层。包括HotSpot VM和SubstrateVM
    * HotSpot VM 是 Sun JDK 和 OpenJDK 中的虚拟机，也是目前使用范围最广的 Java 虚拟机。它是JVM实现技术，与以往的实现方式相比，在性能和扩展能力上得到了很大的提升
    * SubstrateVM主要用于Java虚拟机语言的AOT编译，SubstrateVM的启动时间和内存开销非常少。SubstrateVM的轻量特性使其适合嵌入其他系统中
* Quarkus 核心框架层。包括 Jandex、Gizmo、GraalSDK、Arc、Quarkus Core 等
    * Jandex是JBoss的库
    * Gizmo 是 Quarkus 开源的字节码生成库
    * GraalVM是以Java HotSpot虚拟机为基础，以 Graal 即时编译器为核心，以能运行多种语言为目标，包含一系列框架和技术的大集合基础平台。这是一个支持多种编程语言的执行环境，比如 JavaScript、Python、Ruby、R、C、C++、Rust 等语言，可显著地提高应用程序的性能和效率       
      GraalVM 还可以通过 AOT（Ahead-Of-Time）编译成可执行文件来单独运行（通过SubstrateVM）
    *  Arc（DI）是Quarkus 的依赖注入管理，其内容是io.quarkus.arc，这是CDI的一种实现
* Quarkus Extensions框架层。包括RESTEasy、Hibernate ORM、Netty、Eclipse Vert.x、Eclipse MicroProfile、Apache Camel等外部扩展组件
    * Eclipse Vert 扩展组件
      该组件是 Quarkus 的网络基础核心框架扩展组件。但由于该扩展组件位于底层，故开发者一般不会察觉
    * RESTEasy 扩展组件
      RESTEasy 框架是 JBoss 的一个开源项目，提供了各种框架来帮助构建RESTful Web Services和RESTful Java应用程序框架
    * Hibernate扩展组件
      这是对关系型数据库进行处理的ORM框架集成，遵循JPA规范
    * Eclipse MicroProfile扩展组件
      会在响应式和消息流中使用该扩展组件
    * Elytron 扩展组件
      主要用于安全类的扩展，包括 elytron-security-jdbc、elytron-security-ldap、elytron-security-oauth2等
    * Keycloak 扩展组件
      这是应用 Keycloak 开源认证授权服务器的扩展组件，包括 quarkus-keycloak-authorization、quarkus-oidc等
    * SmallRye 扩展组件
      这是响应式客户端的扩展组件，SmallRye是一个响应式编程库
    * Narayana 扩展组件
      这是处理数据库事务的扩展组件
    * Kafka 扩展组件
      这是应用Kafka开源消息流平台的扩展组件
    * Artemis 扩展组件
      这是应用Artemis开源消息服务器中间件的扩展组件
    * Agroal 扩展组件
      这是数据库连接池的扩展组件
    * Redis 扩展组件
      这是应用Redis开源缓存服务器的扩展组件
    * Spring 扩展组件
      这是应用Spring框架的扩展组件
    * Kubernetes 扩展组件
      这是应用Kubernetes服务器的扩展组件
    * JSON 集成扩展
      组件有Jackson、JAXB等

# 总结

## 基础

![基础](img/quarkus/Quarkus基础.png)

## 学习目的

![学习目的](img/quarkus/Quarkus学习目的.png)

## 架构

![架构](img/quarkus/Quarkus架构.png)
