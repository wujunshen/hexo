---
title: ConcurrentHashMap
excerpt: 数据结构-Map-ConcurrentHashMap
categories:
- 算法
tags:
- 算法
- 数据结构
- Map
- ConcurrentHashMap
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-youtrack2022_1.png
abbrlink: 3455415529
date: 2022-05-27 21:39:13
---

# 概念

java5开始才有的并发类，可以高效地支持并发操作。基本上就是个线程安全版的HashMap。但是key和value都不能为null，这点和HashMap不同

# 基本结构

## java8之前

Segment数组+HashEntry数组+链表结构

它由一个个Segment组成，Segment就是我们说的分段锁，一个HashEntry数组对应一个分段锁

简单说，ConcurrentHashMap就是一个Segment数组，Segment通过继承ReentrantLock来加锁，每次需要加锁的操作，锁住的是一个Segment，这样只要保证每个Segment线程都安全，也就保证了全局是线程安全的

如下图
![保证每个Segment线程安全](img/ConcurrentHashMap/D3A76B10-9779-41EE-8885-F67562F9BA78.png)

>初始化后Segment数组是无法扩容的，能扩容的只有HashEntry数组。如果初始化时候，没有指定segment数组长度，默认为16。如果指定长度，则使用指定长度

基本属性源码

``` java
/**
 * 段掩码，用于定位段，默认值15，不可变
 */
final int segmentMask;

/**
 * 段偏移量，用于定位段，默认值28，不可变
 */
final int segmentShift;

/**
 * 段数组
 */
final Segment<K,V>[] segments;

static final class Segment<K,V> extends ReentrantLock implements Serializable {
    /**
     * 真正存储数据的数组
     */
    transient volatile HashEntry<K,V>[] table;

    /**
     * 用于统计当前Segement大小，即HashEntry数组长度
     */
    transient int count;

    /**
     * 记录结构性修改次数，用于快速失败
     */
    transient int modCount;

    /**
     * 阈值
     */
    transient int threshold;

    /**
     * 负载因子，默认 0.75
     */
    final float loadFactor;
}

static final class HashEntry<K,V> {
    //节点hash值
    final int hash;
    //节点key值
    final K key;
    //节点value值
    volatile V value;
    //下个节点引用
    volatile HashEntry<K,V> next;
}
```

从以上代码可知，一个`Segment`就是一个`HashMap`，多个`HashMap`组成一个`ConcurrentHashMap`。`segmentMask`和`segmentShift`组合起来用于定位Segment数组的下标位置

由于目前java已发展到14版本，因此对于`java8`之前的版本，`ConcurrentHashMap`操作只做文字说明，有兴趣的可自行查看java7等8之前的版本源码

### put操作

1. 计算待put数据key的hash值
2. 根据hash值、segmentShift和segmentMask通过无符号右移运算和位运算定位到哪个Segment，一个 Segment对应一个HashEntry数组
3. 尝试获取锁，如果获取失败则自旋获取锁
4. 根据hash值通过位运算得到HashEntry数组的下标，即得到链表的头节点，然后遍历链表
5. 如果链表不为空，判断传入的key和hash值与当前遍历的key和hash值是否相等，相等则覆盖旧的value
6. 如果链表为空（即表头为空），则根据待put数据的key和value创建结点，即初始化链表
7. 判断元素个数是否超过阈值，数组长度大于阈值threshold且小于最大容量，则进行rehash扩容
8. 如果不需扩容，则把新节点放到HashEntry数组中对应的位置（即把新的节点设置成原链表的表头，头插法）
9. 最后释放锁

### get操作

1. 计算get数据key的hash值
2. 根据hash值、segmentShift和segmentMask通过无符号右移运算和位运算定位到哪个Segment，一个 Segment对应一个HashEntry数组
3. 根据hash值通过位运算得到HashEntry数组下标，即得到链表的头节点，然后遍历链表
4. 判断传入的key和hash值与当前遍历的key和hash值是否相等，相等则返回对应value，否则返回null

