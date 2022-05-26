---
title: HashMap
excerpt: 数据结构-Map-HashMap
categories:
  - 算法
tags:
  - 算法
  - 数据结构
  - Map
  - HashMap
comments: true
layout: post
index_img: /img/jetbrain/1920x1080-webstorm2022_1.png
abbrlink: 1029785637
date: 2022-05-26 09:21:48
---

# 概念

HashMap是采用key->value形式，key可以为null，但不能重复。value可以重复，也可以为null

默认容量是16，扩充因子是0.75，也就是说put元素个数超过16* 0.75=12后，会自动扩充一倍，容量到32

# 基本结构

## java8之前

数组+链表结构

把key的hashcode值通过散列函数，获取到hash值，然后通过（n-1）&hash判断当前元素存放位置（n是数组的长度，初始时候是16），如果当前位置已存在元素，就判断已有元素和要存入元素的hash值，key值是否相同，相同就覆盖，不同就放在链表里（也称之为拉链法）

使用散列函数原因是为了减少hash碰撞，尽量均匀放入数组。否则通过拉链法放入链表，链表可以很长，这样搜索时，本来的时间复杂度O(1)就会退化为O(n)，因为数组元素存放地址是连续的，链表元素是不连续的，因此搜索链表元素只能从第一个元素开始依次一个个查询下去，所以复杂度是O（n）

简而言之，拉链法就是数组和链表相结合，创建一个链表数组，数组中每个元素就是一个链表，遇到hash碰撞，就将冲突的值放到链表里，如下图

![数组+链表结构](img/hashmap/F26FE55F-0B2E-4B2B-A18B-33A5EB7CBD01.png)

