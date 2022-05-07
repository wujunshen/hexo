(function () {
    var posts = document.getElementsByClassName('post-content');
    if (posts.length === 0) {
        return;
    }
    posts[0].insertAdjacentHTML('beforeend',
                                '<div style="text-align: center; margin: auto;">\n    <hr>\n    <div style="width: auto; height: auto; max-width: 300px; max-height: 300px; text-align: center; margin: auto; ">\n        <img src="/img/reward/weichatpay.jpg" style="width: auto; height: auto; max-width: 100%;" alt="微信支付">\n    </div>\n</div>');
})();