### 扩容操作

1. 创建新HashEntry数组，数组长度是原来的2倍，重新计算新的阈值
2. 遍历旧数组，把每个元素（即HashEntry链表）迁移到新数组里面，步骤如下
3. 如果旧数组只有一个结点，则直接放入新数组中
4. 如果链表有多个结点，遍历旧链表，计算存放在新数组中的位置，使用头插法插入到新数组，即旧链表的表头结点做为新链表的尾结点
5. 迁移完成之后将待新增数据插入链表的头部（头插法），最后将新数组的引用替换旧的

## 从java8开始及之后版本

几个变化

1. 使用Node数组作为数据的基本存储。但锁粒度被缩小到数组中的每个下标位置上，数据读取的可见性依靠volatile来保证。尝试写入时，会将对应的下标位置上的元素作为加锁对象，使用synchronized进行加锁，来保证并发写入的安全性
2. 如果多个Key的hashcode在取模后落在了相同的下标位置上，且在一定数量内（默认是8），采用链表方式连接节点；超过之后，为提高查询效率，会转为红黑树结构进行存储（和HashMap一样树化成红黑树）
3. 当进行扩容时，除了扩容线程本身，如果其他线程识别到扩容正在进行中，则会尝试协助扩容

### 和java8之后的HashMap相同点

* 底层数据结构一致（数组+链表+红黑树）
* 数组初始化都是在第一次put元素时进行，而不是new对象时候
* 数组长度都总是为2的幂
* 默认树化的阈值为8，而退化为链表的阈值为6
* hash算法也很类似，ConcurrentHashMap也是key的hashCode值右移16位和原值取异或。但多了一步，和HASH_BITS取与，这是是为了消除最高位上的负符号，hash的负值在ConcurrentHashMap中有特殊意义表示在扩容或者是树节点(下文都会提及)

下面从源码角度说明几个操作(java11版本)

### put操作

``` java
    static final int TREEIFY_THRESHOLD = 8;
    
    public V put(K key, V value) {
        return putVal(key, value, false);
    }

    /** Implementation for put and putIfAbsent */
    final V putVal(K key, V value, boolean onlyIfAbsent) {
        if (key == null || value == null) throw new NullPointerException();
        //1.使用spread方法得到key的hash
        int hash = spread(key.hashCode());
        int binCount = 0;
        for (Node<K,V>[] tab = table;;) {
            Node<K,V> f; int n, i, fh; K fk; V fv;
            //2.第一次调用put时才调用initTable方法来初始化Node数组
            if (tab == null || (n = tab.length) == 0)
                tab = initTable();
            //3.如果相应位置的Node节点还未初始化，则通过CAS插入相应的数据
            else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
                if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value)))
                    break; // no lock when adding to empty bin
            }
            //4.如果对应Node不为空，且其hash标识为特定负数，也就是标识容器正在扩容的负数，此时需协助扩容
            else if ((fh = f.hash) == MOVED)
                tab = helpTransfer(tab, f);
            else if (onlyIfAbsent // check first node without acquiring lock
                     && fh == hash
                     && ((fk = f.key) == key || (fk != null && key.equals(fk)))
                     && (fv = f.val) != null)
                return fv;
            else {
                V oldVal = null;
                //5.执行元素添加
                synchronized (f) {
                    if (tabAt(tab, i) == f) {
                        //5.1该节点的hash不小于0，则遍历链表更新节点或插入新节点
                        if (fh >= 0) {
                            binCount = 1;
                            for (Node<K,V> e = f;; ++binCount) {
                                K ek;
                                if (e.hash == hash &&
                                    ((ek = e.key) == key ||
                                     (ek != null && key.equals(ek)))) {
                                    oldVal = e.val;
                                    if (!onlyIfAbsent)
                                        e.val = value;
                                    break;
                                }
                                Node<K,V> pred = e;
                                if ((e = e.next) == null) {
                                    pred.next = new Node<K,V>(hash, key, value);
                                    break;
                                }
                            }
                        }
                        //5.2如果是TreeBin类型节点，说明是红黑树，则通过putTreeVal方法往红黑树中插入节点
                        else if (f instanceof TreeBin) {
                            Node<K,V> p;
                            binCount = 2;
                            if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key,
                                                           value)) != null) {
                                oldVal = p.val;
                                if (!onlyIfAbsent)
                                    p.val = value;
                            }
                        }
                        else if (f instanceof ReservationNode)
                            throw new IllegalStateException("Recursive update");
                    }
                }
                //6.采用链表存储节点，且链表长度超过阀值，则将链表转化为红黑树(树化)
                if (binCount != 0) {
                    if (binCount >= TREEIFY_THRESHOLD)
                        treeifyBin(tab, i);
                    if (oldVal != null)
                        return oldVal;
                    break;
                }
            }
        }
        //7.容器内元素总数+1，并在需要时执行扩容
        addCount(1L, binCount);
        return null;
    }
```

