---
title: Kafka
excerpt: 消息队列-Kafka
categories:
  - 中间件
tags:
  - 中间件
  - 消息队列
  - Kafka
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-dataspell2022_1.png
abbrlink: 2591906323
date: 2022-05-10 07:02:37
sticky: 90
---

## 基本概念

### 主题（Topic）

Kafka将一组消息抽象归纳为一个主题（Topic），一个主题就是对消息的一个分类。生产者将消息发送到特定主题，消费者订阅主题或主题的某些分区进行消费

### 消息(Message/Record)

消息是Kafka通信的基本单位，由一个固定长度的消息头和一个可变长度的消息体构成。老版本中，每一条消息称为Message；在由Java重新实现的客户端中，每一条消息称为Record。

### 分区和副本（Partition&Replica）

Kafka将一组消息归纳为一个主题，而每个主题又被分成一个或多个分区（Partition）

每个分区由一系列有序、不可变的消息组成，是一个有序队列。每个分区在物理上对应为一个文件夹，分区的命名规则为主题名称后接“—”连接符，之后再接分区编号，分区编号从0开始，编号最大值为分区的总数减1。每个分区又有一至多个副本（Replica），分区的副本分布在集群的不同代理上，以提高可用性。

从存储角度上分析，分区的每个副本在逻辑上抽象为一个日志（Log）对象，即分区的副本与日志对象是一一对应的。每个 topic 对应的分区数可以在Kafka启动时所加载的配置文件中配置，也可在创建 topic 时指定。当然，客户端还可以在 topic 创建后修改它的分区数。

理论上说，Partition 数越多吞吐量越高，但这要根据集群实际环境及业务场景而定。同时，Partition 也是Kafka保证消息被顺序消费以及对消息进行负载均衡的基础。
**Kafka只能保证一个 Partition 之内消息的有序性，并不能保证跨 Partition 消息的有序性。**
每条消息被追加到相应的 Partition 中，是顺序写磁盘，因此效率非常高，这是Kafka高吞吐率的一个重要保证。同时与传统消息系统不同的是，Kafka并不会立即删除已被消费的消息，由于磁盘的限制，消息也不会一直被存储，因此Kafka提供两种删除老数据的策略

1. 基于消息已存储的时间长度，
2. 基于分区的大小。

### Leader和Follower副本
由于Kafka副本的存在，就需要保证一个分区的多个副本之间数据的一致性，Kafka会选择该分区的一个副本作为Leader副本，而该分区其他副本即为Follower副本，只有Leader副本才负责处理客户端读/写请求，Follower副本从Leader副本同步数据。如果没有Leader副本，那就需要所有的副本都同时负责读/写请求处理，同时还得保证这些副本之间数据的一致性，假设有n个副本则需要有n×n条通路来同步数据，这样数据的一致性和有序性就很难保证。

引入Leader副本后客户端只需与Leader副本进行交互，这样数据一致性及顺序性就有了保证。Follower副本从Leader副本同步消息，对于n个副本只需n-1条通路即可，这样就使得系统更加简单而高效。副本Follower与Leader的角色并不是固定不变的，如果Leader失效，通过相应的选举算法将从其他Follower副本中选出新的Leader副本。

### 偏移量（offset）

任何发布到分区的消息会被直接追加到日志文件（分区目录下以“.log”为文件名后缀的数据文件）的尾部，而每条消息在日志文件中的位置都会对应一个按序递增的偏移量。偏移量是一个分区下严格有序的逻辑值，它并不表示消息在磁盘上的物理位置。由于Kafka几乎不允许对消息进行随机读写，因此Kafka并没有提供额外索引机制到存储偏移量，也就是说并不会给偏移量再提供索引。消费者可以通过控制消息偏移量来对消息进行消费，比如可以指定消费的起始偏移量。为了保证消息被顺序消费，消费者已消费的消息对应的偏移量也需要保存。需要说明的是，消费者对消息偏移量的操作并不会影响消息本身的偏移量。旧版消费者将消费偏移量保存到ZooKeeper当中，而新版消费者是将消费偏移量保存到Kafka内部一个 topic 里。当然，消费者也可以自己在外部系统保存消费偏移量，而无需保存到Kafka中。

### 日志段（LogSegment）

一个日志又被划分为多个日志段（LogSegment），日志段是Kafka日志对象分片的最小单位。与日志对象一样，日志段也是一个逻辑概念，一个日志段对应磁盘上一个具体日志文件和两个索引文件。日志文件是以“.log”为文件名后缀的数据文件，用于保存消息实际数据。两个索引文件分别以“.index”和“.timeindex”作为文件名后缀，分别表示消息偏移量索引文件和消息时间戳索引文件。

