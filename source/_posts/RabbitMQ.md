---
title: RabbitMQ
excerpt: 消息队列-RabbitMQ
categories:
- 中间件
tags:
- 中间件
- 消息队列
- RabbitMQ
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-dotpeek2022_1.png
abbrlink: 3041119952
date: 2022-05-13 06:22:50
sticky: 80
---

消息队列使用目的:

**异步**、**削峰**、**解耦**

# 基础

RabbitMQ基于AMQP协议，通过使用通用协议就可以做到在不同语言之间传递。

## 核心概念

1. server
   又称broker，接受客户端连接，实现AMQP实体服务。
2. connection
   连接和具体broker网络连接。
3. channel
   网络信道，几乎所有操作都在channel中进行，channel是消息读写的通道。客户端可以建立多个channel，每个channel表示一个会话任务。
4. message
   消息，服务器和应用程序之间传递的数据，由properties和body组成。properties可以对消息进行修饰，比如消息的优先级，延迟等高级特性;body是消息实体内容。
5. virtual host
   虚拟主机，用于逻辑隔离，最上层消息的路由。一个virtual host可以若干个exchange和queue，同一个virtual host不能有同名的exchange或queue。
6. exchange
   交换机，接受消息，根据路由键转发消息到绑定的队列上。
7. banding
   exchange和queue之间的虚拟连接，binding中可以包括routing key
8. routing key
   一个路由规则，虚拟机根据他来确定如何路由一条消息。
9. queue
   消息队列，用来存放消息的队列。

## Exchange

类型有 direct、topic、fanout、headers、durability（是否需要持久化，true为需要）、auto delete

最后一个绑定Exchange上的队列被删除Exchange也删除。

主要介绍下列三个:

1. direct
   所有发送到Direct Exchange的消息被转发到RouteKey中指定的Queue,Direct Exchange可以使用默认的默认的Exchange （default
   Exchange），默认的Exchange会绑定所有的队列，所以Direct可以直接使用Queue名（作为routing key ）绑定。或者消费者和生产者的routing key完全匹配。
2. topic
   是指发送到Topic Exchange的消息被转发到所有关心的Routing key中指定topic的Queue上。Exchange 将routing
   key和某Topic进行模糊匹配，此时队列需要绑定一个topic。所谓模糊匹配就是可以使用通配符，"#"可以匹配一个或多个词，"* "只匹配一个词。
   比如"log.#"可以匹配"log.info.test"
   "log.*" 就只能匹配log.error。
3. fanout
   不处理路由键，只需简单的将队列绑定到交换机上。发送到这个 Exchange 上的消息都会被发送到与它绑定的队列上。Fanout转发是最快的。

# 如何实现高可用？

**开启镜像模式**

创建的queue，无论元数据还是queue里的消息都会存在于多个实例上。

就是说，每个RabbitMQ节点都有这个queue的一个完整镜像，包含queue的全部数据。

每次写消息到queue，都会自动把消息同步到多个实例的queue上

![镜像模式](img/rabbitmq/A591C744680EDD96A069B3D1F5A6E5B9.jpg)

**如何开启？**

后台新增镜像集群模式的策略，指定时要求数据同步到所有节点，也可要求同步到指定数量的节点。

再次创建 queue 的时候，应用这个策略，就会自动将数据同步到其他的节点上去

**优点**:
任何一个节点挂了，其它节点还包含 queue 的完整数据， consumer 可以到其它节点上去消费数据。

**缺点**:
第一，性能开销大，消息需要同步到所有节点上，导致网络带宽压力和消耗很重
第二，不是分布式，没有扩展性可言。如果某个 queue 负载很重，加机器，新增的机器也包含了这个 queue 的所有数据，并没有办法线性扩展 queue。如果queue 的数据量很大，大到节点容量无法容纳，就不行了

# 如何实现消息消费幂等，即不被重复消费？