1. 使用spread方法得到key的hash
源码
``` java
    static final int HASH_BITS = 0x7fffffff; // usable bits of normal node hash
    
    static final int spread(int h) {
        return (h ^ (h >>> 16)) & HASH_BITS;
    }
```
HASH_BITS值0x7FFFFFFF是一个用16进制表示的整型,是整型里面的最大值
转换成二进制0111 1111 1111 1111 1111 1111 1111 1111（前31个1代表数值，最高位（32位）是符号位 0代表正数，1代表负数），hashcode值与其按位与会得到一个正数
2. 尝试添加元素时发现tab为null，则Node数组尚未初始化，此时执行初始化方法initTable
源码
``` java
     private transient volatile int sizeCtl;

     private final Node<K,V>[] initTable() {
        Node<K,V>[] tab; int sc;
        while ((tab = table) == null || tab.length == 0) {
            if ((sc = sizeCtl) < 0)
                Thread.yield(); // lost initialization race; just spin
            else if (U.compareAndSetInt(this, SIZECTL, sc, -1)) {
                try {
                    if ((tab = table) == null || tab.length == 0) {
                        int n = (sc > 0) ? sc : DEFAULT_CAPACITY;
                        @SuppressWarnings("unchecked")
                        Node<K,V>[] nt = (Node<K,V>[])new Node<?,?>[n];
                        table = tab = nt;
                        sc = n - (n >>> 2);
                    }
                } finally {
                    sizeCtl = sc;
                }
                break;
            }
        }
        return tab;
    }
```
通过CAS争夺sizeCtl属性控制权，成功将该值设置为-1的线程可执行初始化，其他线程通过Thread.yield()
进行等待，直到确认容器初始化完毕，也就是tab数组有了值。初始化完毕时，sizeCtl被设置为下一次扩容的容量阀值，该值为当前容量的0.75（见源码，n为当前容量值。当变量n右移2位，2的-2次方变为0.25n，然后n减去0.25n为0.75n）
3. 虽然已经初始化了Node数组，但是Key的hash对应的下标位置的节点元素为空，则新建一个Node节点放入该下标位置数组中
源码
``` java
   static final <K,V> Node<K,V> tabAt(Node<K,V>[] tab, int i) {
        return (Node<K,V>)U.getObjectAcquire(tab, ((long)i << ASHIFT) + ABASE);
   }
    
   static final <K,V> boolean casTabAt(Node<K,V>[] tab, int i,
                                        Node<K,V> c, Node<K,V> v) {
        return U.compareAndSetObject(tab, ((long)i << ASHIFT) + ABASE, c, v);
   }
```
tabAt方法通过计算对应下标位置在数组中的偏移量值，即((long)i << ASHIFT) +
ABASE，基础偏移量+元素间隔偏移量。且读取时使用的是getObjectVolatile方法，该方法的读取和对属性使用volatile是一样效果，保证读取到最新值
casTabAt方法在下标位置的节点元素为空时，写入采用了compareAndSetObject方法，目的也是为了保证并发安全性。若CAS成功，则元素添加完毕，可以直接退出循环。若失败，则意味着有其他线程已经对相同的下标位置操作成功，此时就要重新循环，确认最新情况，就是步骤4
4. 对应Node不为空，且其hash标识为特定负数，也就是标识容器正在扩容的负数MOVED，此时需要协助进行容器扩容
由于key的hash会经过方法spread处理，因此必然为正数。而负数的hash有三个特殊的含义(源码中有定义，见下)
``` java
    static final int MOVED     = -1; // hash for forwarding nodes
    static final int TREEBIN   = -2; // hash for roots of trees
    static final int RESERVED  = -3; // hash for transient reservations
```
* -1: 代表容器正在扩容，且当前节点数据已前移到扩容后的数组中
* -2: 代表当前下标位置上的Node节点采用红黑树结构存储
* -3: 代表该Node节点正在进行函数式运算，值还未最终确定
关于扩容和协助扩容，下文会详细记述，这里只需记住协助扩容的触发条件是hash标识为MOVED即可
5. 这里是真正开始执行元素添加的操作，分为两步来说
   * 节点的hash值不小于0，则遍历链表更新节点或插入新节点。类似HashMap章节所述，判断节点中的key和value是否和要添加的键值对相同，如果不同就添加到链表尾部（尾插法）。重复，则依据方法入参onlyIfAbsent的值判断是否要进行覆盖
   * 如果是TreeBin类型节点，说明是红黑树，则通过putTreeVal方法往红黑树中插入节点（红黑树会在之后章节具体说明，这里只需要明白是插入树型节点即可）
