---
title: Zookeeper
excerpt: zookeeper
categories:
  - 中间件
tags:
  - 中间件
  - zookeeper
layout: post
index_img: /img/jetbrain/1920x1080-phpstorm2022_1.png
comments: true
abbrlink: 987247817
date: 2022-05-16 14:55:32
sticky: 50
---

主要用途

* 分布式集群的集中式元数据存储（Dubbo，Kafka，Hbase）
* Master选举实现HA（高可用）架构（HDFS）
* 分布式协调和通知（Kafka）
* 分布式锁（java编写的分布式业务系统）

# 架构

* 数据模型节点: znode，可认为是一个节点，纯内存保存。和文件系统类似，有层级关系的树形文件结构
* 数据一致性: 任何一个zk节点收到写请求之后都会同步给其他机器，保证数据的强一致，连到任何一个zk节点看到的数据都是一致的
* 按顺序写: 只有一个zk节点可以写，所有节点都可读，所有写请求会分配一个集群全局唯一的递增编号，叫zxid，保证各客户端发起的写请求都是有序的
* 高可用: 只要不挂掉超过一半的节点，都能保证可用，数据不丢失
* 高性能: 每一个zk节点都在内存维护数据，所以集群绝对是高并发高性能的
* 高并发: 基于纯内存数据结构处理，并发能力高
* 集群化部署: 每个zk节点都在内存保存了zk的全部数据，各节点之间互相通信同步数据，客户端连接任何一节点都可访问数据

如图

![架构](img/zookeeper/CCDA654CFB8190E20CAE89EEBB340AE9.jpg)

下面根据上述几点依次说明

## 数据模型节点

zk节点有4种类型:

1. PERSISTENT 持久化节点
   节点创建后就一直存在的节点，除非有删除操作来主动删除这个节点。持久化节点的生命周期是永久有效的，不会因为创建该节点的客户端session失效而消失。（session概念见下文）

2. PERSISTENT_SEQUENTIAL 持久化顺序节点
   这类节点的生命周期和持久化节点一致。额外特性是，在zk中，每个父节点会对它的第一级子节点维护一份顺序编码，记录每个子节点创建的先后顺序。如果创建子节点时，可以设置这个属性，那么在创建过程中，zk会自动为给定节点名加上一个表示顺序的数字后缀来作为新的节点名。这个后缀数字的值上限是整型的最大值。
   如，创建节点时只需要传入节点“/test_”, zk自动会在”test_”后面补充数字顺序

3. EPHEMERAL 临时节点
   和持久化节点不同，临时节点的生命周期和客户端session绑定。也就是说，如果客户端session失效，这个节点就会被自动删除。注意，session失效不是连接断开。还要注意一件事，就是session失效后，所产生的节点也不是一下子就消失，也要过一段时间，大概是10秒以内。另外，临时节点下面不能创建子节点

4. EPHEMERAL_SEQUENTIAL 临时顺序节点
   此节点属于临时节点，不过带有顺序编号，客户端session结束，所产生的节点就会消失

节点分三种角色

1. Leader 集群启动自动选举一个Leader出来，只有Leader是可写的
2. Follower 只能同步数据和提供数据的读取，Leader挂了，Follower可以继续选举新Leader
3. Observer 也是只读节点，但Observer不参与选举

客户端跟zk建立连接是TCP长连接，建立了一个session，可通过心跳感知到session是否存在

sessionTimeout: 会话超时时间
如果客户端和ZK集群连接断开，只要客户端在指定sessionTimeout超时时间内重新连上一个zk节点，就能继续保持session，否则session就超时

### 核心机制：Watcher监听回调

客户端可对znode进行Watcher监听，znode状态改变时回调通知客户端。

用于协调分布式系统:系统A监听一个数据变化，如果系统B更新了那个数据节点，zk反向通知系统A这个数据节点发生了变化

## 数据一致性

通过ZAB协议（ZooKeeper Atomic Broadcast，ZooKeeper原子广播协议）来做数据同步，保证数据一致性。