### 代理（broker）

Kafka集群就是由一个或多个Kafka实例构成，我们将每一个Kafka实例称为代理（Broker），通常也称代理为Kafka服务器（Kafka Server）。在生产环境中Kafka集群一般包括一台或多台服务器，我们可以在一台服务器上配置一个或多个代理。每一个代理都有唯一的标识id，这个id是一个非负整数。在一个Kafka集群中，每增加一个代理就需要为这个代理配置一个与该集群中其他代理不同的id, id值可以选择任意非负整数即可，只要保证它在整个Kafka集群中唯一，这个id就是代理的名字，也就是在启动代理时配置的broker.id对应的值，由于给每个代理分配了不同的brokerId，这样对代理进行迁移就变得更方便，对消费者来说也是透明的，不影响消费者对消息的消费。

### 生产者（Producer）

生产者（Producer）负责将消息发送给broker，也就是向 broker 发送消息的客户端。

### 消费者和消费组（Comsumer&ConsumerGroup）

消费者（Comsumer）以拉取（pull）方式拉取数据，它是消费的客户端。在Kafka中每一个消费者都属于一个特定消费组（ConsumerGroup），可以为每个消费者指定一个消费组，以groupId代表消费组名称，通过group.id配置设置。

如果不指定消费组，则该消费者属于默认消费组test-consumer-group。同时，每个消费者也有一个全局唯一的id，通过配置项client.id指定，如果客户端没有指定消费者的id, Kafka会自动为该消费者生成一个全局唯一的id，格式为${groupId}-${hostName}-${timestamp}-${UUID前8位字符}。

**同一个主题的一条消息只能被同一个消费组下某一个消费者消费，但不同消费组的消费者可同时消费该消息。**

消费组是Kafka用来实现对一个主题消息进行广播和单播的手段，实现消息广播只需指定各消费者均属于不同的消费组，消息单播则只需让各消费者属于同一个消费组。

### ISR（In-sync Replica）

Kafka在ZooKeeper中动态维护了一个ISR（In-sync Replica），即保存同步的副本列表，该列表中保存的是与Leader副本保持消息同步的所有副本对应的代理节点id。如果一个Follower副本挂机或是落后太多，则该Follower副本节点将从ISR列表中移除。

### ZooKeeper

Kafka利用ZooKeeper保存相应元数据信息，Kafka元数据信息包括如代理节点信息、Kafka集群信息、旧版消费者信息及其消费偏移量信息、主题信息、分区状态信息、分区副本分配方案信息、动态配置信息等。Kafka在启动或运行过程当中会在ZooKeeper上创建相应节点来保存元数据信息，通过监听机制，使用这些被注册节点所对应的监听器来监听节点元数据的变化，从而由ZooKeeper负责管理维护Kafka集群，同时ZooKeeper可对Kafka集群进行水平扩展及数据迁移。

![Kafka集群架构图](img/kafka/9244F89BDC9EA65E70F362974629327F.jpg)

## 如何实现高可用？
Kafka 基本架构:由多个 broker 组成，每个 broker 一个节点;创建一个 topic，topic 可划分为多个 partition，每个partition 可存在于不同的 broker 上，每个 partition 就放一部分数据。
天然的分布式消息队列，一个 topic 的数据，是分散放在多个节点上，每个节点放一部分数据

RabbmitMQ 之类，不是分布式消息队列，就是传统的消息队列，只不过提供了一些集群、 HA(High Availability, 高可用性) 的机制而已，因为无论怎么样，RabbitMQ 一个 queue 的数据都是放在一个节点里的，镜像集群下，也是每个节点都放这个 queue 的完整数据。

Kafka 0.8 之后，提供 HA 机制，即 replica（复制） 副本机制。每个 partition 的数据都会同步到其它节点上，形成自己的多个 replica 副本。所有 replica 会选举一个 leader 出来，那么生产和消费都跟这个 leader 打交道，然后其他 replica 就是 follower。

![高可用实现图](img/kafka/A142B532FB6EC2FE77D6E31B79D1E51B.jpg)

写: leader 会负责把数据同步到所有 follower 上去。
读: 直接读 leader 上的数据即可。

只能读写leader，因为如果可以随意读写每个 follower，那么就要关注数据一致性的问题，系统复杂度太高，容易出问题。 Kafka 会均匀地将一个 partition 的所有 replica 分布在不同的机器上，这样可以提高容错性。

## 如何实现消息消费幂等，即不被重复消费？