6. 采用链表存储节点，且链表长度超过阀值8，则将链表转化为红黑树(树化)。见源码注释6，binCount不为0，说明put操作对数据产生影响，在当前链表个数大于等于阈值8时，通过treeifyBin方法转化为红黑树。接着判断oldVal是否不为空，不为空说明是更新操作，不会让元素个数产生变化，则直接返回旧的value
7. 容器内元素总数+1，并在需要时执行扩容。调用addCount方法尝试更新元素个数baseCount

### 扩容和协助扩容操作

扩容和协助扩容操作其实就在前述注释7这个addCount方法里，但是这个方法看名字其实是对Node数组的元素个数进行更新操作。所以我先把整个addCount方法源码分析一下

``` java
     private final void addCount(long x, int check) {
        CounterCell[] cs; long b, s;
        //1. 元素个数更新
        if ((cs = counterCells) != null ||
            !U.compareAndSetLong(this, BASECOUNT, b = baseCount, s = b + x)) {
            CounterCell c; long v; int m;
            boolean uncontended = true;
            if (cs == null || (m = cs.length - 1) < 0 ||
                (c = cs[ThreadLocalRandom.getProbe() & m]) == null ||
                !(uncontended =
                  U.compareAndSetLong(c, CELLVALUE, v = c.value, v + x))) {
                fullAddCount(x, uncontended);
                return;
            }
            if (check <= 1)
                return;
            s = sumCount();
        }
        //2. 扩容判断，true就开始真正的扩容
        if (check >= 0) {
            Node<K,V>[] tab, nt; int n, sc;
            while (s >= (long)(sc = sizeCtl) && (tab = table) != null &&
                   (n = tab.length) < MAXIMUM_CAPACITY) {
                int rs = resizeStamp(n);// 2.1 计算盖戳标记值
                if (sc < 0) {//2.2 协助扩容
                    if ((sc >>> RESIZE_STAMP_SHIFT) != rs || sc == rs + 1 ||
                        sc == rs + MAX_RESIZERS || (nt = nextTable) == null ||
                        transferIndex <= 0)
                        break;
                    if (U.compareAndSetInt(this, SIZECTL, sc, sc + 1))
                        transfer(tab, nt);
                }
                // 2.3 扩容
                else if (U.compareAndSetInt(this, SIZECTL, sc,
                                             (rs << RESIZE_STAMP_SHIFT) + 2))
                    transfer(tab, null);
                s = sumCount();
            }
        }
    }
```