协议本身按照之前所述节点类型，是leader和follower主从架构。只有leader可以进行写操作。读操作是leader和follower都可以。

### 核心思想
写过程采用2PC事务，过半follower提交机制

如图

![ZAB](img/zookeeper/130DDDCEEE94CD1F325B6C0440F0CAA0.jpg)

整个过程是leader先收到写事务请求，转换成事务proposal（提议）同步给所有follower，每个follower如图左部红框，将proposal写入自己的磁盘日志文件中。然后发送个ack给leader，通知leader自己已收到proposal。

如果超过半数的follower向leader发起ack，反馈说已收到proposal，leader就再给所有follower发送一个commit信息，让所有follower正式提交写事务，将数据写入到各自的内存存储znode里。

如果leader挂机了，要重新选举leader，故障leader就算恢复了，也要变成follower。

### ZAB协议流程

1. 集群启动
   启动时，进入恢复模式，选举一个leader出来，然后leader等待集群中过半的follower跟它进行数据同步，只要过半follower完成数据同步，就退出恢复模式，开始对外提供服务了
   **只要超过一半的节点，认可某节点是leader，就可以被选举为leader节点**

2. 消息写入
   进入消息广播模式，只有leader可以接受写请求，但客户端可随便连接leader或者follower，如果客户端连接到follower，follower会把写请求转发给leader
   leader收到写请求，就把请求同步给所有的follower，过半follower发起ack说收到了，就再发commit给所有的follower，让大家提交写请求事务（见前述核心思想）

3. 崩溃恢复
   如果leader突然挂机，进入恢复模式，重新选举出一个leader节点，只要过半节点承认是leader，就可以选举出一个leader，所以zk很重要的一点是只要挂机的节点数小于整体节点数的一半，就可正常工作


#### zk数据一致性到底是强一致性还是最终一致性？

首先搞清楚强一致性和最终一致性的概念

* 强一致性
  只要写入一条数据，立马无论从zk哪个节点上都可以读到这条数据，这就是强一致性。很明显，ZAB协议机制一看就不是强一致性。因为需要leader和全部follower节点都commit了之后，才能让数据写入操作返回，认为写入成功
* 最终一致性
  写入一条数据，返回告知写入成功了，此时有可能马上去其他zk节点上查数据查不到，在短暂时间内是不一致的，但是过一会儿，最终这条数据一定是可以被查到的

根据前述ZAB协议写入数据流程，过半follower对事务proposal发送ack给leader，leader再发送commit给所有follower，只有follower或者leader进行了commit，这个数据才会被客户端读取到。

那会有一种可能，就是有的follower已经commit了，但是有的follower还没有commit，这会导致某个客户端连接到follower01，可以读取到刚commit的数据，但连接到follower02，可能还没法读取到

所以zk不是强一致的，不是说leader节点必须保证一条数据被全部follower节点都commit了，才会读取到数据，而是过程中可能会在不同的follower上读取到不一致的数据，但最终一定会全部commit后达成数据一致

zk官方给自己的定义: **顺序一致性**
也就是说zk是最终一致性的，但其实比最终一致性更好一点，因为leader节点一定会保证所有的proposal同步到follower上都是按照顺序来写入，起码顺序不会乱(见下文)。但是全部follower的数据一致确实是最终才能实现一致的

>如果非要求强一致性，可以手动调用zk的sync()操作


## 按顺序写

按照前述内容，leader节点发起事务Proposal的广播的事务提议，仅仅只是个提议而已，过半follower都ack，leader节点就直接发起commit消息到全部follower节点上，让大家提交；

这里leader节点发起事务proposal之前，会分配一个全局唯一递增的事务id叫zxid，通过这个zxid来严格保证写顺序，它会为每个follower节点创建一个队列，里面放入要发送给follower的事务proposal，这样来保证了数据同步的顺序性