但是在多线程并发扩容情况下，HashMap的链表元素会形成循环引用的问题，具体可见[疫苗：Java HashMap的死循环](https://coolshell.cn/articles/9606.html)

形成原因归根结底是put元素时，java8之前使用的是头插法

### 头插法

* 概念
  java8之前，往HashMap里put元素时，新增在链表上的元素位置在链表头部，故名头插法

* 源码实现
  看一下java7版本中头插法的源码实现
``` java
        void addEntry(int hash, K key, V value, int bucketIndex) {
            if ((size >= threshold) && (null != table[bucketIndex])) {
                resize(2 * table.length);
                hash = (null != key) ? hash(key) : 0;
                bucketIndex = indexFor(hash, table.length);
            }
    
            createEntry(hash, key, value, bucketIndex);
        }
        void createEntry(int hash, K key, V value, int bucketIndex) {
           Entry<K,V> e = table[bucketIndex];
           table[bucketIndex] = new Entry<>(hash, key, value, e);
           size++;
        }

```
主要实现方法在这个`createEntry(hash, key, value, bucketIndex)`
参数bucketIndex是之前用key的hashcode值做过散列函数得到的下标。key-value这个键值对元素在被put进去时，会放到数组的这个下标位置或者此位置链表中`Entry<K,V> e = table[bucketIndex]`这一句取到数组这个下标元素，然后作为`new Entry<>(hash, key, value, e)`的参数e传入Entry构造方法
``` java
    Entry(int h, K k, V v, Entry<K,V> n) {
        value = v;
        next = n;
        key = k;
        hash = h;
    }
```
next属性指向`table[bucketIndex]`，然后在上一层createEntry方法中又复制给了`table[bucketIndex]`，实际效果就等同于把该下标的链表整体往后移了一步，再把新构造的entry放在链表头（同时也是数组上该下标的位置）。这就是java7版本hashmap元素在put时，所用的头插法

* 采用原因
  据说是想到最近插入的元素有极大可能在最近会被用到。所以为了缩短链表查找元素时间，每次都会将新插入的元素放到表头

## 从java8开始及之后版本

hash碰撞解决方法有改变，链表长度大于阈值(默认为8)**且数组长度大于64时**，链表转为红黑树，搜索时间复杂度从O(n)变为O(logn)（后文会解释为啥阈值默认值为8以及为啥数组长度大于64才转红黑树）

![转红黑树](img/hashmap/E4EF5259-2FF8-4D5B-AD71-0C2A780FD0BB.png)

java8开始解决了多线程并发扩容情况下，链表元素循环引用的问题（不使用头插法，开始使用尾插法，下文源码分析时详细说明），但是并发情况，推荐使用ConcurrentHashMap，因为无论哪个java版本都存在线程不安全情况，下面详细说明put元素时产生的问题

### 两个线程执行put元素时，可能导致数据覆盖

java8开始及之后版本往HashMap里put元素时，如果没有hash碰撞则会直接插入元素（具体代码逻辑见下文put方法源码分析注释2）。假设线程A和线程B同时put，刚好两个value不同的元素的hashcode值一样，通过散列函数得到的下标位置相同，且数组下标位置数据还为null，当线程A通过散列函数得到数组下标位置，但还没往数组下标位置插入元素时就挂起，而线程B正常执行，正常插入元素，然后线程A获取了CPU时间片，此时线程A已获知数组下标位置，它就直接把元素插入数组下标位置。此时问题出现: 线程A把线程B插入的元素key->value键值对给覆盖掉了，这就发生了线程不安全。

不光put时候，删除、修改元素时同样会有数据覆盖问题。所以为了线程安全，推荐使用ConcurrentHashMap

另外Java8开始及之后版本有两点优化
1. 将key的hashcode值变成二进制，右移16位取异或值
源码如下
``` java
    static final int hash(Object key) {
        int h;
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }
```
目的是为了减少哈希碰撞概率，即使有两个hashcode值的低16位相同或相似，高16位大相径庭（低位不变高位变），取异或也能让低16位有高16位特征，也能做区分，不会在计算下标位置后进入同一个数组元素位置，从而使用拉链法放入同一链表，引发哈希碰撞

2. hash值对数组长度取模等同于hash值和数组长度－1的取与操作
``` java
hash%n=(n-1)&hash
```
目的是hash值的高16位都是和0取与，不需做计算，直接得出0，比起取模操作，更减少运算时间，更加高效
但是这个公式成立的前提是n也就是**数组长度必须是2的幂**，否则等式不成立的。因此初始化HashMap时，若指定容量初始值不是2的幂，它会用附录中tableSizeFor方法将容量初始值变为2的幂。若没有指定容量初始值，HashMap默认容量是16也是2的幂，所以这也是HashMap的长度不管如何都是2的幂的原因
数组长度必须是2的幂的另外一个原因是如果n不是2的幂，比如15，则n-1为14，对应的二进制为1110，取与操作时最后一位都为0，则 0001（同0000取与为0），0011（同0010取与为1），0101（同0100取与为4），1001（同1000取与为8），1011（同1010取与为10），0111（同0110取与为6），1101（同1100取与为12）这几个位置永远都不存放元素（本来应该放在这些位置的元素都放在前述括号里那些位置），空间浪费大，而且数组可用位置比数组长度小了很多，意味着增加了哈希碰撞概率，查询效率降低

# 源码分析

主要是put和get方法分析，java11版本

## put方法

源码
``` java
    static final int TREEIFY_THRESHOLD = 8;
    
    public V put(K key, V value) {
        return putVal(hash(key), key, value, false, true);
    }
    
    static final int hash(Object key) {
        int h;
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }

    final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
                   boolean evict) {
        Node<K,V>[] tab; Node<K,V> p; int n, i;
        // 1. tab为空则创建
        if ((tab = table) == null || (n = tab.length) == 0)
            n = (tab = resize()).length;
        // 2. 计算index，并对null做处理    
        if ((p = tab[i = (n - 1) & hash]) == null)
            tab[i] = newNode(hash, key, value, null);
        else {
            Node<K,V> e; K k;
            // 3. 节点key存在，直接覆盖value
            if (p.hash == hash &&
                ((k = p.key) == key || (key != null && key.equals(k))))
                e = p;
            // 4. 判断是否为红黑树节点    
            else if (p instanceof TreeNode)
                e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
            // 5. 如果是链表
            else {
                for (int binCount = 0; ; ++binCount) {
                    if ((e = p.next) == null) {
                        p.next = newNode(hash, key, value, null);
                        //链表长度大于8转换为红黑树进行处理
                        if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                            treeifyBin(tab, hash);
                        break;
                    }
                    // key已存在就覆盖value
                    if (e.hash == hash &&
                        ((k = e.key) == key || (key != null && key.equals(k))))
                        break;
                    p = e;
                }
            }
            if (e != null) { // existing mapping for key
                V oldValue = e.value;
                if (!onlyIfAbsent || oldValue == null)
                    e.value = value;
                afterNodeAccess(e);
                return oldValue;
            }
        }
        ++modCount;
        //6. 超过最大容量就扩容
        if (++size > threshold)
            resize();
        afterNodeInsertion(evict);
        return null;
    }
```
1. 判断键值对数组tab[i]是否为空或为null，否则执行resize()进行扩容(也就说HashMap初始化时，若没指定初始化容量大小，它是在put时候resize指定的)
2. 根据键值key计算hash值得到插入的数组索引i，如果table[i]==null，直接新建节点添加，转向6，如果不为空，转向3
3. 判断tab[i]的首个元素是否和key一样，如果相等直接覆盖value，否则转向4，这里相等指的是hashCode以及equals都要相等
4. 判断tab[i]是否为treeNode，即table[i]是否是红黑树，如果是红黑树，则直接在树中插入键值对，否则下一步
5. 遍历tab[i]，判断链表长度是否大于8，大于8的话把链表转换为红黑树，在红黑树中执行插入操作，否则进行链表的插入操作；遍历中若发现key已存在就覆盖value
6. 插入成功后，判断实际存在的键值对数量size是否超过了最大容量threshold，如果超过，进行扩容

有个泳道图可以借鉴一下

![put泳道图](img/hashmap/22474D7C-4E7E-40AD-8E25-305DD3817B6A.png)

### 尾插法

* 概念
  java8之后版本，往HashMap里put元素时，数组上还是未转化为红黑树的链表，此时新增在链表上元素的位置在链表尾部，故名尾插法
  看前述put方法代码，需要注意的是注释2这里`tab[i] = newNode(hash, key, value, null);`这行使用的newNode方法代码如下
``` java
    Node<K,V> newNode(int hash, K key, V value, Node<K,V> next) {
        return new Node<>(hash, key, value, next);
    }

    Node(int hash, K key, V value, Node<K,V> next) {
        this.hash = hash;
        this.key = key;
        this.value = value;
        this.next = next;
    }
```
新构造的Node节点指向链表查找到的最后一个元素的后继节点。最终的效果就是将新元素追加到链表的尾部。传入的next参数为null，也就是尾插法。这样就避免出现java8之前，那个链表元素循环引用的问题

### 转成红黑树的树化阈值`TREEIFY_THRESHOLD`默认值为啥是8?

具体可见HashMap源码注释

``` java
     * Because TreeNodes are about twice the size of regular nodes, we
     * use them only when bins contain enough nodes to warrant use
     * (see TREEIFY_THRESHOLD). And when they become too small (due to
     * removal or resizing) they are converted back to plain bins.  In
     * usages with well-distributed user hashCodes, tree bins are
     * rarely used.  Ideally, under random hashCodes, the frequency of
     * nodes in bins follows a Poisson distribution
     * (http://en.wikipedia.org/wiki/Poisson_distribution) with a
     * parameter of about 0.5 on average for the default resizing
     * threshold of 0.75, although with a large variance because of
     * resizing granularity. Ignoring variance, the expected
     * occurrences of list size k are (exp(-0.5) * pow(0.5, k) /
     * factorial(k)). The first values are:
     *
     * 0:    0.60653066
     * 1:    0.30326533
     * 2:    0.07581633
     * 3:    0.01263606
     * 4:    0.00157952
     * 5:    0.00015795
     * 6:    0.00001316
     * 7:    0.00000094
     * 8:    0.00000006
     * more: less than 1 in ten million
```
我粗略翻译一下:

因为树状节点的大小大约是常规节点的两倍，所以我们在容器中包含足够多的节点时才可使用它们(参见TREEIFY_THRESHOLD)。当它们变得太小(由于去除或调整大小)，它们被转换回普通的链表元素。在用户hashcode分布良好情况下，很少会树化。理想情况下,随机取hashcode、扩充因子默认大小调整为0.75且平均出现频率参数约为0.5的情况下，元素个数出现的频率遵循泊松分布。即使考虑到由于扩容而引发的极大变数，我们还是可以把链表长度假设为k，期望出现频率的计算公式写为
``` java
(exp(-0.5) * pow(0.5, k) /factorial(k))
```
将k从0到8依次代入公式计算出频率值
* 0:    0.60653066
* 1:    0.30326533
* 2:    0.07581633
* 3:    0.01263606
* 4:    0.00157952
* 5:    0.00015795
* 6:    0.00001316
* 7:    0.00000094
* 8:    0.00000006

由此答案是:
**当链表结点个数为8时，出现频率是0.00000006，也就是亿分之6，因此个数小于8的情况下，链表的查询性能和红黑树差不多，而且树化还需时间和空间，所以没有转化成红黑树的必要**

### 数组长度大于64才树化的原因?

见前文put方法代码注释5
``` java
//链表长度大于8转换为红黑树进行处理
if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
   treeifyBin(tab, hash);
```
查看`treeifyBin`方法源码

``` java
    static final int MIN_TREEIFY_CAPACITY = 64;
    final void treeifyBin(Node<K,V>[] tab, int hash) {
        int n, index; Node<K,V> e;
        //如果tab的长度小于64，那么即使冲突节点数达到TREEIFY_THRESHOLD，也不会把链表转化成红黑树，而是将tab扩容
        if (tab == null || (n = tab.length) < MIN_TREEIFY_CAPACITY)
            resize();
        else if ((e = tab[index = (n - 1) & hash]) != null) {
            TreeNode<K,V> hd = null, tl = null;
            do {
                TreeNode<K,V> p = replacementTreeNode(e, null);
                if (tl == null)
                    hd = p;
                else {
                    p.prev = tl;
                    tl.next = p;
                }
                tl = p;
            } while ((e = e.next) != null);
            if ((tab[index] = hd) != null)
                hd.treeify(tab);
        }
    }
```

因此在数组长度小于64时，只会扩容。即使数组中有多个元素（每个元素都是一个链表）的长度都超过8，也不会树化成红黑树

由此答案是:
**数组长度不大时，可以用扩容的方式使数组元素，即链表的长度变短，提高读写效率，相对于转换为红黑树做法，可保证数据结构更简单**

## get方法

源码

``` java
     public V get(Object key) {
        Node<K,V> e;
        return (e = getNode(hash(key), key)) == null ? null : e.value;
    }
    
    static final int hash(Object key) {
        int h;
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }
    
    final Node<K,V> getNode(int hash, Object key) {
        Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
        //1. 得到tab数组的index,查看tab[index]是否有值
        if ((tab = table) != null && (n = tab.length) > 0 &&
            (first = tab[(n - 1) & hash]) != null) {
            //2. 判断tab[index]的首个元素是否和key一样，如果相等直接拿出来值返回，否则下一步
            if (first.hash == hash && // always check first node
                ((k = first.key) == key || (key != null && key.equals(k))))
                return first;
            //3. 是否有下一个链表元素
            if ((e = first.next) != null) {
                //4. 如果是TreeNode,说明采用的是数组+红黑树结构。遍历红黑树，得到节点值
                if (first instanceof TreeNode)
                    return ((TreeNode<K,V>)first).getTreeNode(hash, key);
                //5. 如果是链表，循环遍历和2一样判断的方法，返回值    
                do {
                    if (e.hash == hash &&
                        ((k = e.key) == key || (key != null && key.equals(k))))
                        return e;
                } while ((e = e.next) != null);
            }
        }
        return null;
    }
```
1. 通过hash & (length-1)得到tab数组的index,查看tab[index]是否有值，如有继续下一步，没有就返回null
2. 判断tab[index]的首个元素是否和key一样，如果相等直接拿出来值返回，否则下一步，这里相等同样指的是hashCode以及equals都要相等
3. 是否有下一个链表元素
4. 如果是TreeNode,说明采用的是数组+红黑树结构。遍历红黑树，得到节点值
5. 如果是链表，循环遍历和2一样判断方法，返回值（也就是说元素个数没有超过8个，do-while循环最多循环7次）

## 红黑树退化成链表

红黑树中的元素减少到一定数量时，会退化成链表。见源码默认是6

``` java
static final int UNTREEIFY_THRESHOLD = 6;
```

而元素减少有两种情况
* 调用remove方法删除元素
  HashMap的remove方法中，删除红黑树节点逻辑的removeTreeNode方法中有关解除红黑树结构的分支代码
``` java
    if (root == null || root.right == null ||
       (rl = root.left) == null || rl.left == null) {
       tab[index] = first.untreeify(map);  // too small
       return;
    }
```
从代码可知不是节点数小于`UNTREEIFY_THRESHOLD`时才退化成链表，而是通过红黑树根节点及其子节点是否为空来判断。而满足该条件的最大红黑树结构如下:
![最大红黑树结构](img/hashmap/5870F1CD-5BFA-46E3-90AB-C6293D5AE162.png)
节点数为10，大于6，但是根据代码逻辑，是需要退化成链表的

* resize时对红黑树进行拆分
  resize时，判断节点类型，如果是链表，则将链表拆分，如果是TreeNode，则执行TreeNode的split方法拆分红黑树，split方法源码如下
``` java
//根据运算结果将树划分为两棵红黑树，lc表示其中一棵树的节点数
  if (lc <= UNTREEIFY_THRESHOLD)
      tab[index] = loHead.untreeify(map);
  else {
      tab[index] = loHead;
      if (hiHead != null) // (else is already treeified)
         loHead.treeify(tab);
  }
```
这时才用到`UNTREEIFY_THRESHOLD`判断，当小于等于6时，才调用`untreeify`方法退化成链表
hashMap的红黑树不一定小于6时才退化成链表，而是只有在resize时才根据`UNTREEIFY_THRESHOLD`进行转换

# 和常用数据结构的区别

## HashMap和HashTable
* 线程安全
  HashMap非线程安全，HashTable线程安全
* 效率
  因为HashMap非线程安全，所以它的效率比HashTable高
* 对key为null和value为null支持
  HashMap的key可以为null，但不能重复。value可以重复，也可以为null。HashTable不行，key只要有null就会抛NullPointerException异常
* 初始容量和扩充容量大小
  HashTable默认容量是11，每次扩充，容量变为原来的2n+1。HashMap默认容量是16，扩充因子是0.75，也就是说put元素个数超过`16*0.75=12`后，会自动扩充一倍，容量到32。如果初始化时候指定容量初始值，HashTable会直接使用指定的初始值。而HashMap会扩充为2的幂（见[tableSizeFor](1029785637.html#补充说明)方法，代码附在最后）
* 数据结构
  java8开始，HashMap解决hash碰撞时，会将链表长度大于阈值8的转化为红黑树，将搜索时间复杂度从`O（N）`降为`O（logn）`。以此减少搜索时间

## HashMap和HashSet

从HashSet源码可知底层基于HashMap实现

* 实现接口
  HashMap实现了Map接口，HashSet实现了Set接口
* HashMap存储`key->value`，HashSet存储对象
* HashMap调用put方法加元素，HashSet调用add方法加元素
* HashMap使用key通过散列函数计算hashcode,HashSet使用成员对象计算hashcode，两个对象hashcode相同，不能保证对象值相等，还要用equals方法判断

# 补充说明

初始化指定容量初始值时，HashMap会扩充为2的幂的方法代码如下

``` java
    static final int MAXIMUM_CAPACITY = 1 << 30;
    
    static final int tableSizeFor(int cap) {
        int n = -1 >>> Integer.numberOfLeadingZeros(cap - 1);
        return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
    }
    
    public static int numberOfLeadingZeros(int i) {
        // HD, Count leading 0's
        if (i <= 0)
            return i == 0 ? 32 : 0;
        int n = 31;
        if (i >= 1 << 16) { n -= 16; i >>>= 16; }
        if (i >= 1 <<  8) { n -=  8; i >>>=  8; }
        if (i >= 1 <<  4) { n -=  4; i >>>=  4; }
        if (i >= 1 <<  2) { n -=  2; i >>>=  2; }
        return n - (i >>> 1);
    }
```

# 参考资料

1. [疫苗：JAVA HASHMAP的死循环](https://coolshell.cn/articles/9606.html)

2. [Java类集框架之HashMap(JDK1.8)源码剖析](http://www.2cto.com/kf/201505/401433.html)