如上源码可知这个addCount方法分为两大部分

1. 整体更新思路实际上和java8新增的一个统计类完全一致的，即`java.util.concurrent.atomic.
   LongAdder`。这个类用于在更高的并发竞争下，降低或维持数字计算的延迟。其性能比传统的AtomicLong更好。介绍一下核心思路

* 整个统计的数据结构包含一个基本的长整形变量baseCount和一个统计单元CounterCell构成的数组，数组长度为2的幂，初始长度为2，最大长度超过CPU内核数时停止扩容
* 当统计数字需要变化时，优先在baseCount上执行CAS操作。如果成功，意味着更新完成。如果失败，说明此时有多线程竞争，放弃在baseCount上的争夺
* 当放弃在baseCount上的争夺时，通过线程上的随机数h在CounterCell数组上找到下标位置，在此位置上的CounterCell内部的整型变量上循环执行CAS更新，直到成功
* 如果需要初始化CounterCell数组或者添加元素到具体下标位置，或者扩容，那就只能一个线程进行，该线程需要对cellBusy这个属性进行CAS争夺并成功
核心思路就是避免多线程在一个变量上循环CAS直到成功。因为当多线程竞争较为激烈时，大量的线程会在不断的
CAS失败中浪费很多CPU时间。通过线程变量的方法，将多线程分散到不同的CounterCell元素中，降低竞争激烈程度和颗粒度，从而提高并发效率。
由于统计数据被分散在baseCount和CounterCell数组中，执行总数计算时也需要遍历这里面所有的值相加才能得到最终值。接着就是扩容判断环节
2. 扩容依据是sizeCtl，当容器元素总数超过sizeCtl时，执行扩容流程(见源码中while循环判断条件)
   2.1 对当前数组长度计算盖戳标记值，也就是resizeStamp方法，其具体代码如下
``` java
    static final int resizeStamp(int n) {
        return Integer.numberOfLeadingZeros(n) | (1 << (RESIZE_STAMP_BITS - 1));
    }
```
注释1中说数组长度n是2的幂，`Integer.numberOfLeadingZeros(n)`获得32位整型数字中，在第一个1之前有多少个0的结果，因此这个值实际上是数字n的一种换算关系
`RESIZE_STAMP_BITS`则意味着该结果能够占据的比特位数。由于`Integer.numberOfLeadingZeros(n)`最大值为27（n的最小值为16），因此`RESIZE_STAMP_BITS`最小也必须为6。
这个方法计算出来的结果，实际上可看成是数组长度的固定换算值。这个值可在扩容过程用于判断是否扩容完毕
开始判断是执行扩容还是协助扩容操作。如果sizeCtl当前值为负数，就协助扩容也就是注释2.2；如果为正数，就扩容，也就是注释2.3
这里要说明一下sizeCtl
* 0: 初始值，意味着此时数组尚未初始化
* -1: 控制值，意味着有线程取得了数组的初始化权利，并且正在执行初始化中
* 正数: 要扩容的阀值，一旦元素总数到达该值，则应该进行扩容。除非数组长度到达上限
* 非-1的负数: 意味着当前数组正在扩容，该值左边RESIZE_STAMP_BITS个数的比特位用于存储数组长度n的盖戳标记，右边32-RESIZE_STAMP_BITS位用于存储当前参与扩容的线程数
   2.2 先看源码中第一个if判断 `(sc >>> RESIZE_STAMP_SHIFT) != rs`意味着数组长度已经发生变化，扩容可能已结束，不需要协助。`transferIndex <= 0`