见[Kafka](/posts/2591906323.html#如何实现消息消费幂等，即不被重复消费？)内容

# 如果保证不丢消息？

![丢消息情形](img/rabbitmq/7FABA29BB5EFAE6906C4D54E6961103C.jpg)

丢数据分三种情况

## 生产者

数据发送到 RabbitMQ 时，因为网络问题，可能数据丢了。

选择 RabbitMQ 提供的事务功能，在生产者发送数据之前开启 RabbitMQ 事务 channel.txSelect，然后发送消息，如果消息没有成功被 RabbitMQ
接收到，那么生产者会收到异常报错，此时就可以回滚事务channel.txRollback，然后重试发送消息；如果收到了消息，那么可以提交事务channel.txCommit

``` java
// 开启事务
channel.txSelect
try {
    // 这里发送消息
} catch (Exception e) {
    channel.txRollback
    // 这里再次重发这条消息
}

// 提交事务
channel.txCommit
```

RabbitMQ 事务机制（同步）会让吞吐量下降，因此会很耗性能。

如果要确保写 RabbitMQ 消息不丢消息，可以开启 confirm 模式，在生产者设置开启 confirm 模式，每次写消息分配一个唯一的 id，然后写入RabbitMQ 中，RabbitMQ 会回传一个 ack 消息，说这个消息 ok
了。如果 RabbitMQ 没能处理这个消息，会回调一个 nack 接口，告诉消息接收失败，只能再次重试。但可结合这个机制在内存里维护每个消息 id 的状态，如果超过一定时间还没接收到这个消息的回调，那可以重发。

事务机制和 confirm 机制最大的不同在于:
事务机制是同步，提交一个事务之后会阻塞,但 confirm 机制是异步，发个消息后可以发送下一个消息，然后下一个消息 RabbitMQ 接收了之后会异步回调一个接口通知这个消息已接收到。

因此在生产者这块为了避免数据丢失，都是用 confirm 机制。

## RabbitMQ服务

必须开启 RabbitMQ 持久化，就是消息写入之后持久化到磁盘，即使RabbitMQ 挂了，恢复之后会自动读取之前存储的数据，一般情况下数据就不会丢。
除非 RabbitMQ 自身还没持久化就挂了，可能会导致少量数据丢失，但发生概率较小。

设置持久化有两个步骤:

* 创建 queue 时,设置持久化
  保证 RabbitMQ 持久化 queue 的元数据，但是不会持久化 queue 里的数据。

* 发送消息时,把消息的 deliveryMode 设置为 2
  即把消息设置为持久化，此时 RabbitMQ 会将消息持久化到磁盘上去。

必须要同时设置这两个持久化，RabbitMQ 就算挂了再重启，也会从磁盘上重启恢复 queue，恢复这个 queue 的数据。

但是还有一种可能，就是某个消息写到了 RabbitMQ 中，但还没来得及持久化到磁盘上。此时 RabbitMQ 挂了，就会导致内存里的一点点数据丢失。

所以，持久化可以和生产者的 confirm 机制配合起来，只有消息被持久化到磁盘之后，才会通知生产者 ack ，哪怕持久化到磁盘之前，RabbitMQ 挂了，数据丢了，生产者收不到 ack，还是可以重发。

## 消费者

使用 RabbitMQ 提供的 ack 机制，简而言之，必须关闭 RabbitMQ 的自动 ack，通过一个 api 来调用就可以了，之后每次，确保代码处理完消息时，再在程序里 ack 一次。通过这样的处理方式，如果还没处理完消息，没有
ack 时， RabbitMQ 会认为代码还没处理完，就会把这个消息消费动作分配给别的消费者处理，这样消息是不会丢的。

## 总结

![丢消息解决方案脑图](img/rabbitmq/6141BD7C1D6731BC639E9054816B69B8.jpg )

# 如何保证消息被消费的顺序？

## 场景

![按顺序消费情形](img/rabbitmq/9418C9D261BC18C401FDF0837D241627.jpg)

如上图，生产者向 RabbitMQ 里发送三条数据，要求的消费顺序依次是data1/data2/data3。
有三个消费者分别从 MQ 中消费这三条数据中的一条，结果消费者2先执行完操作，把 data2 存入数据库，然后是 data1/data3。这就没有达到要求的消费顺序。

## 解决方案

拆分成多个 queue，每个 queue 负责一个 consumer；或就一个 queue 对应一个 consumer，然后这个 consumer 内部用内存队列做排队，比如设定消息消费的优先级

![解决方案](img/rabbitmq/6BCA2B939EEE4DD7944D5447B3A116EA.jpg)

# [推荐书单](/RabbitMQ)