每个follower节点收到事务proposal之后，需要立即写入本地磁盘日志中，写入成功之后就可保证数据不会丢失，然后发送一个ack给leader，过半follower都发送了ack，leader就推送commit消息给全部follower，
leader节点它自己也会进行commit操作

commit之后，就意味这个数据可以被读取到了。

## 高可用

有两种数据不一致情况，zk会展现高可用特性，如下:

1. leader收到了过半的follower的ack，接着leader自己commit了，还没来得及发送commit给所有follower自己就挂了，此时leader数据跟所有follower数据是不一致的，必须要保证全部follower最终都要commit
   解决方案:
   在老leader节点崩溃时，选举一个zxid最大的节点作为新leader节点，它来检查事务日志，如果发现自己磁盘日志里有一个proposal，但是还没提交，说明肯定是之前挂掉的leader没来得及发送commit就崩溃了。
   此时新leader节点就得作为leader身份把这个proposal发送commit到其他所有的follower上，这就保证了之前老leader提交的事务最终会同步提交到所有follower那边
2. leader自己收到一个请求，结果没来得及发送proposal给所有follower，在这之前就挂了，此时这个leader上的请求应该是要被丢弃掉的
   解决方案:
   老leader节点自己磁盘日志里有一个事务proposal，它恢复启动后，作为follow节点和新leader进行同步，发现这个事务proposal其实是不应该存在的，就直接丢弃掉就可以了

### 情况1中，为啥老leader挂了，要选zxid最大的节点做新leader？

举例:
假设zk集群是5个节点，1个leader + 4个follower

1个leader把proposal发送给4个follower，其中3个folower（过半）都收到了proposal发送ack给leader，第4个follower没收到proposal

此时leader执行commit之后挂了，commit没发送给其他的follower，剩余的4个follower，只要3个节点投票一个节点当leader，就是leader

假设那3个收到proposal的follower都投票第4个没收到proposal的follower当leader。那么这条数据一定永久性丢失了，因为新leader节点自身没有那个proposal，按照前述怎么会把proposal发送给其他所有follower？

所以只有选择一个拥有最大zxid的节点作为新leader，其他follower就会跟它进行同步，它给每个follower准备一个队列，然后把所有的proposal都发送给follower，只要过半follower都ack了，就会发送commit给那个follower

所谓的commit操作，就是把这条数据加入内存中的znode树形数据结构里去，然后对外就可以被看到了，也会去通知一些监听这个znode的客户端（还记得Watcher机制么？）

如果一个follower跟leader完全同步了，就会加入leader的同步follower列表中去，然后过半follower都同步完毕了，就可以对外继续提供服务了

### 情况2中，如何发现并丢弃多余的proposal的？

每一条事务的zxid是64位的，高32位是leader的epoch，可当做是leader的版本（其实不是）;低32位才是自增的zxid

假设老leader发送出去的proposal，高32位是1，低32位是11358

情况2中，新leader选举出来时，它的epoch会自增长一位。那么它的proposal，高32位是2，低32位是继续自增的zxid

然后老leader节点恢复连接了，到集群是follower了，此时发现自己比新leader多出来一条proposal，但是自己的epoch比新leader的epoch低，所以就会丢弃掉这条数据

## 高性能

2PC中的过半写机制，只要一半以上的follower节点ack，leader就发送commit给所有follower节点，不用等所有follower节点都准备好发ack，可见性能做了优化

而且commit操作，是把数据写入内存中的znode树形数据结构里去，纯内存的数据结构能保证性能比较高

## 高并发

前述节点的角色中，第3种角色 observer 节点是不参与leader选举的，也不参与ZAB协议同步时，过半follower去发送ack给leader的那个环节，它只是单纯的接收数据，同步数据，可能数据存在一定的不一致的问题，但是是只读的（zk集群中，只有leader节点可以写操作）

所以zk集群无论多少台机器，只能是一个leader进行写，单机写入最多每秒上万QPS，这是没法扩展的，所以zk适合写少的场景