意味着原始数组已无可分配的扩容区域，不需要协助。
`sc == rs + 1 || sc == rs + MAX_RESIZERS`
这个条件永远不会达成，属于bug。具体可看 [JDK-8214427: probable bug in logic of ConcurrentHashMap.addCount()](https://bugs.java.com/bugdatabase/view_bug.do?bug_id=8214427) (java12版本已修复)
如果确认需要协助，就到第二个if。`if (U.compareAndSetInt(this, SIZECTL, sc, sc + 1))`通过 CAS增加了一个协助线程数量，然后执行transfer迁移方法
   2.3 通过CAS对sizeCtl值进行置换。扩容时需要置换的值含义上面也说过（正数），左边是盖戳标记，右边是参与扩容的线程数

老实说put和扩容以及协助扩容操作代码比较深奥，个人以为面试不会考的这么细致，但是最好记住步骤和这样执行的目的，特别是何时CAS，何时Synchronize以及sizeCtl和计算得出的hash的正负数含义是什么这些

### get操作

先看一下get操作源码

``` java
    public V get(Object key) {
        Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
        //1.使用spread方法得到key的hash
        int h = spread(key.hashCode());
        //2. 判断数组是否为空，不为空根据hash值确定Node节点位置  
        if ((tab = table) != null && (n = tab.length) > 0 &&
            (e = tabAt(tab, (n - 1) & h)) != null) {
            //3. 如果搜索到的Node节点key与传入的key相同且不为null,直接返回节点的value
            if ((eh = e.hash) == h) {
                if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                    return e.val;
            }
            //4. 如果eh<0，说明Node节点在红黑树上，直接查询  
            else if (eh < 0)
                return (p = e.find(h, key)) != null ? p.val : null;
            //5. 否则遍历链表，找到对应的值并返回  
            while ((e = e.next) != null) {
                if (e.hash == h &&
                    ((ek = e.key) == key || (ek != null && key.equals(ek))))
                    return e.val;
            }
        }
        return null;
    }
```

1. 和put操作第一步相同，不再记述
2. 先判断tab数组是否为空，不为空再用tabAt方法，根据hash值确定Node节点位置
3. 判断找到的Node节点的hash值是否和key的hash值相同，再判断key相同且不为null，返回该节点的value
4. eh小于0，则说明节点在红黑树上，去那边查询(红黑树搜索，添加会另外记述，这里不作更多说明)
5. 否则遍历链表，找到对应的Node节点的value

# 追命三问

## `ConcurrentHashMap`为啥比`Collections.synchronizedMap()`读写性能更加好？

网上有人做了测试，发现同样进行put，get操作，`ConcurrentHashMap`性能都比`Collections.synchronizedMap()`好，那么为啥呢？

* put操作
  `Collections.synchronizedMap()`的put封装了`HashMap`的put方法，并加上互斥锁保证安全性。java8之后的`ConcurrentHashMap`取消了segments分段锁，采用`transient volatile Node<K,V>[] table;`保存数据。这样对每个Node数组元素加锁，见put操作源码中`synchronized(f)`,可减少并发冲突概率，提高并发性能。所以`ConcurrentHashMap`的put并发性更好

* get操作
  `Collections.synchronizedMap()`同样封装了HashMap的get方法并加了同步锁。从前述`ConcurrentHashMap`的get操作源码可知。get操作全程并没有加锁，所以性能上优于`Collections.synchronizedMap()`的get方法

那么问题来了

## `ConcurrentHashMap`的get操作为啥不需要加锁？

原因是Node的元素val和指针next是用volatile修饰的，在多线程环境下线程A修改Node结点的val或新增节点时是对线程B可见（见[volatile](4266433718.html)章节）

Node源码中修饰val和next内容如下图红框所示（Node类在`ConcurrentHashMap`类源码中）

![Node源码中修饰val和next内容](img/ConcurrentHashMap/03A3CB77-402C-4536-8886-BFC2E72A2059.png)

另外有人说还和Node数组被修饰为volatile关键字有关，见下图`ConcurrentHashMap`类源码中，Node数组定义代码

![volatile关键字修饰](img/ConcurrentHashMap/1DFD2EBF-F76F-4901-AC2C-7DECDE4DF463.png)

但其实这是错误的说法，volatile的确可以修饰数组，但修饰的是数组地址。

比如，`volatile int myArray[100]`是指myArray地址是volatile的而不是数组元素值是volatile

那么问题又来了

## ConcurrentHashMap中的Node数组被修饰为volatile的目的是啥？

答案: **为了扩容！！！**

当Node数组扩容时，可以对其他线程具有可见性，所以加了volatile

## 三问答案简易版

1. java8中的`ConcurrentHashMap`，它的get操作，全程不需要加锁，这也是比`hashtable`、用`Collections.synchronizedMap()`封装的hashmap这些集合类读写性能好的原因之一
2. get操作全程不需要加锁是因为Node的成员val和指针next是用volatile修饰的。和用volatile修饰的Node数组没关系
3. 数组用volatile修饰主要是为了能在数组扩容时,保证可见性

# 总结

## 版本区别

JAVA8之前主要采用锁机制，对某个Segment进行操作时，锁定该Segment，不允许对其进行非查询操作，而JAVA8之后是对每个Node数组中的元素，即Node节点采用CAS无锁算法操作，这种操作在完成前进行判断，如果符合预期结果才给予执行，对并发操作提供了良好的优化

### 为啥java8开始放弃Segment？

根本原因在于java7中的Segment继承ReentrantLock，使用了显示锁，在其实例方法中，每个更新操作内部又使用Unsafe来处理更新。这显然是一种浪费。显示锁、Unsafe这二者都可保证对对象的原子操作。使用一个就行了。但是java8中，Segment还是予以了保留，仅用来处理对象流的读写

## 和其它类型的区别

见表格

| 类名 | key | value | 父类 | 是否线程安全 |
| :--- | :--- | :--- | :--- | :--- |
| ConcurrentHashMap | 不允许为null | 不允许为null | AbstractMap | 安全 |
| HashMap | 允许为null | 允许为null | AbstractMap | 不安全 |
| TreeMap | 不允许为null | 允许为null | AbstractMap | 不安全 |
| Hashtable | 不允许为null | 不允许为null | Dictionary | 安全 |

### 和Hashtable在实现线程安全上的区别

* ConcurrentHashMap
  java8之前，ConcurrentHashMap对整个数组进行了分段(Segment)，每一把锁只锁其中一部分数据，多线程访问不同数据段的数据，不会存在锁竞争，提高并发访问率。（默认分配16个Segment，比Hashtable效率提高16倍。）
  java8之后，放弃了Segment，直接用Node数组+链表+红黑树来实现，使用synchronized和CAS来并发控制操作。所以看起来就像是优化过且线程安全的HashMap（这也是为啥一开始就说它是线程安全版的HashMap），虽然在java8中还有Segment数据结构，但已简化了属性，只是为了兼容旧版本
  见ConcurrentHashMap中的Segment源码及其注释
  ![Segment源码及其注释](img/ConcurrentHashMap/FDC20221-F22C-4BD3-A57D-B9328E9C7291.png)

* Hashtable
  使用synchronized来保证线程安全，效率非常低下。当多个线程访问同步方法时，可能会进入阻塞或轮询状态，若使用put添加元素，另一个线程则不能使用put添加元素，也不能使用get，竞争越激烈效率越低

# 参考资料

1. [JDK-8214427: probable bug in logic of ConcurrentHashMap.addCount()](https://bugs.java.com/bugdatabase/view_bug.do?bug_id=8214427)
