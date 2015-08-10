// JavaScript Document

//Google Analytics
$(document).ready(function () {
    (function (i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push(arguments)
        }, i[r].l = 1 * new Date();
        a = s.createElement(o),
            m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m)
    })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

    ga('create', 'UA-56969581-1', 'auto');
    ga('require', 'displayfeatures');
    ga('send', 'pageview');


    //dropdown
    $(".dropdown-button").dropdown({
        hover: true,
        belowOrigin: true
    });

    //mobileSidebar
    $('.button-collapse').sideNav({
        'edge': 'left',
        menuWidth: '275'

    });
    //collapsibleSidebar
    $('.collapsible').collapsible();
});

//sticky nav bar
window.onscroll = changePos;

function changePos() {
    //document.getElementById("foo").innerHTML = document.getElementById("foo").innerHTML + 1;
    var header = document.getElementById("navbar");
    if (window.pageYOffset > 103 && window.innerWidth > 992) {
        header.style.top = (window.pageYOffset - 103) + "px";
    } else if (window.innerWidth <= 992) {
        header.style.top = window.pageYOffset + "px";
    } else {
        header.style.top = "0px";
    }
}