但读呢？follower起码有2个或者4个，读起码可以有每秒几万QPS，如果读请求更多呢？此时就可以引入 observer 节点，她就只是同步数据，提供读服务的，所以可以无限的扩展 observer 节点

因此 observer 节点存在的意义就是线性扩展zk的读QPS

## 集群化部署

zk集群节点数一般是奇数，因为5个节点可以挂2个，6个节点也可以挂2个，不能让超过一半的节点挂掉，所以5和6效果一致，那奇数个节点可以减少机器开销，

zk只能是小集群部署，适合读多写少场景

### 为什么?

假设有1个leader + 20个follower，21台机器，20个follower，一个写请求出去，leader要起码等待10台以上的follower返回ack，才能发送commit，才能写请求成功，性能极差

所以zk的ZAB协议就决定了1个leader + 2个follower的小集群就够了，写请求是无法扩展的，读请求如果量大，可以加 observer 节点，最终就是适合读多写少的场景

# Zookeeper分布式锁

## 实现方案一

某客户端尝试创建临时 znode 节点，创建成功就获取这个锁；此时别的客户端来创建锁就会失败，只能注册个监听器监听这把锁。释放锁就是删除这个 znode 节点，一旦释放掉就会通知客户端，然后等待着的客户端就可再次重新获取锁。

``` java
public class ZooKeeperSession {
    private static CountDownLatch connectedSemaphore = new CountDownLatch(1);

    private ZooKeeper zookeeper;
    private CountDownLatch latch;

    public ZooKeeperSession() {
        try {
            this.zookeeper = new ZooKeeper("192.168.31.187:2181,192.168.31.19:2181,192.168.31.227:2181", 50000, new ZooKeeperWatcher());
            try {
                connectedSemaphore.await();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            System.out.println("ZooKeeper session established......");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 获取分布式锁
     * 
     * @param productId
     */
    public Boolean acquireDistributedLock(Long productId) {
        String path = "/product-lock-" + productId;

        try {
            zookeeper.create(path, "".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL);
            return true;
        } catch (Exception e) {
            while (true) {
                try {
                    // 相当于是给node注册一个监听器，去看看这个监听器是否存在
                    Stat stat = zk.exists(path, true);

                    if (stat != null) {
                        this.latch = new CountDownLatch(1);
                        this.latch.await(waitTime, TimeUnit.MILLISECONDS);
                        this.latch = null;
                    }
                    zookeeper.create(path, "".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL);
                    return true;
                } catch (Exception ee) {
                    continue;
                }
            }

        }
        return true;
    }

    /**
     * 释放掉一个分布式锁
     * 
     * @param productId
     */
    public void releaseDistributedLock(Long productId) {
        String path = "/product-lock-" + productId;
        try {
            zookeeper.delete(path, -1);
            System.out.println("release the lock for product[id=" + productId + "]......");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 建立zk session的watcher
     * 
     * @author bingo
     * @since 2018/11/29
     *
     */
    private class ZooKeeperWatcher implements Watcher {
        public void process(WatchedEvent event) {
            System.out.println("Receive watched event: " + event.getState());

            if (KeeperState.SyncConnected == event.getState()) {
                connectedSemaphore.countDown();
            }

            if (this.latch != null) {
                this.latch.countDown();
            }
        }
    }

    /**
     * 封装单例的静态内部类
     * 
     * @author bingo
     * @since 2018/11/29
     *
     */
    private static class Singleton {
        private static ZooKeeperSession instance;

        static {
            instance = new ZooKeeperSession();
        }

        public static ZooKeeperSession getInstance() {
            return instance;
        }
    }

    /**
     * 获取单例
     * 
     * @return
     */
    public static ZooKeeperSession getInstance() {
        return Singleton.getInstance();
    }

    /**
     * 初始化单例的便捷方法
     */
    public static void init() {
        getInstance();
    }
}
```

## 问题

假设如下执行序列：

