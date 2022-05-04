---
title: '404 - 好巧，竟然在这里遇到你！'
date: 2022-05-05 06:28:10
comments: false
permalink: /404.html
---

## 这是一個不存在的页面

对不起，您所访问的页面不存在或者已删除。

预计将在约 <span id="timeout">5</span> 秒后返回首页。

当然，你可以 **[点这里](咖啡猫)** 直接返回首页。

<script>
let countTime = 5;

function count() {
  document.getElementById('timeout').textContent = countTime;
  countTime -= 1;
  if(countTime === 0){
    location.href = '咖啡猫';
  }
  setTimeout(() => {
    count();
  }, 1000);
}

count();
</script>
