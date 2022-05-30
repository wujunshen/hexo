---
title: ElasticSearch
excerpt: ES相关
categories:
  - 中间件
tags:
  - 中间件
  - ElasticSearch
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-datalore2022_1.png
abbrlink: 3565236947
date: 2022-05-03 21:50:21
sticky: 100
---

## 基础

index -> type -> mapping -> document -> field

对标数据库

| ES | DB  |
| :--- | :--- |
| index | schma |
| type | 无法对比，ES7.x版本开始移除 |
| mapping | DDL定义，也可理解为数据库中一张table  |
| document | table中一条数据 |
| field | field |

## shard分片

一个index有多个 shard，默认是5个（ES7.x版本开始默认1个），每个 shard 存储部分数据。

shard 存在意义有两个

1. 支持横向扩展
  假设原来5个shard。若数据量增加，可重建一个有 6 个 shard 的索引，将数据导进去
2. 提高性能:
  数据分布在多个 shard，即多台服务器上。 所有操作，会在多台机器上并行分布式执行，提高吞吐量和性能。

shard 数据有多个备份，每个 shard 有一个 primary shard，负责写入数据，还有几个 replica shard。primary shard 写入数据后，将数据同步到其他几个 replica shard 上。

ES集群情况下，推荐是一个node有一个primary shard，它的几个 replica shard分配在其他node。在某个node挂机情况下，还可以保证数据的完整性。

会有一个节点为 master 节点，负责管理工作，比如维护索引元数据、负责切换 primary shard 和 replica shard 身份等。如果 master 节点挂机了，会重新选举一个节点为 master 节点。

如果非 master节点挂机了， master 节点，让挂机节点的 primary shard 的身份转移到其他机器上的 replica shard。修复后重启，master 节点会将缺失的 replica shard 分配到被修复节点，同步后续修改的数据，让集群恢复正常。

> 修复后的节点不再是 primary shard，而是 replica shard

## 倒排索引  

每个 document 都有一个对应的文档 ID，文档内容被表示为一系列关键词的集合。例如，文档 1 经过分词，提取了 20 个关键词，每个关键词都会记录它在文档中出现的次数和出现位置。

倒排索引就是关键词到文档 ID 的映射，每个关键词都对应着一系列的文件，这些文件中都出现了关键词。

| 关键词 | 文档 ID |
| :--- | :--- |
| google | 1,2,3,4,5 |
| java  | 1,2,4,5 |
| kotlin | 3 |
| python | 2,3,5 |

实用的倒排索引还记录文档频率信息，表示文档集合中有多少个文档包含某个关键词。

这样搜索引擎可以很方便地响应用户的查询。比如用户输入查询 google，搜索系统查找倒排索引，从中读出包含这个关键词的文档，这些文档就是提供给用户的搜索结果。

要注意倒排索引的两个重要细节

1. 倒排索引中的所有词项对应一个或多个文档；
2. 倒排索引中的词项根据字典顺序升序排列

## CRUD过程

### create（写数据）

1. 客户端选择一个 node 发送请求过去，这个 node 就是 coordinating node（协调节点）
2. coordinating node 对 document 进行路由，将请求转发给对应的 node（有 primary shard）
3. 实际的 node 的 primary shard 处理请求，然后将数据同步到 replica node
4. coordinating node 如果发现 primary node 和所有 replica node 都搞定之后，就返回响应结果给客户端

![写过程](img/es/377B48909775D4564B3121146AFB9E8A.jpg)

#### 写底层原理

![写原理](img/es/7205E7671F902AEC2DAE65AB68FDB1CE.jpg)

先写入内存 buffer，在 buffer 里的时候数据是搜索不到的；同时将数据写入 translog 日志文件。

如果 buffer 快满了，或者到一定时间，就会将内存 buffer 数据 refresh 到一个新的 segment file 中，但是此时数据不是直接进入 segment file 磁盘文件，而是先进入 os cache 。这个过程就是 refresh。

每隔 1 秒钟，es 将 buffer 中的数据写入一个新的 segment file，每秒钟会产生一个新的磁盘文件 segment file，这个 segment file 中就存储最近 1 秒内 buffer 中写入的数据。

但是如果 buffer 里面此时没有数据，那当然不会执行 refresh 操作，如果 buffer 里面有数据，默认 1 秒钟执行一次 refresh 操作，刷入一个新的 segment file 中。

操作系统里面，磁盘文件其实都有一个东西，叫做 os cache，即操作系统缓存，就是说数据写入磁盘文件之前，会先进入 os cache，先进入操作系统级别的一个内存缓存中去。只要 buffer 中的数据被 refresh 操作刷入 os cache中，这个数据就可被搜索到了。

为什么叫 es 是准实时的？ NRT，全称 near real-time。默认是每隔 1 秒 refresh 一次的，所以 es 是准实时的，因为写入的数据 1 秒之后才能被看到。可以通过 es 的 restful api 或者 java api，手动执行一次 refresh 操作，就是手动将 buffer 中的数据刷入 os cache中，让数据立马就可以被搜索到。只要数据被输入 os cache 中，buffer 就会被清空了，因为不需要保留 buffer 了，数据在 translog 里面已经持久化到磁盘去一份了。

