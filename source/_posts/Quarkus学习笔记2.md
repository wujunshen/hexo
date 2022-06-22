---
title: Quarkus学习笔记2
excerpt: idea里如何新建和启动quarkus项目
categories:
  - Quarkus
tags:
  - Quarkus
comments: true
layout: post
index_img: /img/milan/15.png
sticky: 9999
abbrlink: 3713165389
date: 2022-06-22 18:25:57
---

# idea新建quarkus项目

## 确定安装了quarkus插件

![](img/quarkus/A361119A-63D7-4E21-BA5A-8EA91EB9FCCC.png)

## new project

![](img/quarkus/D51B5E83-AF00-4D96-AAB5-73BDA3F1487D.png)

选择已安装graalvm的java17版本

如何安装graalvm的java17版本，可见<a href="/posts/877356228.html#graalvm">graalvm</a>

![](img/quarkus/B665EE8E-41E7-4798-A8A2-B13E13FA186E.png)

![](img/quarkus/A6959508-98A3-4128-B6FD-F724EC5370D8.png)

可选择各种扩展，或者不选，直接create

指定graalvm的java17版本

![](img/quarkus/A88DCF4B-C700-46E4-B239-D72522744A7B.png)

指定项目模块配置

![](img/quarkus/825CBDFC-0793-4326-A429-A5A40B606E90.png)

新建好的quarkus项目如下

![](img/quarkus/16D2F543-9ABD-4433-A6D3-6DC6822D349B.png)


# 如何启动quarkus项目

## 第一种启动方式

点击红框按钮

![](img/quarkus/868D143C-98D9-4772-9BB8-D7A208BE270C.png)

输入
``` java
mvn compile quarkus:dev
```

![](img/quarkus/08BFDA2E-96E7-418F-B143-FE213A4B9D48.png)

启动成功后，点击红框链接


![](img/quarkus/122A88A3-8979-4C21-8EE3-D77A7F6F17D8.png)

界面一览

![](img/quarkus/E6A0AD91-C3A8-4AC2-A4B1-C4C2F7B2E36D.png)

点击下方红色划线

![](img/quarkus/9AFB6246-CC61-4DC8-8B80-88FDBB1F38E8.png)

效果如下

![](img/quarkus/B9FD4556-C450-40BF-9C9D-767F35BDD41B.png)

还提供一个开发者界面

http://localhost:8080/q/dev/


随便点了几下，效果如如下

![](img/quarkus/5E54DD0F-E753-4BD9-8182-EF1117452327.png)

![](img/quarkus/8F32C5B1-BE7D-4361-8D6D-E1047474DD32.png)

![](img/quarkus/E232CC11-E590-4413-9093-957E5EE62B2A.png)

![](img/quarkus/F7C2CC47-FF5F-456F-915F-2AF04EF3BC06.png)

## 第二种启动方式

``` java
mvn clean package
```

然后执行

``` java
java -jar target/quarkus-app/quarkus-run.jar
```

效果如下

![](img/quarkus/B15B8025-AF97-4259-94BE-8966C61AFC11.png)

但这个不是像spring-boot那样直接可执行的jar包，要想像spring-boot那样可执行，需要如下

## 第三种启动方式

``` java
mvn package -Dquarkus.package.type=uber-jar

java -jar target/*-runner.jar
```

![](img/quarkus/4E84840E-A517-464C-876B-1DAD95FADCF8.png)

## 第四种启动方式（原生方式）

``` java
mvn package -Pnative
```

如果没安装native-image

``` java
mvn package -Pnative -Dquarkus.native.container-build=true
```

执行成功后如下图

![](img/quarkus/00C18046-BF69-40A2-92EB-122723374761.png)

然后执行

``` java
./target/quarkus-demo-1.0-SNAPSHOT-runner
``` 

![](img/quarkus/77915776-9730-4179-A7F4-CCCDD997548A.png)

如何安装native-image，见<a href="/posts/877356228.html#native-image">native-image</a>
更多原生启动方式资料可见

https://quarkus.io/guides/maven-tooling

>注意
> 
>以上几种启动项目方式，默认端口都是8080，所以需要考虑到端口被占用情况，不能同时启动，如果是Mac系统，输入端口是否被占用的命令，然后杀进程
>``` java
lsof -i:8080
kill -9 
>```
>杀掉其余进程，保证有一个进程启动着就行

# 补充

更多官网学习资料见

https://quarkus.io/guides/

右上角选择相应版本

![](img/quarkus/C37C0EE7-EE49-48FA-B7CC-A9F9E0B6319B.png)