1. 客户端1创建了znode节点/lock，获得了锁
2. 客户端1进入了长时间的GC pause
3. 客户端1连接到zk的session过期了。znode节点/lock被自动删除
4. 客户端2创建了znode节点/lock，从而获得了锁
5. 客户端1从GC pause中恢复过来，它仍然认为自己持有锁

最后，客户端1和客户端2都认为自己持有了锁，冲突~
所以使用下列方案二

## 实现方案二

创建临时顺序节点。如果有一把锁，被多个客户端竞争，此时多个客户端排队，第一个拿到锁的客户端执行，执行完释放锁；排在后面的每个客户端都会去监听排在自己前面的那个客户端创建的 node ，一旦某个客户端释放了锁，zookeeper 通知排在它后面的客户端，后面的客户端一旦被通知到，就去获取锁，执行操作

``` java
public class ZooKeeperDistributedLock implements Watcher {
    private ZooKeeper zk;
    private String locksRoot = "/locks";
    private String productId;
    private String waitNode;
    private String lockNode;
    private CountDownLatch latch;
    private CountDownLatch connectedLatch = new CountDownLatch(1);
    private int sessionTimeout = 30000;

    public ZooKeeperDistributedLock(String productId) {
        this.productId = productId;
        try {
            String address = "192.168.31.187:2181,192.168.31.19:2181,192.168.31.227:2181";
            zk = new ZooKeeper(address, sessionTimeout, this);
            connectedLatch.await();
        } catch (IOException e) {
            throw new LockException(e);
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
    }

    public void process(WatchedEvent event) {
        if (event.getState() == KeeperState.SyncConnected) {
            connectedLatch.countDown();
            return;
        }

        if (this.latch != null) {
            this.latch.countDown();
        }
    }

    public void acquireDistributedLock() {
        try {
            if (this.tryLock()) {
                return;
            } else {
                waitForLock(waitNode, sessionTimeout);
            }
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
    }

    public boolean tryLock() {
        try {
 		    // 传入进去的locksRoot + “/” + productId
		    // 假设productId代表了一个商品id，比如说1
		    // locksRoot = locks
		    // /locks/10000000000，/locks/10000000001，/locks/10000000002
            lockNode = zk.create(locksRoot + "/" + productId, new byte[0], ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL);
   
            // 看看刚创建的节点是不是最小的节点
	 	    // locks：10000000000，10000000001，10000000002
            List<String> locks = zk.getChildren(locksRoot, false);
            Collections.sort(locks);
	
            if(lockNode.equals(locksRoot+"/"+ locks.get(0))){
                //如果是最小的节点,则表示取得锁
                return true;
            }
	
            //如果不是最小的节点，找到比自己小1的节点
	  int previousLockIndex = -1;
            for(int i = 0; i < locks.size(); i++) {
		if(lockNode.equals(locksRoot + “/” + locks.get(i))) {
	         	    previousLockIndex = i - 1;
		    break;
		}
	   }
	   
	   this.waitNode = locks.get(previousLockIndex);
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
        return false;
    }

    private boolean waitForLock(String waitNode, long waitTime) throws InterruptedException, KeeperException {
        Stat stat = zk.exists(locksRoot + "/" + waitNode, true);
        if (stat != null) {
            this.latch = new CountDownLatch(1);
            this.latch.await(waitTime, TimeUnit.MILLISECONDS);
            this.latch = null;
        }
        return true;
    }

    public void unlock() {
        try {
            // 删除/locks/10000000000节点
            // 删除/locks/10000000001节点
            System.out.println("unlock " + lockNode);
            zk.delete(lockNode, -1);
            lockNode = null;
            zk.close();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (KeeperException e) {
            e.printStackTrace();
        }
    }

    public class LockException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public LockException(String e) {
            super(e);
        }

        public LockException(Exception e) {
            super(e);
        }
    }
}
```

## ZK的临时顺序节点为啥被称之为实现ZK分布式锁的天然之选？

### 每一个节点都是一个天然的顺序发号器