重复上面的步骤，新的数据不断进入 buffer 和 translog，不断将 buffer 数据写入一个又一个新的 segment file 中去，每次 refresh 完 buffer 清空，translog 保留。随着这个过程推进，translog 会变得越来越大。当 translog 达到一定长度的时候，就会触发 commit 操作。

commit 操作发生第一步，就是将 buffer 中现有数据 refresh 到 os cache 中去，清空 buffer。然后，将一个 commit point 写入磁盘文件，里面标识着这个 commit point 对应的所有 segment file，同时强行将 os cache 中目前所有的数据都 fsync 到 segment file 磁盘文件中去。最后清空 现有 translog 日志文件，重启一个 translog，此时 commit 操作完成。

这个 commit 操作叫做 flush。默认 30 分钟自动执行一次 flush，但如果 translog 过大，也会触发 flush。flush 操作就对应着 commit 的全过程，我们可以通过 es api，手动执行 flush 操作，手动将 os cache 中的数据 fsync 强刷到磁盘上去。

translog 日志文件的作用是什么？你执行 commit 操作之前，数据要么是停留在 buffer 中，要么是停留在 os cache 中，无论是 buffer 还是 os cache 都是内存，一旦这台机器死了，内存中的数据就全丢了。所以需要将数据对应的操作写入一个专门的日志文件 translog 中，一旦此时机器宕机，再次重启的时候，es 会自动读取 translog 日志文件中的数据，恢复到内存 buffer 和 os cache 中去。

translog 其实也是先写入 os cache 的，默认每隔 5 秒刷一次到磁盘中去，所以默认情况下，可能有 5 秒的数据会仅仅停留在 buffer 或者 translog 文件的 os cache 中，如果此时机器挂了，会丢失 5 秒钟的数据。但是这样性能比较好，最多丢 5 秒的数据。也可将 translog 设置成每次写操作必须是直接 fsync 到磁盘，但是性能会差很多。

#### 总结

数据先写入内存 buffer，然后每隔 1s，将数据 refresh 到 os cache，到了 os cache 数据就能被搜索到（所以 es 是准实时的，从写入到能被搜索到，中间有 1s 的延迟）。每隔 5s，将数据写入 translog 文件（这样如果机器宕机，内存数据全没，最多会有 5s 的数据丢失），translog 大到一定程度，或者默认每隔 30mins，会触发 commit 操作，将缓冲区的数据都 flush 到 segment file 磁盘文件中

> 数据写入 segment file 之后，同时建好了倒排索引


### requery（读数据）
根据 doc id 进行 hash，判断出来当时把 doc id 分配到了哪个 shard 上面去，从那个 shard 去查询。

1. 客户端发送请求到任意一个 node，成为 coordinate node
2. coordinate node 对 doc id 进行哈希路由，将请求转发到对应的 node，此时会使用 round-robin 随机轮询算法，在 primary shard 以及其所有 replica 中随机选择一个，让读请求负载均衡
3. 接收请求的 node 返回 document 给 coordinate node
4. coordinate node 返回 document 给客户端

### update/delete(更新/删除数据)

#### 更新

就是将原来的 doc 标识为 deleted 状态，然后新写入一条数据。

#### 逻辑删除

commit 的时候会生成一个 .del 文件，里面将某个 doc 标识为 deleted 状态，那么搜索的时候根据 .del 文件就知道这个 doc 是否被删除了

#### 物理删除

buffer 每 refresh 一次，就会产生一个 segment file，所以默认情况下是 1 秒钟一个 segment file，这样下来 segment file 会越来越多，此时会定期执行 merge。每次 merge 的时候，会将多个 segment file 合并成一个，同时这里会将标识为 deleted 的 doc 给物理删除掉，然后将新的 segment file 写入磁盘，这里会写一个 commit point，标识所有新的 segment file，然后打开 segment file 供搜索使用，同时删除旧的 segment file

#### 全文检索（full-text search）

1. 客户端发送请求到一个 coordinate node
2. 协调节点将搜索请求转发到所有的 shard 对应的 primary shard 或 replica shard，都可以
3. query phase:每个 shard 将自己的搜索结果（其实就是一些 doc id）返回给协调节点，由协调节点进行数据的合并、排序、分页等操作，产出最终结果
4. fetch phase:接着由协调节点根据 doc id 去各个节点上拉取实际的 document 数据，最终返回给客户端

> 写请求是写入 primary shard，然后同步给所有的 replica shard；读请求可以从 primary shard 或 replica shard 读取，采用的是随机轮询算法

## 调优指南

### filesystem cache
你往 es 里写的数据，实际都写到磁盘文件里去了，查询的时候，操作系统会将磁盘文件里的数据自动缓存到 filesystem cache 里面去。

![filesystem cache](img/es/280A6A711E43D74F32D492EA0A660F00.jpg)

