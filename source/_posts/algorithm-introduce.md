---
title: 算法汇总介绍
excerpt: 所有算法的介绍，包括二分查找、广度优先遍历、深度优先遍历、递归、回溯、分治、动态规划、贪心
categories:
  - 算法
tags:
  - 算法
  - 二分查找
  - 广度优先遍历
  - 深度优先遍历
  - 递归
  - 回溯
  - 分治
  - 动态规划
  - 贪心
comments: true
layout: post
index_img: /img/milan/12.png
abbrlink: 3278271016
date: 2022-05-30 19:47:59
sticky: 800
---

# 二分查找

## 概念

二分查找又叫作折半查找，要求待查找的序列**有序**，每次查找都取中间位置的值与待查值进行比较，如果中间位置的值比待查值大，则在序列的左半部分继续执行该查找过程，如果中间位置的值比待查值小，则在序列的右半部分继续执行该查找过程，直到查找到值为止，否则在序列中没有待查值

## 原理

在有序数组[3,4,6,20,40,45,51,62,70,99,110]中查找key=20的数据，根据二分查找，只需查找2次便能命中数据。这里需要强调的一点是，二分查找要求要查找的集合是有序的，如果不是有序集合，则先要通过排序算法排序后再进行查找

![原理](img/algorithm/93A1C418879DCFE94E8F35DA64109F5B.jpg)

## 代码模板

``` java
public class BinarySearch {
  public static int binarySearch(int[] array, int a) {
    int low = 0;
    int high = array.length - 1;
    int mid;
    while (low < high) {
      // 中间位置
      mid = (low + high) / 2;
      if (array[mid] == a) {
        return mid;
      } else if (a > array[mid]) {
        // 向右查找
        low = mid + 1;
      } else {
        // 向左查找
        high = mid - 1;
      }
    }
    return -1;
  }
}
```

# 广度优先遍历

## 概念

广度优先遍历(Breadth First Search,BFS),又叫宽度优先遍历或横向优先遍历，是从根结点开始沿着树的宽度搜索遍历

![广度优先遍历](img/algorithm/287CE5E81F72BCF8FB8872F928E83449.jpg)

如图，广度优先遍历顺序为：ABCDEFG

## 代码模板

``` java
public class BFS {
  /**
   * 计算从起点 start 到终点 target 的最近距离
   *
   * @param start 起始节点
   * @param target 终止节点
   * @return 步数
   */
  public int bfs(TreeNode start, TreeNode target) {
    // 核心数据结构
    Queue<TreeNode> q = new LinkedList<>();
    // 避免走回头路
    Set<TreeNode> visited = new HashSet<>();
    // 相邻节点
    Queue<TreeNode> adj = new LinkedList<>();
    // 将起点加入队列
    q.offer(start);
    visited.add(start);
    // 记录扩散的步数
    int step = 0;

    while (!q.isEmpty()) {
      /* 将当前队列中的所有节点向四周扩散 */
      for (int i = 0; i < q.size(); i++) {
        TreeNode cur = q.poll();
        /* 划重点: 这里判断是否到达终点 */
        if (cur == target) {
          return step;
        }

        /* 将cur的相邻节点加入队列 */
        if (cur.left != null) {
          adj.offer(cur.left);
        }
        if (cur.right != null) {
          adj.offer(cur.right);
        }
        for (TreeNode x : adj) {
          if (!visited.contains(x)) {
            q.offer(x);
            visited.add(x);
          }
        }
      }
      /* 划重点: 更新步数在这里 */
      step++;
    }

    return step;
  }
}

class TreeNode {
  public int val;
  public TreeNode left;
  public TreeNode right;

  public TreeNode(int val) {
    this.val = val;
  }
}
```

# 深度优先遍历

## 概念

深度优先搜索(Depth First Search,DFS)是沿着树的深度遍历树的节点，尽可能深的搜索树的分支

如广度优先遍历所用图，深度优先遍历顺序为：ABDECFG

## 代码模板

``` java
public class DFS {
      // 递归模板
      boolean DFS(Node cur, Node target, Set<Node> visited) {
          return true if cur is target;
          for (next : each neighbor of cur) {
              if (next is not in visited) {
                  add next to visted;
                  return true if DFS(next, target, visited) == true;
              }
          }
          return false;
      }
}
```

# 递归

递归就是自己调用自己，把一个问题分解成可以同样操作的子问题