Kafka 有个 offset 概念，每个消息写进去，都有一个 offset 代表消息序号，然后 consumer 消费数据之后， 每隔一段时间（定时定期），会把自己消费过的消息 offset 提交一下，表示“我已经消费过了，
下次我要是重启，就让我从上次消费到的 offset 来继续消费”。

如果重启直接 kill 进程了，再重启。会导致consumer 有些消息处理了，但没来得及提交 offset。这样重启之后，少数消息会再次消费一次。这就可能引起消息被重复消费的现象

结合业务有几个办法:

1. 拿数据写库，先根据主键查，如果数据有了，就别插入了，update 一下。
2. 拿数据写redis，每次set就行，天然幂等性
3. 设置个commit id。消费时候，去db或者redis查，如果查不到说明是第一次消费，消费好消息，把commit id写入db或redis。这样如果第二次和之后几次消费，这个commit id查得到，就不做任何消息消费动作。或者就是利用db的主键唯一键，重复插入时候会报错

![实现消息幂等](img/kafka/47180D3F2A28B15A859D40235471F369.jpg)

## 如果保证不丢消息？

### 生产者

两个参数需要配置:

1. 在 producer 端设置 acks=all:
   这是要求每条数据，必须是写入所有 replica 之后，才能认为是写成功。
2. 在 producer 端设置 retries=MAX（很大一个值，表示可以无限次重试）:
   这是要求一旦写入失败，就无限重试，卡在这里。

这样 leader 接收到消息，所有的 follower 都同步到了消息以后，才算本次写成功。
如果没满足此条件，生产者会自动不断的重试，重试无限次。

### Kafka服务

假设 Kafka 某个 broker 宕机，然后重新选举 partition 的 leader。要是此时其他的 follower 刚好还有些数据没有同步，结果此时 leader 挂了，然后选举某个 follower 成 leader 之后，就少了一些数据。

所以此时至少设置如下 4 个参数：

1. 给 topic 设置 replication.factor 参数:
   这个值必须大于 1，要求每个 partition 必须有至少 2 个副本。
2. 在 Kafka 服务端设置 min.insync.replicas 参数:
   这个值也必须大于 1，这是要求一个 leader 至少感知到有至少一个 follower 还跟自己保持联系，这样才能确保 leader 挂了还有一个 follower
3. 同生产者1
4. 同生产者2

这样配置后，可保证在 leader 所在的 broker 发生故障，进行 leader 切换时，数据不会丢失。

### 消费者

只有1种情况 Kafka 消费者会丢消息:

消费者那边自动提交了 offset， Kafka 服务以为消费者已消费好消息，但消费者才准备处理消息，此时消费者因为暴力停机或其他原因突然挂了，那么此时这条消息就丢失了。

解决方案和 RabbitMQ 类似，就是关闭自动提交 offset，处理完之后自己手动提交 offset，就可保证数据不丢失。但可能会有重复消费，假设处理完，还没提交 offset，结果消费者挂了，那肯定会再次重复消费一次，所以自己要保证幂等性。

如果 Kafka 消费者消费到数据之后，将消息写入一个内存的 queue 里做缓冲。此时系统重启的话，会导致有一定几率出现消息丢失情况。

这种情况就是消息刚被写入内存 queue，然后消费者自动提交 offset之后，内存 queue 碰到系统重启，在queue里的数据还没来得及进行处理就丢失了。

## 如何保证消息被消费的顺序？

### 场景

和 RabbitMQ类似，假设一个 topic，有三个 partition。生产者向 Kafka 发送三条数据，要求的消费顺序依次是 data1/data2/data3。

在写的时候，依次写入同一个 partition 中，这个 partition 中的数据一定是有序的。

消费者从 partition 中取数据消费时，也一定是有序的。

但是如果消费者是单线程消费处理，且处理比较耗时的时候，比如处理一条消息耗时几十 ms，那么 1 秒钟只能处理几十条消息，吞吐量会很低。因此使用多线程消费消息时候，可能就会产生消费顺序错乱的问题。

![顺序消费场景](img/kafka/92E14FC0AF0DF75CE7CEB8748EB694F6.jpg)

### 解决方案

写 N 个内存 queue，data1/data2/data3 按照顺序写入到同一个内存 queue;然后对于 N 个线程，每个线程分别消费一个内存 queue ，这样三条数据都是多线程中同一个线程消费，这样就能保证顺序。见下图示例

![顺序消费解决方案](img/kafka/91B949E193FD5E4E6611163E80803FE7.jpg)

## 参考资料

1.[中华石杉--互联网Java进阶面试训练营](https://gitee.com/shishan100/Java-Interview-Advanced)

## [推荐书单](/Kafka)