es 的搜索引擎严重依赖于底层的 filesystem cache，你如果给 filesystem cache 更多的内存，尽量让内存可以容纳所有的 idx segment file 索引数据文件，那么你搜索的时候就基本都是走内存的，性能会非常高。

归根结底，要让 es 性能好，最佳的情况下，就是你的机器的内存，至少可以容纳你的总数据量的一半。

如果内存留给 filesystem cache 的是 100G，将索引数据控制在 100G 以内，这样数据几乎全部走内存来搜索，性能非常之高，一般可以在 1 秒以内。

假设现在有一行数据。id,name,age .... 30 个字段。但是现在搜索，只需要根据 id,name,age 三个字段来搜索。如果傻乎乎往 es 里写入一行数据所有的字段，就会导致说 90% 的数据是不用来搜索的，结果硬是占据了 es 机器上的 filesystem cache 的空间，**单条数据的数据量越大，就会导致 filesystem cahce 能缓存的数据就越少**。其实，仅仅写入 es 中要用来检索的少数几个字段就可以，比如说就写入 id,name,age 三个字段，然后你可把其他的字段数据存在 mysql/hbase 里，一般建议用 es + hbase 架构。

hbase 的特点是适用于海量数据的在线存储，对 hbase 可以写入海量数据，但是不要做复杂的搜索，做很简单的一些根据 id 或者范围进行查询的这么一个操作就可以了。从 es 中根据 name 和 age 去搜索，拿到的结果可能就 20 个 doc id，然后根据 doc id 到 hbase 里去查询每个 doc id 对应的完整数据，返回给前端。

写入 es 的数据最好小于等于，或者是略微大于 es 的 filesystem cache 的内存容量。然后你从 es 检索可能就花费 20ms，然后再根据 es 返回的 id 去 hbase 里查询，查 20 条数据，可能也就耗费个 30ms，如果1T 数据都放 es，会每次查询都是 5~10s，现在性能就会很高，每次查询就是 50ms。

### 数据预热

如果 es 集群中每个 node 写入的数据量还是超过了 filesystem cache 一倍，就可以做数据预热。
对于热点数据，自己后台搞个系统，每隔一会儿，后台系统去搜索一下热数据，刷到 filesystem cache 里去，后面用户实际上看热数据时，他们直接从内存里搜索了，就很快。

对于觉得比较热的、经常会有人访问的数据，最好做一个专门的缓存预热子系统，就是对热数据每隔一段时间，提前访问一下，让数据进入 filesystem cache 里面去。这样下次别人访问的时候，性能一定会好很多。

### 冷热分离

es 可以做类似于 mysql 的水平拆分，就是说将大量的访问很少、频率很低的数据，单独写一个索引，然后将访问很频繁的热数据单独写一个索引。最好是将冷数据写入一个索引中，然后热数据写入另外一个索引中，这样可以确保热数据在被预热之后，尽量都让他们留在 filesystem os cache 里，别让冷数据给冲掉。

### document 模型设计
对于 MySQL，我们经常有一些复杂的关联查询。在 es 里面的复杂的关联查询尽量别用，一旦用了性能一般都不太好。
最好是在 Java 系统里就完成关联，将关联好的数据直接写入 es 中。搜索的时候，就不需要利用 es 的搜索语法来完成 join 之类的关联搜索。
另外对于一些太复杂的操作，比如 join/nested/parent-child 搜索都要尽量避免，性能都很差的。

### 分页性能优化

es 的分页较坑的。假如你每页是 10 条数据，你现在要查询第 100 页，实际上是会把每个 shard 上存储的前 1000 条数据都查到一个协调节点上，如果你有个 5 个 shard，那么就有 5000 条数据，接着协调节点对这 5000 条数据进行一些合并、处理，再获取到最终第 100 页的 10 条数据。

解决方案

**不允许深度分页（默认深度分页性能很差）**

**类似于抖音视频不断下拉出一页一页视频数据**

scroll 会一次性生成所有数据的一个快照，然后每次滑动向后翻页就是通过游标 scroll_id 移动，获取下一页下一页这样子，性能会比上面说的那种分页性能要高很多很多，基本上都是毫秒级的。
但是，唯一注意的一点就是，不能随意跳到任何一页。不能先进入第 10 页，然后去第 120 页，然后又回到第 58 页，不能随意乱跳页。
初始化时必须指定 scroll 参数，告诉 es 要保存此次搜索的上下文多长时间。你需要确保用户不会持续不断翻页翻几个小时，否则可能因为超时而失败。
除了用 scroll api，你也可以用 search_after 来做，search_after 的思想是使用前一页的结果来帮助检索下一页的数据，这种方式也不允许随意翻页，只能一页页往后翻。初始化时，需要使用一个唯一值的字段作为 sort 字段。

## 参考资料
1.[中华石杉--互联网Java进阶面试训练营](https://gitee.com/shishan100/Java-Interview-Advanced)
  
2.[Elasticsearch性能调优](https://elasticsearch.cn/article/6202)

## [推荐书单](/ElasticSearch)