## 形成条件
* 子问题须与原始问题解决算法是同样一个算法
* 不能无限制地调用自己，必须有个出口，化为非递归状况


## 使用场景
1. 数据定义是按递归定义的（Fibonacci方法）
2. 问题解法按递归算法实现
   这类问题虽然本身没有明显的递归结构，但用递归比迭代求解更简单（汉诺塔问题）
3. 数据结构形式是按递归定义的（树）

二叉树从任意一个节点拆开，依然是一颗二叉树。换句话说，二叉树天生就可以把问题分解成子问题，而这类问题一般都是采用递归解决的

## 代码模板

``` java
  public void recur(int level, int param) {
     terminator
     if (level > MAX_LEVEL) {
        // process result
        return;
     }
            
     // process current logic
     process(level, param);
     
     // drill down
     recur(level + 1, newParam);
     restore current status
  }
```

# 回溯

## 概念

又称试探法。从问题的某一状态出发，不断“试探”着往前走一步，当一条路走到“尽头”，不能再前进（拓展出新状态）时，再倒回一步或者若干步，从另一种可能的状态出发，继续搜索，直到所有的“路径”都试探过了。这种不断前进、不断回溯，寻找解的方法，称为回溯法

## 形成条件

回溯实际上就是一个决策树的遍历过程

* 路径
  也就是已经做出的选择
* 选择列表
  也就是当前可以做的选择
* 结束条件
  到达决策树底层，无法再做选择的条件

## 使用场景

搜索算法、数独、八皇后问题、全排列、正则表达式匹配和编译原理中语法分析等

## 代码模板
``` java
   List<String> result =new ArrayList<>();

   public void backTrack(path,choiceList){
       //满足结束条件
       if (condition){
           result.add(path);
           return; 
       }

       for( Choice choice:choiceList){
           //做选择
           backtrack(path, choiceList);
           //撤销选择
       } 
   }
```

# 分治

## 概念

将一个规模为N的问题分解为K个规模较小的子问题，这些子问题相互独立且与原问题性质相同。求出子问题的解，就可得到原问题的解。即一种分目标完成的算法

## 形成条件

1. 问题规模缩小到一定程度就可轻易解决
2. 问题可分解为若干个规模较小的相同问题，即该问题具有最优子结构性质
3. 利用该问题分解出的子问题解可合并成该问题的解
4. 问题分解出的各个子问题是相互独立的，即子问题之间不包含公共的子子问题

第1个是绝大多数问题都可满足的，因为问题的计算复杂性一般是随着问题规模的增加而增加
第2个是应用分治法的前提，它也是大多数问题都可满足，此特征反映了递归思想
第3个是关键，能否利用分治法完全取决于问题是否具有这个特征，如果具备前两个，而不具备第3个，则可考虑用贪心法或动态规划
第4个涉及到分治法效率，如果各子问题是不独立的，则分治法要做许多不必要的工作，重复地解公共的子问题，此时虽然可用分治法，但一般用动态规划法比较好

## 使用场景

降低问题求解的时间复杂度，解决海量数据处理问题等

## 代码模板

``` java
   public void recur(Problem problem) {
     //terminator
     if (problem == null) {
     //print result
        return;
     }

     //prepare data
     data = prepareData(problem);
     Array[] subProblems = splitProblem(problem, data);
     //conquer subProblems
     subResult1 = self.divideConquer(subProblems[0], p1, ...)
     subResult2 = self.divideConquer(subProblems[1], p1, ...)
     subResult3 = self.divideConquer(subProblems[2], p1, ...)

     //process and generate the final result
     result = processResult(subResult1, subResult2, subResult3, …);

     //revert the current level states
     }
```


# 动态规划

## 概念

每次决策依赖于当前状态，又随即引起状态的转移。一个决策序列就是在变化的状态中产生出来的，所以，这种多阶段最优化决策解决问题的过程就称为动态规划

## 基本思想与策略

基本思想与分治法类似，也是将待求解的问题分解为若干个子问题（阶段），按顺序求解子阶段，前一子问题的解，为后一子问题的求解提供了有用的信息。在求解任一子问题时，列出各种可能的局部解，通过决策保留那些有可能达到最优的局部解，丢弃其他局部解。依次解决各子问题，最后一个子问题就是初始问题的解