每一个节点下面创建临时顺序节点（EPHEMERAL_SEQUENTIAL），新的子节点后面会加上一个顺序编号。这个顺序编号是上一个生成的顺序编号加1。如，用一个发号的节点“/test/lock”为父亲节点，可以在这个父节点下面创建相同前缀的临时顺序子节点，假定相同的前缀为“/test/lock/seq-”。如果是第一个创建的子节点，那么生成的子节点为/test/lock/seq-0000000000，下一个节点则为/test/lock/seq-0000000001，依次类推

如下图

![节点图](img/zookeeper/74D199308F00ADAECBA8DE8680E3C0EE.jpg)

### 节点的递增有序性可以确保锁的公平

zk 分布式锁，首先需要创建一个父节点，尽量是持久化节点，然后每个要获得锁的线程都在这个节点下创建一个临时顺序节点。由于zk节点是按照创建的顺序依次递增的，为了确保公平，可以简单地规定，编号最小的那个节点先获得锁。因此，每个线程在尝试占用锁之前，首先判断自己的编号是不是当前最小的，如果是，则获取到锁

### 节点监听机制可以保障占有锁的传递有序而且高效

每个线程抢占锁之前，先抢号创建自己的ZNode。同样，释放锁的时候，就需要删除抢号的ZNode。在抢号成功之后，如果不是排号最小的节点，就处于等待通知的状态。等谁的通知？等前一个ZNode的通知！当前一个ZNode被删除时，就轮到了自己占有锁的时候。第一个通知第二个、第二个通知第三个，击鼓传花似的依次向后传递。

zk的节点监听机制能非常完美地实现这种击鼓传花似的信息传递。具体的方法是，每一个等通知的ZNode节点，只需监听或者监视编号在自己前面那个且紧挨在自己前面的那个节点。只要上一个节点被删除了，就再进行一次判断，看看自己是不是序号最小的那个节点，如果是，则获得锁。

这种优越的机制，能保证由于网络异常或者其他原因造成集群中占用锁的客户端失联时，锁能够被有效释放。一旦占用锁的客户端与zk集群服务器失去联系，这个临时ZNode也将被自动删除。排在它后面的那个节点也能收到删除事件，从而获得锁。所以，在创建节点时，尽量创建临时顺序节点

### 节点监听机制能避免羊群效应

何为**羊群效应**？
一个节点挂掉了，所有节点都去监听，然后作出反应，这样会给服务器带来巨大压力

首尾相接，后面监听前面的方式，可以避免羊群效应。有了临时顺序节点，当一个节点挂掉，只有它后面的那一个节点才能作出反应

## 和Redis分布式锁对比

Redis分布式锁实现见Redis篇，这里只是比较一下各自优劣

* redis 分布式锁，需要客户端不断去尝试获取锁，比较消耗性能
  zk 分布式锁，获取不到锁，注册个监听器即可，不需要不断主动尝试获取锁，性能开销较小

* redis 获取锁的那个客户端要是挂了，那只能等待超时时间到了之后才能释放锁
  zk 因为创建的是临时 znode 节点，只要客户端挂了，znode 就没了，此时就会自动释放锁

* zk 分布式锁性能不高。原因是每次在创建锁和释放锁的过程中，都要动态创建、销毁临时节点来实现锁功能。zk中创建和删除节点只能通过leader节点来执行，然后leader节点还需要将数据同步到所有的follower节点上，这样频繁的网络通信，性能的短板就非常突出

### 对比总结

redis 分布式锁适用于并发量很大、性能要求很高而可靠性问题可通过其他方案弥补的场景。
zk 分布式锁适用于高可用，而并发量不是太高的场景
所以，没有谁好谁坏的问题，而是谁更合适的问题~

### 参考资料

1. [中华石杉--互联网Java进阶面试训练营](https://gitee.com/shishan100/Java-Interview-Advanced)
2. [基于Redis的分布式锁到底安全吗?(下)](https://mp.weixin.qq.com/s/4CUe7OpM6y1kQRK8TOC_qQ)

# [推荐书单](/Zookeeper)