由于动态规划解决的问题多数有重叠子问题这个特点，为减少重复计算，对每一个子问题只解一次，将其不同阶段的不同状态保存在一个二维数组中

与分治法最大的差别是

>适用于动态规划求解的问题，经分解后得到的子问题往往不是互相独立的（即下一个子阶段的求解是建立在上一个子阶段的解的基础上，要进行进一步的求解）

## 适用情况

用动态规划求解的问题一般要具有下列3个性质

1. 最优化原理
   如果问题的最优解所包含的子问题的解也是最优的，就称该问题具有最优子结构，即满足最优化原理
2. 无后效性
   即某阶段状态一旦确定，就不受这个状态以后决策的影响。也就是说，某状态以后的过程不会影响以前的状态，只与当前状态有关
3. 有重叠子问题
   即子问题之间是不独立的，一个子问题在下一阶段决策中可能被多次使用到(该性质并不是动态规划适用的必要条件，但是如果没有这条性质，动态规划算法同其他算法相比就不具备优势)


## 基本步骤

动态规划要解决的问题是一个多阶段决策问题，一般由初始状态开始，通过对中间阶段决策的选择，达到结束状态。这些决策形成了一个决策序列，同时确定了完成整个过程的一条活动路线(通常是求最优的活动路线)

动态规划的设计都有着一定的模式，一般要经历以下几个步骤

1. 划分阶段
   按照问题的时间或空间特征，把问题分为若干个阶段。在划分阶段，注意划分后的阶段一定要有序的或者是可排序的，否则问题就无法求解
2. 确定状态和状态变量
   将问题发展到各个阶段时，所处于的各种客观情况用不同的状态表示。当然，状态的选择要满足无后效性
3. 确定决策并写出状态转移方程
   因为决策和状态转移有着天然的联系，状态转移是根据上一阶段的状态和决策来导出本阶段的状态。所以如果确定了决策，状态转移方程也就能被写出来。但事实上，常常是反过来，根据相邻两个阶段的状态之间的关系来确定决策方法和状态转移方程
4. 寻找边界条件
   给出的状态转移方程是一个递推式，需要一个递推的终止条件或边界条件


只要解决问题的**阶段**、**状态**和**状态转移**决策确定了，就可写出状态转移方程（包括边界条件）

实际应用，可按以下几个简化的步骤进行设计

* 分析最优解的性质，并刻画其结构特征
* 递归的定义最优解
* 以自底向上或自顶向下的记忆化方式（备忘录法）计算出最优值
* 根据计算最优值时得到的信息，构造问题的最优解

## 关键点

![关键点](img/algorithm/F0748769A760F4E7C5D552639C15C34B.jpg)

## 模板实现

使用动态规划求解问题，最重要的就是确定动态规划三要素

1. 问题的阶段
2. 每阶段的状态
3. 从前一个阶段转化到后一个阶段之间的递推关系

递推关系必须是从次小的问题开始到较大的问题之间的转化，从这个角度来说，动态规划往往可以用递归程序来实现，不过因为递推可以充分利用前面保存的子问题解来减少重复计算，所以对于大规模问题来说，有递归不可比拟的优势，这也是动态规划算法的核心之处

确定了动态规划的这三要素，整个求解过程就可用一个最优决策表来描述，最优决策表是一个二维表，其中行表示决策的阶段，列表示问题状态，表格需要填写的数据一般对应此问题在某个阶段某个状态下的最优值（如最短路径，最长公共子序列，最大价值等），填表的过程就是根据递推关系，从1行1列开始，以行或者列优先的顺序，依次填写表格，最后根据整个表格的数据通过简单的取舍或者运算求得问题的最优解

# 贪心

## 概念

是一种在每步选择中都采取当前状态下最好或最优(最有利)选择，从而希望结果是全局最好或最优的算法

### 和动态规划的不同

不同点在于贪心对每个子问题的解决方法都作出选择，不能回退。动态规划则会保存以前的运算结果，并根据之前结果对当前进行选择，有回退功能

## 形成条件

问题能够分解成子问题来解决，子问题的最优解能递推到最终问题的最优解。这种子问题最优解被称为最优子结构

## 使用场景

解决最优化问题，比如: 哈夫曼编码

一旦一个问题可以通过贪心算法来解决，那么它可能是解决这个问题的最佳方案。因为其高效性和求得答案比较接近最优结果，贪心算法可以当做辅助算法或直接解决一些要求结果不特别精确的问题
